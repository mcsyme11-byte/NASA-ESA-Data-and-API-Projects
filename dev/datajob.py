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
# A source given as "skipped" keeps its previous state; one given as "cancelled" (its step stopped by the job's time
# limit, or never reached because the run stopped; since Nov 18, 2026) is recorded as failed. Exit 1 when a file was refused by the guard or
# the push did not succeed; otherwise 0, also when nothing changed.
# A source with every_days in dev/data_jobs.json (a monthly source, for example) also records last_run and last_ok;
#   python3 dev/datajob.py --due asteroid-data reach phys
# prints whether any of them is due (every_days since its last run, or retry_days after a failed run).
#
# Two checks at the start of a run (decided Nov 20, 2026), each writing its answer to GITHUB_OUTPUT:
#   python3 dev/datajob.py --gate JOB 'CRON'
# run=false when GitHub starts a scheduled run late and a run of the same job has already succeeded since that cron
# time (the outside clock's on-time run); every other run goes ahead (run=true), also when GitHub cannot be asked.
#   python3 dev/datajob.py --celestrak DIR
# ask=false when CelesTrak's active list was asked for less than two hours ago (CelesTrak's usage policy), by either
# CelesTrak job: DIR holds the shared copy kept between runs (Actions cache) with the time of the last request.
import argparse, csv, io, json, os, re, subprocess, sys, time, urllib.request
from datetime import datetime, timedelta, timezone

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


def job_config(job):
    try:
        with open(os.path.join(ROOT, 'dev/data_jobs.json'), encoding='utf-8') as f:
            return json.load(f)['jobs'].get(job, {})
    except (OSError, ValueError, KeyError):
        return {}


def periodic_sources(job):
    return {k: v for k, v in job_config(job).get('sources', {}).items() if v.get('every_days')}


def due(job, source):
    """Whether a periodic source should run now: its last run is every_days old or more, or it failed and its last
    try is retry_days old or more. Never run before: due."""
    cfg = periodic_sources(job).get(source)
    if not cfg:
        return True
    try:
        with open(os.path.join(ROOT, STATUS_DIR, job + '.json'), encoding='utf-8') as f:
            st = json.load(f)['sources'].get(source, {})
    except (OSError, ValueError, KeyError):
        st = {}
    last = st.get('last_run') or st.get('last_ok')
    if not last:
        return True
    age = (datetime.now(timezone.utc) - datetime.strptime(last, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)).days
    wait = cfg.get('retry_days', 3) if st.get('state') == 'failed' else cfg['every_days']
    return age >= wait


def _cron_field(text, lo, hi):
    out = set()
    for part in text.split(','):
        step = 1
        if '/' in part:
            part, step = part.split('/'); step = int(step)
        if part == '*':
            a, b = lo, hi
        elif '-' in part:
            a, b = (int(x) for x in part.split('-'))
        else:
            a = b = int(part)
        out.update(range(a, b + 1, step))
    return out


def last_cron_time(cron, now):
    """The latest time at or before now (UTC, to the minute) that a five-field cron expression names."""
    mi, ho, dm, mo, dw = cron.split()
    M, H, D, MO = _cron_field(mi, 0, 59), _cron_field(ho, 0, 23), _cron_field(dm, 1, 31), _cron_field(mo, 1, 12)
    W = {d % 7 for d in _cron_field(dw, 0, 7)}
    day_any, wday_any = dm == '*', dw == '*'
    t = now.replace(second=0, microsecond=0)
    day = t.replace(hour=0, minute=0)
    for _ in range(400):
        cw = (day.weekday() + 1) % 7          # cron: Sunday 0
        if day_any or wday_any:
            day_ok = (day.day in D) and (cw in W)
        else:
            day_ok = (day.day in D) or (cw in W)
        if day.month in MO and day_ok:
            for h in sorted(H, reverse=True):
                for m in sorted(M, reverse=True):
                    c = day.replace(hour=h, minute=m)
                    if c <= t:
                        return c
        day -= timedelta(days=1)
    return None


def gate(job, cron):
    """run=false for a late scheduled start when the slot has already had a successful run."""
    def answer(run, why):
        print(why)
        out = os.environ.get('GITHUB_OUTPUT')
        if out:
            with open(out, 'a') as f:
                f.write('run=%s\n' % ('true' if run else 'false'))
    if os.environ.get('GITHUB_EVENT_NAME') != 'schedule' or not cron:
        return answer(True, 'Started by %s: the run goes ahead.' % (os.environ.get('GITHUB_EVENT_NAME') or 'hand'))
    now = datetime.now(timezone.utc)
    slot = last_cron_time(cron, now)
    if not slot:
        return answer(True, 'No cron time found for %r: the run goes ahead.' % cron)
    since = (slot - timedelta(minutes=2)).strftime('%Y-%m-%dT%H:%M:%SZ')
    url = 'https://api.github.com/repos/%s/actions/workflows/%s.yml/runs?status=success&per_page=20&created=%%3E%%3D%s' % (
        os.environ.get('GITHUB_REPOSITORY', ''), job, since)
    try:
        req = urllib.request.Request(url, headers={'Accept': 'application/vnd.github+json',
                                                   'Authorization': 'Bearer ' + os.environ.get('GITHUB_TOKEN', '')})
        with urllib.request.urlopen(req, timeout=30) as r:
            runs = json.load(r).get('workflow_runs', [])
    except Exception as e:
        return answer(True, 'GitHub could not be asked (%s): the run goes ahead.' % str(e)[:80])
    this = os.environ.get('GITHUB_RUN_ID', '')
    done = [x for x in runs if str(x.get('id')) != this and x.get('conclusion') == 'success']
    late = int((now - slot).total_seconds() // 60)
    if done:
        return answer(False, 'The %s UTC slot already ran successfully at %s (%s); GitHub started this run %d min late, '
                      'so it is skipped.' % (slot.strftime('%H:%M'), done[-1].get('run_started_at', '?')[11:16],
                                            done[-1].get('event'), late))
    return answer(True, 'No successful run since the %s UTC slot: this run (%d min late) goes ahead.'
                  % (slot.strftime('%H:%M'), late))


def celestrak(folder):
    """ask=false while CelesTrak's active list was asked for less than two hours ago."""
    stamp = os.path.join(folder, 'asked_at')
    ask, why = True, 'No earlier CelesTrak request on record: CelesTrak is asked.'
    try:
        last = datetime.fromisoformat(open(stamp).read().strip().replace('Z', '+00:00'))
        gap = datetime.now(timezone.utc) - last
        if gap < timedelta(minutes=125):
            ask = False
            why = ('CelesTrak was last asked at %s UTC, %d min ago (its limit: once in two hours): not asked this run; '
                   'the kept copy is used.' % (last.strftime('%H:%M'), gap.total_seconds() // 60))
        else:
            why = 'CelesTrak was last asked at %s UTC: CelesTrak is asked.' % last.strftime('%Y-%m-%d %H:%M')
    except (OSError, ValueError):
        pass
    if ask:
        os.makedirs(folder, exist_ok=True)
        with open(stamp, 'w') as f:
            f.write(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))
    print(why)
    out = os.environ.get('GITHUB_OUTPUT')
    if out:
        with open(out, 'a') as f:
            f.write('ask=%s\n' % ('true' if ask else 'false'))


def main():
    # "--due JOB SOURCE [SOURCE…]": print true when any of the sources is due, else false (and set the step output
    # "due"); used before a periodic step
    if len(sys.argv) >= 3 and sys.argv[1] == '--gate':
        return gate(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else '')
    if len(sys.argv) == 3 and sys.argv[1] == '--celestrak':
        return celestrak(sys.argv[2])
    if len(sys.argv) >= 4 and sys.argv[1] == '--due':
        answer = 'true' if any(due(sys.argv[2], src) for src in sys.argv[3:]) else 'false'
        print('Due: ' + answer)
        if os.environ.get('GITHUB_OUTPUT'):
            with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8') as f:
                f.write('due=%s\n' % answer)
        return 0
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
    periodic = periodic_sources(a.job)
    for name, outcome in outcomes.items():
        if outcome not in ('success', 'failure', 'cancelled'):
            continue                      # skipped: the state stays as it was
        state = 'ok' if outcome == 'success' else 'failed'
        was = sources.get(name, {})
        note = '; '.join(refused) if (name == 'checks' and refused) else ''
        if outcome == 'cancelled':
            note = 'stopped before it finished (the time limit, or the run was cancelled)'
        if name in periodic:
            # a source updated on a longer cycle (every_days in dev/data_jobs.json) also records when it last ran
            # and last succeeded: dev/data_health.py checks its age, and due() decides when it runs next
            entry = {k: v for k, v in was.items() if k in ('last_ok',)}
            entry.update({'state': state, 'since': stamp if was.get('state') != state else was.get('since', stamp),
                          'note': note, 'last_run': stamp})
            if state == 'ok':
                entry['last_ok'] = stamp
            elif run:
                entry['run'] = run
            sources[name] = entry
            continue
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
