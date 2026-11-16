#!/usr/bin/env python3
# NASA and ESA Data Projects · the last step of every data job · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Every scheduled data workflow ends with this one step (rules in docs/DATA-UPDATES.md):
#   1. stages the job's data folders (only when the job's required steps succeeded);
#   2. checks every changed data file before it is saved (the data guard): JSON must read, CSV must have a header and
#      rows, nothing may be emptied, and a file over 2 KB may not shrink to under a fifth of its size; a failing file
#      is put back to its previous version, so the site keeps the last good copy;
#   3. writes the job's status file, shared/data/status/<job>.json: each source's state (ok or failed) and since when,
#      the time of the last data change, and notes picked out of the run's log (for example a craft not found);
#   4. commits the data and the status file in one commit with the job's standard message, and pushes it, taking in
#      other work pushed meanwhile (never a force push: main is protected).
# The status file changes only when a source changes state, the notes change or data is saved, so a run that finds
# nothing new commits nothing. dev/data_health.py reads these files every day.
#
#   python3 dev/datajob.py --job asteroid-data --message "Asteroid data: …" \
#       --paths asteroid-tracker/data --source close-approaches=success --source risk=failure \
#       [--log run.log --watch "not found"] [--allow-shrink "neows/"]
# A source given as "skipped" or "cancelled" keeps its previous state. Exit 1 when a file was refused by the guard or
# the push did not succeed; otherwise 0, also when nothing changed.
import argparse, csv, io, json, os, re, subprocess, sys, time
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATUS_DIR = 'shared/data/status'
MIN_SHRINK_BYTES = 2048
SHRINK_FLOOR = 0.2
MAX_NOTES = 30


def git(*args, check=True, capture=True):
    r = subprocess.run(['git', *args], cwd=ROOT, text=True, capture_output=capture)
    if check and r.returncode:
        raise RuntimeError('git %s: %s' % (' '.join(args), (r.stderr or '').strip()))
    return (r.stdout or '').strip()


def now():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def previous(path):
    """The file as it is in the last commit, or None for a new file."""
    r = subprocess.run(['git', 'show', 'HEAD:' + path], cwd=ROOT, capture_output=True)
    return r.stdout if r.returncode == 0 else None


def problem_with(path, data, old, allow_shrink):
    """Why a changed data file must not be saved, or None when it is fine."""
    if not data.strip():
        return 'empty'
    low = path.lower()
    try:
        if low.endswith(('.json', '.webmanifest')):
            json.loads(data.decode('utf-8'))
        elif low.endswith('.csv'):
            rows = list(csv.reader(io.StringIO(data.decode('utf-8'))))
            if len(rows) < 2:
                return 'no rows under the header'
    except (ValueError, UnicodeDecodeError) as e:
        return 'does not read (%s)' % str(e)[:80]
    if old is not None and len(old) > MIN_SHRINK_BYTES and len(data) < SHRINK_FLOOR * len(old) \
            and not any(p in path for p in allow_shrink):
        return 'shrank from %d to %d bytes' % (len(old), len(data))
    return None


def guard(paths, allow_shrink):
    """Checks every staged change under the paths; puts refused files back. Returns the refusals."""
    refused = []
    changed = git('diff', '--cached', '--name-status', '--', *paths).splitlines()
    deleted = [l.split('\t', 1)[1] for l in changed if l.startswith('D')]
    for line in changed:
        status, path = line.split('\t', 1)[0], line.split('\t')[-1]
        if status.startswith('D'):
            continue
        with open(os.path.join(ROOT, path), 'rb') as f:
            data = f.read()
        why = problem_with(path, data, previous(path), allow_shrink)
        if why:
            refused.append('%s: %s' % (path, why))
            if previous(path) is None:
                git('rm', '--cached', '-q', '--', path)
                os.remove(os.path.join(ROOT, path))
            else:
                git('checkout', 'HEAD', '--', path)
    # many files removed at once means a fetch went wrong, not old files pruned
    for p in paths:
        tracked = [f for f in git('ls-tree', '-r', '--name-only', 'HEAD', '--', p).splitlines() if f]
        gone = [d for d in deleted if d.startswith(p.rstrip('/') + '/') or d == p]
        if tracked and len(gone) > max(3, len(tracked) // 2):
            refused.append('%s: %d of %d files removed' % (p, len(gone), len(tracked)))
            git('checkout', 'HEAD', '--', *gone)
    return refused


def notes_from(logs, watch):
    if not watch:
        return []
    rx = re.compile(watch, re.I)
    out = []
    for name in logs:
        try:
            text = open(name, encoding='utf-8', errors='replace').read()
        except OSError:
            continue
        for line in text.splitlines():
            line = re.sub(r'\s+', ' ', line).strip()
            if rx.search(line) and line not in out:
                out.append(line[:200])
    return out[:MAX_NOTES]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--job', required=True)
    ap.add_argument('--message', required=True)
    ap.add_argument('--paths', nargs='*', default=[])
    ap.add_argument('--source', action='append', default=[], metavar='NAME=OUTCOME')
    ap.add_argument('--log', action='append', default=[])
    ap.add_argument('--watch', default='')
    ap.add_argument('--allow-shrink', action='append', default=[])
    ap.add_argument('--no-push', action='store_true', help='for a test run: commit nothing')
    a = ap.parse_args()
    paths = [p for p in a.paths if p.strip()]
    stamp = now()
    run = ''
    if os.environ.get('GITHUB_RUN_ID'):
        run = '%s/%s/actions/runs/%s' % (os.environ.get('GITHUB_SERVER_URL', 'https://github.com'),
                                          os.environ.get('GITHUB_REPOSITORY', ''), os.environ['GITHUB_RUN_ID'])

    refused = []
    if paths:
        git('add', '-A', '--', *paths)
        refused = guard(paths, a.allow_shrink)
        for r in refused:
            print('Refused by the data guard, previous copy kept: ' + r)
    data_changed = bool(paths) and bool(git('diff', '--cached', '--name-only', '--', *paths))

    # the status file
    sfile = '%s/%s.json' % (STATUS_DIR, a.job)
    try:
        old = json.load(open(os.path.join(ROOT, sfile), encoding='utf-8'))
    except (OSError, ValueError):
        old = {}
    sources = dict(old.get('sources', {}))
    outcomes = dict(s.split('=', 1) for s in a.source)
    complete = all(o in ('success', 'failure') for o in outcomes.values())
    if paths:                             # the guard ran: record its result
        outcomes['checks'] = 'failure' if refused else 'success'
    for name, outcome in outcomes.items():
        if outcome not in ('success', 'failure'):
            continue                      # skipped or cancelled: the state stays as it was
        state = 'ok' if outcome == 'success' else 'failed'
        was = sources.get(name, {})
        note = '; '.join(refused) if (name == 'checks' and refused) else ''
        if was.get('state') == state and was.get('note', '') == note:
            continue
        sources[name] = {'state': state, 'since': stamp if was.get('state') != state else was.get('since', stamp),
                         'note': note}
        if state == 'failed' and run:
            sources[name]['run'] = run
    status = {
        'job': a.job,
        'workflow': '.github/workflows/%s.yml' % a.job,
        'last_data_change': stamp if data_changed else old.get('last_data_change', ''),
        'sources': dict(sorted(sources.items())),
        # a run stopped part-way has an incomplete log: its notes are kept from the last complete run
        'notes': notes_from(a.log, a.watch) if a.watch and complete else old.get('notes', []),
    }
    os.makedirs(os.path.join(ROOT, STATUS_DIR), exist_ok=True)
    text = json.dumps(status, indent=1, ensure_ascii=False) + '\n'
    with open(os.path.join(ROOT, sfile), 'w', encoding='utf-8') as f:
        f.write(text)
    git('add', '--', sfile)
    print('Status: ' + ', '.join('%s %s' % (k, v['state']) for k, v in status['sources'].items()))
    for n in status['notes']:
        print('Note: ' + n)

    if not git('diff', '--cached', '--name-only'):
        print('No change in the data or the status.')
        return 1 if refused else 0
    if a.no_push:
        print('Test run: changes left staged, nothing committed.')
        return 1 if refused else 0
    git('config', 'user.name', 'github-actions[bot]')
    git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com')
    git('commit', '-q', '-m', a.message if data_changed else '%s: status' % a.message.split(':')[0])
    for attempt in range(1, 6):
        # other work may have been pushed while the data was fetched: put this commit on top of it
        pulled = subprocess.run(['git', 'pull', '--rebase', '--autostash', '--quiet'], cwd=ROOT).returncode == 0
        if pulled and subprocess.run(['git', 'push', '--quiet'], cwd=ROOT).returncode == 0:
            print('Pushed.')
            return 1 if refused else 0
        if not pulled:
            subprocess.run(['git', 'rebase', '--abort'], cwd=ROOT, capture_output=True)
        print('Push attempt %d did not succeed; retrying.' % attempt)
        time.sleep(attempt * 10)
    print('The push did not succeed after 5 attempts.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
