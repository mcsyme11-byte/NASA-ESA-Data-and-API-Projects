#!/usr/bin/env python3
# NASA and ESA Data Projects · the daily data health check · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Run every day by .github/workflows/data-health.yml (rules in docs/DATA-UPDATES.md). For every job in
# dev/data_jobs.json it checks:
#   - that the workflow is still switched on (GitHub switches off schedules in quiet repositories);
#   - that it has succeeded within its max_age_hours, and that its latest run did not fail;
#   - its status file (shared/data/status/<job>.json, written by dev/datajob.py): any source failed for longer than
#     the job's grace_hours, and any note from its log not listed as known;
# and also the spacecraft catalogue's broken links (spacecraft/data/links.json) and the review tasks that are due.
# The result is kept in one GitHub issue labelled "data-health": opened when something needs attention, edited and
# given a comment when the list changes (GitHub emails the comment to the repository's owner), and closed with a
# comment when everything is fine again. Nothing in the data is changed.
#
#   python3 dev/data_health.py             (needs the gh command and GH_TOKEN, as in the workflow)
#   python3 dev/data_health.py --dry-run   (prints the report; opens, edits or closes no issue)
import hashlib, json, os, re, subprocess, sys
from datetime import date, datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LABEL = 'data-health'
NOW = datetime.now(timezone.utc)


def gh(*args, check=True):
    r = subprocess.run(['gh', *args], cwd=ROOT, text=True, capture_output=True)
    if check and r.returncode:
        raise RuntimeError('gh %s: %s' % (' '.join(args[:3]), r.stderr.strip()[:300]))
    return r.stdout


def api(path):
    return json.loads(gh('api', path))


def when(text):
    return datetime.strptime(text, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc)


def hours_since(text):
    return (NOW - when(text)).total_seconds() / 3600


def age(h):
    return '%d hours' % round(h) if h < 48 else '%.1f days' % (h / 24)


def check(repo, cfg):
    problems, review = [], []
    known = [k['match'] for k in cfg.get('known_notes', [])]
    for job, j in cfg['jobs'].items():
        name, wf = j['name'], '%s.yml' % job
        try:
            info = api('repos/%s/actions/workflows/%s' % (repo, wf))
            if info.get('state') != 'active':
                problems.append('**%s**: the workflow is switched off (%s). Actions › %s › Enable workflow.'
                                % (name, info.get('state'), name))
            ok = api('repos/%s/actions/workflows/%s/runs?branch=main&status=success&per_page=1' % (repo, wf))
            last = api('repos/%s/actions/workflows/%s/runs?branch=main&per_page=1' % (repo, wf))
        except RuntimeError as e:
            problems.append('**%s**: its runs could not be read (%s).' % (name, e))
            continue
        runs = ok.get('workflow_runs', [])
        if not runs:
            problems.append('**%s**: no successful run yet.' % name)
        else:
            h = hours_since(runs[0]['created_at'])
            if h > j['max_age_hours']:
                problems.append('**%s**: no successful run for %s (it runs %s). [Last success](%s)'
                                % (name, age(h), j['runs'], runs[0]['html_url']))
        lr = (last.get('workflow_runs') or [None])[0]
        if lr and lr.get('conclusion') == 'failure':
            problems.append('**%s**: the latest run failed. [The run](%s)' % (name, lr['html_url']))
        try:
            st = json.load(open(os.path.join(ROOT, 'shared/data/status/%s.json' % job), encoding='utf-8'))
        except (OSError, ValueError):
            continue
        for src, s in st.get('sources', {}).items():
            if s.get('state') == 'failed':
                h = hours_since(s['since'])
                if h >= j.get('grace_hours', 0):
                    link = ' [The run](%s)' % s['run'] if s.get('run') else ''
                    extra = ' (%s)' % s['note'] if s.get('note') else ''
                    problems.append('**%s**, source "%s": failing for %s; the previous data is kept%s.%s'
                                    % (name, src, age(h), extra, link))
        for n in st.get('notes', []):
            if not any(k in n for k in known):
                review.append('**%s** log: %s' % (name, n))
    try:
        links = json.load(open(os.path.join(ROOT, 'spacecraft/data/links.json'), encoding='utf-8'))
        for u in links.get('broken', []):
            review.append('Spacecraft catalogue link no longer answers: %s' % u)
    except (OSError, ValueError):
        pass
    for r in cfg.get('reviews', []):
        due = (date.today() - date.fromisoformat(r['last_done'])).days
        if due >= r['every_days']:
            review.append('Review due: %s (last done %s; set last_done in dev/data_jobs.json when done)'
                          % (r['what'], r['last_done']))
    return problems, review


def report(problems, review):
    out = []
    if problems:
        out += ['### Problems', ''] + ['- ' + p for p in problems] + ['']
    if review:
        out += ['### To review', ''] + ['- ' + r for r in review] + ['']
    return '\n'.join(out)


def main():
    dry = '--dry-run' in sys.argv
    cfg = json.load(open(os.path.join(ROOT, 'dev/data_jobs.json'), encoding='utf-8'))
    repo = os.environ.get('GITHUB_REPOSITORY') or json.loads(gh('repo', 'view', '--json', 'nameWithOwner'))['nameWithOwner']
    problems, review = check(repo, cfg)
    body_items = report(problems, review)
    # the ages change every day; only a change in the items themselves counts as a change
    key = hashlib.sha1(re.sub(r'[\d.]+ (hours|days)', '', body_items).encode()).hexdigest()[:12]
    title = 'Data health: %d problem%s, %d to review' % (len(problems), '' if len(problems) == 1 else 's', len(review))
    stamp = NOW.strftime('%Y-%m-%d %H:%M UTC')
    body = ('The daily data health check (`dev/data_health.py`, rules in `docs/DATA-UPDATES.md`) found the items '
            'below. This issue is updated every day and closed when the list is empty.\n\n%s\nLast checked %s.\n'
            '<!-- items: %s -->\n' % (body_items, stamp, key))
    print(title if body_items else 'Data health: all clear.')
    print(body_items)
    if dry:
        return 0
    gh('label', 'create', LABEL, '--color', 'B08D57', '--force',
       '--description', 'Daily data health check (docs/DATA-UPDATES.md)')
    issues = json.loads(gh('issue', 'list', '--label', LABEL, '--state', 'open', '--json', 'number,body'))
    if not body_items:
        for i in issues:
            gh('issue', 'comment', str(i['number']), '--body', 'All clear on %s: every data job is running and every '
               'source is up to date. Closed automatically.' % stamp)
            gh('issue', 'close', str(i['number']))
        return 0
    if not issues:
        gh('issue', 'create', '--title', title, '--label', LABEL, '--body', body)
        return 0
    num = str(issues[0]['number'])
    changed = ('<!-- items: %s -->' % key) not in issues[0]['body']
    gh('issue', 'edit', num, '--title', title, '--body', body)
    if changed:
        gh('issue', 'comment', num, '--body', 'The list changed on %s:\n\n%s' % (stamp, body_items))
    return 0


if __name__ == '__main__':
    sys.exit(main())
