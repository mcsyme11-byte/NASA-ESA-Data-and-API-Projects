// NASA and ESA Data Projects · Control room · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// The developer's unlisted view of the automatic data updates (approved mock-up, Nov 17, 2026; rules in
// docs/DATA-UPDATES.md). It builds on the live data status (shared/datastatus.js: the jobs, their status files and
// GitHub's run list) and adds GitHub's public lists of the site's commits and of the data-health issue. GitHub allows
// 60 such requests an hour per visitor: the run list is kept 3 minutes, the commits and the issue 15 minutes, in this
// tab's session storage. When something is wrong, the page writes a ready-made message for the Data updates chat.

import * as ds from '../shared/datastatus.js?v=2026111905';

const REPO = 'mcsyme11-byte/NASA-ESA-Data-and-API-Projects';
const API = 'https://api.github.com/repos/' + REPO;
const GH = 'https://github.com/' + REPO;
const ACTIONS = GH + '/actions/runs/';
const STEPS = 'nasa-data-projects.controlroom.steps';
const KEEP_SLOW = 15 * 60 * 1000;
const STORE = 'nasa-data-projects.controlroom';
const WEEK = 7 * 864e5;
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const day = (d) => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' });
const clock = (d) => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dayClock = (d) => new Date(d).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
const dur = (min) => (min == null ? '—' : min < 60 ? Math.round(min) + ' min' : Math.floor(min / 60) + ' h ' + Math.round(min % 60) + ' min');
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 16).replace('T', ' ') + ' UTC' : '—');
const blob = (path) => GH + '/blob/main/' + path;
const tree = (path) => GH + '/tree/main/' + path.replace(/\/$/, '');
const ext = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(text)} ↗</a>`;
let status = null, slow = null, limit = null;

// ---------------------------------------------------------------- GitHub's commits and the data-health issue
async function slowLists(fresh) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || 'null');
    if (!fresh && saved && Date.now() - saved.t < KEEP_SLOW) return saved;
  } catch { /* storage not available */ }
  const head = { headers: { Accept: 'application/vnd.github+json' } };
  const since = new Date(Date.now() - WEEK).toISOString();
  const [commits, issues] = await Promise.all([
    fetch(API + '/commits?per_page=100&since=' + since, head).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
    fetch(API + '/issues?labels=data-health&state=all&per_page=3', head).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
  ]);
  const out = {
    t: Date.now(),
    commits: commits.map((c) => ({ sha: c.sha, url: c.html_url, when: c.commit.committer.date, msg: c.commit.message.split('\n')[0], bot: /\[bot\]/.test((c.author && c.author.login) || c.commit.author.name || '') })),
    issues: issues.map((i) => ({ number: i.number, url: i.html_url, state: i.state, title: i.title, opened: i.created_at, closed: i.closed_at })),
  };
  try { sessionStorage.setItem(STORE, JSON.stringify(out)); } catch { /* full: fine */ }
  return out;
}

// GitHub's request limit for this visitor (reading it does not count against it)
async function readLimit() {
  try {
    const r = await fetch('https://api.github.com/rate_limit', { headers: { Accept: 'application/vnd.github+json' } }).then((x) => x.json());
    return r.resources.core;
  } catch { return null; }
}

// the failed steps of a finished run (GitHub's list of the run's jobs), kept for the session: a finished run never changes
async function failedSteps(run) {
  if (!run || run.status !== 'completed' || run.conclusion === 'success' || !run.id) return [];
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(STEPS) || '{}'); } catch { /* storage not available */ }
  if (saved[run.id]) return saved[run.id];
  try {
    const r = await fetch(API + '/actions/runs/' + run.id + '/jobs', { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) return [];
    const out = [];
    for (const j of (await r.json()).jobs || []) {
      const bad = (j.steps || []).filter((st) => st.conclusion === 'failure');
      if (bad.length) out.push(...bad.map((st) => ({ job: j.name, step: st.name, url: j.html_url })));
      else if (j.conclusion === 'failure') out.push({ job: j.name, step: '(the job itself)', url: j.html_url });
    }
    saved[run.id] = out;
    try { sessionStorage.setItem(STEPS, JSON.stringify(saved)); } catch { /* full: fine */ }
    return out;
  } catch { return []; }
}

// ---------------------------------------------------------------- the jobs, with the health check as one more
function healthJob(s) {
  const mine = (s.runs || []).filter((r) => r.path && r.path.endsWith('/data-health.yml'));
  const done = mine.filter((r) => r.status === 'completed');
  return { id: 'data-health', name: 'Data health check', cron: ['7 22 * * *'], runs: 'daily', health: true, scripts: ['dev/data_health.py'], data: [], history: done.slice(0, 10).reverse().map((r) => ({ result: r.conclusion, when: r.updated, event: r.event })),
    lastRun: done[0] || null, next: ds.nextRun(['7 22 * * *']) };
}

// the job's last scheduled time at or before a moment, from its cron times (UTC)
function scheduledBefore(crons, when) {
  const t = new Date(when).getTime();
  const long = crons.some((c) => c.trim().split(/\s+/)[2] !== '*');
  let n = ds.nextRun(crons, new Date(t - (long ? 100 : 8) * 864e5)), best = null;
  while (n && n.getTime() <= t) { best = n; n = ds.nextRun(crons, n); }
  return best;
}

// "06:17 and 14:47 UTC" from the cron times, for the job's line
function cronTimes(crons) {
  const times = crons.map((c) => { const [m, h] = c.trim().split(/\s+/); return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); });
  return times.join(' and ') + ' UTC';
}

function startedBy(run, crons) {
  if (run.event === 'schedule') return 'GitHub timer';
  if (run.event === 'push') return 'After a change';
  const s = scheduledBefore(crons, run.created);
  if ((run.event === 'workflow_dispatch' || run.event === 'repository_dispatch') && s && (new Date(run.created) - s) / 6e4 <= 15) return 'Outside clock';
  return 'By hand';
}

function timingRows() {
  const byPath = {};
  for (const j of status.jobs) byPath[j.id] = j;
  byPath['data-health'] = healthJob(status);
  const rows = [];
  for (const r of status.runs || []) {
    const id = (r.path || '').split('/').pop().replace('.yml', '');
    const j = byPath[id];
    if (!j) continue;
    const by = startedBy(r, j.cron);
    const sched = (by === 'GitHub timer' || by === 'Outside clock') ? scheduledBefore(j.cron, r.created) : null;
    rows.push({ j, r, by, sched, late: sched ? (new Date(r.created) - sched) / 6e4 : null });
  }
  return rows;
}

// ---------------------------------------------------------------- needs attention, and the message for the chat
function problems() {
  const out = [], jobs = [];
  for (const j of status.jobs) {
    const before = out.length;
    if (j.state === 'failed' && j.lastRun) out.push(`the ${j.name} job's latest run failed (${iso(j.lastRun.updated)}). Run: ${j.lastRun.url}`);
    for (const s of j.failing) {
      out.push(`the ${j.name} job's source "${s.label}"${s.agency ? ' (' + s.agency + ')' : ''} has been failing since ${iso(s.since)}; the previous data is kept${s.note ? '. Note: ' + s.note : ''}`);
    }
    if (j.state === 'late' && j.lastOk) out.push(`the ${j.name} job has had no successful run since ${iso(j.lastOk.updated)} (it runs ${j.runs})`);
    for (const [key, c] of Object.entries(j.sources_cfg || {})) {
      const st = (j.raw && j.raw[key]) || {};
      if (c.max_age_days && st.last_ok && (Date.now() - new Date(st.last_ok)) / 864e5 > c.max_age_days) {
        out.push(`the ${j.name} job's ${c.label} were last updated ${ds.ago(st.last_ok)} (allowed: ${c.max_age_days} days)`);
      }
    }
    if (out.length > before) jobs.push(j.id);
  }
  const issue = slow && slow.issues.find((i) => i.state === 'open');
  return { list: out, issue, jobs };
}

// ---------------------------------------------------------------- technical reports for the chat (plain text)
function jobCfg(j) { return (status.cfg && status.cfg.jobs && status.cfg.jobs[j.id]) || {}; }

async function jobReport(j) {
  const c = jobCfg(j), L = [];
  const run = j.running || j.lastRun;
  L.push(`Job: ${j.name} (${j.id}) — ${j.health ? ((slow && slow.issues[0] && slow.issues[0].state === 'open') ? 'reporting' : 'all clear') : ds.WORDS[j.state] + ' [' + j.state + ']'}`);
  L.push(`Workflow: .github/workflows/${j.id}.yml · cron (UTC) ${j.cron.map((x) => "'" + x + "'").join(', ')} · ${j.runs}` +
    (c.max_age_hours != null ? ` · max_age_hours ${c.max_age_hours}, grace_hours ${c.grace_hours}` : ''));
  if (run) {
    L.push(`Latest run: ${run.status === 'completed' ? run.conclusion : run.status} · event ${run.event} · started ${iso(run.created)} · last update ${iso(run.updated)} · ${run.url}`);
    for (const f of await failedSteps(run)) L.push(`  Failed step: ${f.job} › ${f.step} · ${f.url}`);
  } else L.push('Latest run: none in view');
  if (!j.health) {
    L.push(`Last success: ${j.lastOk ? iso(j.lastOk.updated) + ' (' + ds.ago(j.lastOk.updated) + ')' : 'none in view'} · last new data: ${j.changed ? iso(j.changed) : 'none recorded'} · next scheduled: ${j.next ? iso(j.next) : '—'}`);
    L.push('Sources:');
    for (const x of j.sources) {
      const st = (j.raw && j.raw[x.key]) || {}, sc = (j.sources_cfg || {})[x.key] || {};
      const bits = [x.state];
      if (st.since) bits.push('since ' + iso(st.since));
      if (sc.every_days) bits.push(`every ${sc.every_days} d (retry ${sc.retry_days || 3} d, max age ${sc.max_age_days} d), last run ${iso(st.last_run)}, last ok ${iso(st.last_ok)}`);
      if (x.note) bits.push('note: ' + x.note);
      L.push(`  - ${x.label} [${x.key}]${x.agency ? ' (' + x.agency + ')' : ''}: ${bits.join(', ')}`);
    }
    L.push('Notes in the log: ' + ((j.notes || []).length ? j.notes.join(' | ') : 'none'));
    L.push(`Status file: ${blob('shared/data/status/' + j.id + '.json')}`);
  } else {
    const i = slow && slow.issues[0];
    L.push('Data-health issue: ' + (i ? `#${i.number} ${i.state} ("${i.title}") ${i.url}` : 'none yet'));
  }
  if ((c.data || j.data || []).length) L.push('Data: ' + (c.data || j.data).join(', '));
  L.push('Scripts: ' + (c.scripts || j.scripts || []).join(', '));
  return L.join('\n');
}

function reportHead(title) {
  const lim = limit ? ` · GitHub API ${limit.remaining}/${limit.limit} left, resets ${iso(limit.reset * 1000)}` : '';
  return [`NEDAP data updates — ${title}`, `Read ${iso(status.checked)} from the control room (${location.href.split('#')[0]})${lim}`,
    `Overall: ${status.headline}${status.detail ? ' — ' + status.detail : ''} [${status.state}]`];
}

async function problemReport() {
  const p = problems(), names = new Set(p.jobs);
  const L = reportHead('problem report');
  L.push('', 'Problems:', ...p.list.map((x, i) => `${i + 1}. ${x}`));
  if (p.issue) L.push(`${p.list.length + 1}. data-health issue #${p.issue.number} is open ("${p.issue.title}"): ${p.issue.url}`);
  for (const j of status.jobs.filter((x) => names.has(x.id))) L.push('', await jobReport(j));
  if (p.issue) L.push('', await jobReport(healthJob(status)));
  L.push('', 'Please look into it and fix it.');
  return L.join('\n');
}

async function fullReport() {
  const L = reportHead('full report');
  const p = problems();
  L.push(`Problems: ${p.list.length + (p.issue ? 1 : 0) || 'none'}`);
  const c = status.cfg && status.cfg.clock;
  L.push(`Outside clock: ${c && c.set_up ? c.service + ' since ' + c.set_up + ', token expires ' + (c.token_expires || '?') : 'not set up (GitHub timer only)'}`);
  if (slow && slow.commits[0]) L.push(`Latest commit on main: ${slow.commits[0].sha.slice(0, 7)} ${iso(slow.commits[0].when)} "${slow.commits[0].msg}"`);
  for (const j of status.jobs.concat([healthJob(status)])) L.push('', await jobReport(j));
  return L.join('\n');
}

async function copyText(btn, make, label) {
  btn.disabled = true;
  try { await navigator.clipboard.writeText(await make()); btn.textContent = 'Copied'; }
  catch { btn.textContent = 'Could not copy'; }
  finally { btn.disabled = false; setTimeout(() => { btn.textContent = label; }, 4000); }
}

function renderAttention() {
  const s = status, p = problems();
  const head = $('bhead'), light = head.querySelector('.light');
  let state = s.state, headline = s.headline, detail = s.detail || '';
  if (p.issue && state === 'ok') { state = 'partial'; headline = 'The health check has an open report'; detail = p.issue.title + '.'; }
  head.dataset.state = light.dataset.state = state;
  $('headline').textContent = headline;
  $('detail').textContent = detail;
  const items = p.list.slice();
  if (p.issue) items.push(`the data-health issue #${p.issue.number} is open ("${p.issue.title}"): ${p.issue.url}`);
  $('ask').hidden = !items.length;
  if (items.length) {
    $('msg').textContent = 'Data updates: ' + (items.length === 1 ? items[0] : items.map((x, i) => (i + 1) + ') ' + x).join('; ')) +
      '. Please look into it and fix it.';
  }
}

// ---------------------------------------------------------------- figures for the last 7 days
function renderFigures(rows) {
  const week = rows.filter(({ r }) => Date.now() - new Date(r.created) < WEEK && r.status === 'completed');
  if (!status.api || !week.length) { ['f-runs', 'f-ok', 'f-gh', 'f-clock'].forEach((id) => { $(id).textContent = '–'; }); $('f-runs-n').textContent = 'GitHub not reachable just now'; }
  else {
    const ok = week.filter(({ r }) => r.conclusion === 'success').length;
    const bad = week.filter(({ r }) => r.conclusion === 'failure');
    $('f-runs').textContent = week.length;
    $('f-runs-n').textContent = 'data jobs and the health check, in view';
    $('f-ok').innerHTML = Math.round((100 * ok) / week.length) + '<small>%</small>';
    $('f-ok-n').textContent = bad.length ? bad.length + ' failed: ' + [...new Set(bad.map(({ j }) => j.name))].join(', ') : 'none failed';
    const med = (xs) => { const a = xs.slice().sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
    for (const [by, id] of [['GitHub timer', 'gh'], ['Outside clock', 'clock']]) {
      const xs = week.filter((x) => x.by === by && x.late != null).map((x) => x.late);
      const m = med(xs);
      $('f-' + id).innerHTML = m == null ? '–' : (m < 60 ? Math.round(m) + '<small> min</small>' : Math.floor(m / 60) + '<small> h ' + Math.round(m % 60) + ' min</small>');
      $('f-' + id + '-n').textContent = xs.length ? 'median of ' + xs.length + '; worst ' + dur(Math.max(...xs)) : by === 'Outside clock' ? 'not started yet' : 'no runs in view';
    }
  }
  if (slow) {
    const saves = slow.commits.filter((c) => c.bot && /^[A-Z][^:]+:/.test(c.msg) && !/Project Record/.test(c.msg));
    $('f-saves').textContent = saves.length;
    $('f-saves-n').textContent = 'data commits by the jobs';
  } else { $('f-saves').textContent = '–'; $('f-saves-n').textContent = 'GitHub not reachable just now'; }
}

// ---------------------------------------------------------------- every job
function renderJobs() {
  const all = status.jobs.concat([healthJob(status)]);
  $('jobs').innerHTML = all.map((j) => {
    const isHealth = j.id === 'data-health';
    const issue = slow && slow.issues[0];
    const state = isHealth ? (issue && issue.state === 'open' ? 'partial' : 'ok') : j.state;
    const srcs = isHealth
      ? `<span class="srcstate" data-state="${issue && issue.state === 'open' ? 'failed' : 'ok'}">${issue ? (issue.state === 'open' ? 'Issue #' + issue.number + ' open' : 'Last issue #' + issue.number + ' closed') : 'No issue yet'}</span>`
      : j.sources.map((x) => `<span class="srcstate" data-state="${x.state}" title="${esc(x.label + (x.agency ? ' · ' + x.agency : '') + (x.state === 'failed' ? ': failing since ' + ds.ago(x.since) + (x.note ? ' (' + x.note + ')' : '') : ''))}">${esc(x.label)}</span>`).join('');
    const ticks = j.history.map((h) => `<i data-r="${esc(h.result)}" title="${esc((h.result === 'success' ? 'Finished' : h.result === 'failure' ? 'Failed' : 'Cancelled') + ', ' + dayClock(h.when))}"></i>`).join('') + (j.running ? '<i data-r="running" title="Running now"></i>' : '');
    const when = [];
    if (j.running) when.push(['Started', ds.ago(j.running.created)]);
    else when.push(['Last run', j.lastRun ? ds.ago(j.lastRun.updated) : 'not in view']);
    if (!isHealth) when.push(['New data', j.changed ? ds.ago(j.changed) : 'none recorded yet']);
    when.push(['Next run', j.next ? ds.until(j.next) : '–']);
    for (const [key, c] of Object.entries(j.sources_cfg || {})) {
      if (!c.every_days) continue;
      const st = (j.raw && j.raw[key]) || {};
      const nextDue = st.last_run ? new Date(new Date(st.last_run).getTime() + (st.state === 'failed' ? (c.retry_days || 3) : c.every_days) * 864e5) : null;
      when.push([c.label.replace(/ \(.*\)/, ''), nextDue ? 'due ' + day(nextDue) : 'due now']);
    }
    if (!isHealth && j.notes_n) when.push(['Notes', j.notes_n]);
    const name = isHealth ? esc(j.name) : `<a href="../${esc(j.href)}">${esc(j.name)}</a>`;
    const meta = isHealth ? '22:07 UTC daily · reads only' : esc(cronTimes(j.cron) + ' · ' + j.runs);
    return `<li class="job" data-state="${state}"><span class="light" data-state="${state}" aria-hidden="true"></span>
      <div><h3>${name}</h3><p class="job-meta">${meta}</p><div class="job-srcs">${srcs}</div></div>
      <dl class="job-when">${when.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>
      <div class="job-side"><span class="job-state">${isHealth ? (state === 'ok' ? 'All clear' : 'Reporting') : ds.WORDS[state]}</span>
        <div class="ticks" role="img" aria-label="Latest runs">${ticks}</div></div></li>`;
  }).join('');
}

// ---------------------------------------------------------------- timing, saves, notes, coming up
function renderRuns(rows) {
  $('tz').textContent = 'Times in your time zone (' + Intl.DateTimeFormat().resolvedOptions().timeZone.replace(/_/g, ' ') + ').';
  if (!status.api) { $('runs').innerHTML = '<tr><td colspan="6" class="state">GitHub\'s run list could not be read just now.</td></tr>'; $('runs-n').textContent = ''; return; }
  const shown = rows.slice(0, 15);
  $('runs-n').textContent = 'Latest ' + shown.length + ' of ' + rows.length + ' in view';
  $('runs').innerHTML = shown.map(({ j, r, by, sched, late }) => {
    const res = r.status !== 'completed' ? '<span class="badge live">Running</span>'
      : r.conclusion === 'success' ? '<span class="badge">Done</span>'
      : r.conclusion === 'failure' ? '<span class="badge warn">Failed</span>' : '<span class="badge">' + esc(r.conclusion || r.status) + '</span>';
    return `<tr><td data-label="Job"><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(j.name)}</a></td>
      <td data-label="Scheduled">${sched ? esc(dayClock(sched)) : '—'}</td><td data-label="Started">${esc(dayClock(r.created))}</td>
      <td data-label="Late by" class="r">${esc(dur(late))}</td><td data-label="Started by">${esc(by)}</td><td data-label="Result">${res}</td></tr>`;
  }).join('') || '<tr><td colspan="6" class="state">No runs in view.</td></tr>';
}

function renderSaves() {
  if (!slow) { $('saves').innerHTML = '<tr><td colspan="4" class="state">GitHub\'s commit list could not be read just now.</td></tr>'; return; }
  const saves = slow.commits.filter((c) => c.bot && /^[A-Z][^:]+:/.test(c.msg) && !/Project Record/.test(c.msg)).slice(0, 8);
  $('saves').innerHTML = saves.map((c) => {
    const [job, what] = [c.msg.split(':')[0], c.msg.split(':').slice(1).join(':').trim()];
    return `<tr><td data-label="When">${esc(dayClock(c.when))}</td><td data-label="Job">${esc(job)}</td>
      <td data-label="What">${esc(what)}</td><td data-label="Files" class="r"><a href="${esc(c.url)}" target="_blank" rel="noopener">see ↗</a></td></tr>`;
  }).join('') || '<tr><td colspan="4" class="state">No data saved in the last 7 days.</td></tr>';
}

async function renderNoted() {
  const known = (status.cfg && status.cfg.known_notes || []).map((k) => k.match);
  let refused = [], newNotes = [], knownNotes = [], broken = [];
  for (const j of status.jobs) {
    const g = j.sources.find((x) => x.key === 'checks');
    if (g && g.state === 'failed' && g.note) refused.push(j.name + ': ' + g.note);
    for (const n of j.notes || []) (known.some((k) => n.includes(k)) ? knownNotes : newNotes).push(j.name + ': ' + n);
  }
  try { broken = (await fetch(ds.siteUrl('spacecraft/data/links.json'), { cache: 'no-cache' }).then((r) => r.json())).broken || []; } catch { /* none */ }
  const li = (t, v) => `<li><strong>${t}:</strong> ${v}</li>`;
  $('noted').innerHTML = li('Data guard', refused.length ? esc(refused.join('; ')) : 'nothing refused at present.')
    + li('New notes', newNotes.length ? esc(newNotes.join('; ')) : 'none.')
    + li('Known notes', knownNotes.length ? knownNotes.length + ' (listed in dev/data_jobs.json)' : 'none.')
    + li('Broken catalogue links', broken.length ? esc(broken.join(', ')) : 'none.');
}

function renderAhead() {
  const daily = status.jobs.filter((j) => j.next).sort((a, b) => a.next - b.next);
  $('n-runs').textContent = daily.map((j) => j.name + ' ' + ds.until(j.next)).join(' · ') + ' · Health check ' + ds.until(ds.nextRun(['7 22 * * *'])) + '.';
  const cycles = [];
  for (const j of status.jobs) {
    for (const [key, c] of Object.entries(j.sources_cfg || {})) {
      if (!c.every_days) continue;
      const st = (j.raw && j.raw[key]) || {};
      if (st.last_run) cycles.push(c.label.replace(/ \(.*\)/, '') + ' due ' + day(new Date(st.last_run).getTime() + c.every_days * 864e5));
    }
  }
  const places = status.jobs.find((j) => j.id === 'build-places');
  if (places && places.next) cycles.push('place and map lists ' + day(places.next));
  cycles.push('famous passes on the 1st of each month');
  $('n-cycles').textContent = cycles.join(' · ') + '.';
  const reviews = (status.cfg && status.cfg.reviews || []).map((r) => r.what.split(' (')[0] + ' due ' + day(new Date(r.last_done).getTime() + r.every_days * 864e5));
  $('n-reviews').textContent = reviews.join(' · ') + '.';
  const c = status.cfg && status.cfg.clock;
  if (c && c.set_up) {
    const left = c.token_expires ? Math.round((new Date(c.token_expires) - Date.now()) / 864e5) : null;
    $('n-clock').textContent = `Running at ${c.service} since ${day(c.set_up)}` + (left != null ? ` · the token that starts the jobs expires ${day(c.token_expires)} (in ${left} days); the health check reminds 30 days before.` : '.');
  } else {
    $('n-clock').textContent = 'Not set up yet: GitHub\'s own timer starts every job (often hours late).';
  }
}

// ---------------------------------------------------------------- technical: jobs in detail, the system, links
function renderDetail() {
  const all = status.jobs.concat([healthJob(status)]);
  $('detail-rows').innerHTML = all.map((j) => {
    const c = jobCfg(j), run = j.running || j.lastRun, wf = '.github/workflows/' + j.id + '.yml';
    const limits = j.health ? 'reads only; reports through the data-health issue' : `late after ${c.max_age_hours} h · source grace ${c.grace_hours} h`
      + Object.values(c.sources || {}).filter((x) => x.every_days).map((x) => ` · ${x.label.replace(/ \(.*\)/, '').toLowerCase()} every ${x.every_days} d, max ${x.max_age_days} d`).join('');
    const latest = run ? `<a href="${esc(run.url)}" target="_blank" rel="noopener">${esc(run.status === 'completed' ? run.conclusion : run.status)}</a> · ${esc(run.event)}<br>${esc(iso(run.created))}` : 'none in view';
    const links = [ext(blob(wf), 'File'), ext(GH + '/actions/workflows/' + j.id + '.yml', 'Runs')];
    if (!j.health) links.push(ext(blob('shared/data/status/' + j.id + '.json'), 'Status'));
    for (const d of (c.data || [])) links.push(ext(d.endsWith('/') ? tree(d) : blob(d), 'Data'));
    const sc = c.scripts || j.scripts || [];
    if (sc.length) links.push(ext(sc.length === 1 ? blob(sc[0]) : tree(sc[0].split('/').slice(0, -1).join('/')), sc.length === 1 ? 'Script' : 'Scripts'));
    return `<tr><td data-label="Job">${esc(j.name)}<br><code>${esc(j.id)}</code><br>
        <button class="linkbtn" type="button" data-report="${esc(j.id)}">Copy report</button></td>
      <td data-label="Workflow"><code>${esc(j.id)}.yml</code>${j.cron.map((x) => '<br><code>' + esc(x) + '</code>').join('')}</td>
      <td data-label="Limits">${esc(limits)}</td><td data-label="Latest run">${latest}</td>
      <td data-label="Links">${links.join(' · ')}</td></tr>`;
  }).join('');
}

function renderSystem() {
  const pages = location.origin + location.pathname.replace(/control-room\/.*$/, '');
  $('s-repo').innerHTML = `${ext(GH, 'The repository')} (public), branch <code>main</code> (protected: no force push, no deletion). Published by
    GitHub Pages (${ext(pages, 'the site')}) a minute or two after each push.`;
  const ids = new Set(status.jobs.map((j) => j.id).concat(['data-health']));
  const week = (status.runs || []).filter((r) => r.status === 'completed' && ids.has((r.path || '').split('/').pop().replace('.yml', '')) && Date.now() - new Date(r.created) < WEEK);
  const mins = Math.round(week.reduce((t, r) => t + Math.max(1, (new Date(r.updated) - new Date(r.created)) / 6e4), 0));
  $('s-runners').innerHTML = `GitHub-hosted <code>ubuntu-latest</code> runners, a fresh machine for each run. The repository is
    public, so GitHub Actions minutes are free and unlimited. Data jobs and the health check in view: ${week.length} runs,
    about ${mins} minutes, in the last 7 days.`;
  const c = status.cfg && status.cfg.clock;
  const how = `GitHub's API (<code>POST</code> to <code>…/workflows/&lt;file&gt;/dispatches</code>, body <code>{"ref":"main"}</code>)`;
  $('s-clock').innerHTML = c && c.set_up
    ? `Timers at ${ext('https://console.cron-job.org/jobs', c.service)} (since ${esc(c.set_up)}) call ${how} at each cron time, with a
      fine-grained token (Actions read and write, this repository only) that expires ${esc(c.token_expires || '?')}. GitHub's own
      <code>schedule</code> stays on as the backup.`
    : `GitHub's own <code>schedule</code> only, often hours late. The outside clock (${c ? esc(c.service) : 'cron-job.org'}) will call ${how}
      at each cron time.`;
  const i = slow && slow.issues[0];
  $('s-health').innerHTML = `${ext(blob('dev/data_health.py'), 'dev/data_health.py')} runs daily at 22:07 UTC (<code>data-health.yml</code>).
    It keeps one issue labelled <code>data-health</code>: opened when it finds a problem, commented on when the list changes,
    closed when all is clear. ${i ? 'Latest: ' + ext(i.url, '#' + i.number + ' (' + i.state + ')') + '.' : 'No issue yet.'}`;
  const tag = ((document.querySelector('link[href*="theme.css"]') || {}).href || '').match(/v=(\d+)/);
  const last = slow && slow.commits[0];
  $('s-page').innerHTML = `GitHub API: ${limit ? `${limit.remaining} of ${limit.limit} requests left this hour, resets ${esc(clock(limit.reset * 1000))}` : 'limit not readable just now'};
    run list kept 3 min, commits and issue 15 min, failed steps for the session. Style version <code>${esc(tag ? tag[1] : '?')}</code>.`
    + (last ? ` Latest commit on main: ${ext(last.url, last.sha.slice(0, 7))} ${esc(ds.ago(last.when))}, "${esc(last.msg)}".` : '');
}

function renderLinks() {
  const li = (href, text, what) => `<tr><td data-label="Where">${ext(href, text)}</td><td data-label="What">${esc(what)}</td></tr>`;
  $('links-gh').innerHTML = [
    li(GH + '/actions', 'Actions', 'every run, with logs'),
    li(tree('.github/workflows'), '.github/workflows/', 'the workflow files'),
    li(GH + '/issues?q=label%3Adata-health', 'data-health issues', 'the health check\'s reports'),
    li(GH + '/commits/main', 'Commits on main', 'every save'),
    li(tree('shared/data/status'), 'shared/data/status/', 'one status file per job'),
    li(blob('dev/datajob.py'), 'dev/datajob.py', 'the last step of every job'),
    li(blob('dev/data_health.py'), 'dev/data_health.py', 'the daily check'),
    li(blob('dev/data_jobs.json'), 'dev/data_jobs.json', 'jobs, sources, limits, the clock, reviews'),
    li(GH + '/settings/actions', 'Actions settings', 'owner only'),
  ].join('');
  $('links-docs').innerHTML = [
    li(blob('docs/DATA-UPDATES.md'), 'docs/DATA-UPDATES.md', 'the rules and the jobs table'),
    li(blob('docs/ROADMAP.md'), 'docs/ROADMAP.md', 'section 4: data updates to do'),
    li(blob('docs/DATA-SOURCES.md'), 'docs/DATA-SOURCES.md', 'every source, its limits and credit'),
    li(blob('CHANGELOG.md'), 'CHANGELOG.md', 'what changed'),
    li('https://console.cron-job.org/jobs', 'cron-job.org console', 'the outside clock\'s timers (sign-in)'),
    li('https://www.githubstatus.com/', 'GitHub status', 'when Actions or Pages is down'),
  ].join('');
}

// ---------------------------------------------------------------- refresh
async function refresh(fresh) {
  const btn = $('refresh');
  btn.disabled = true;
  try {
    const [s, l, lim] = await Promise.all([ds.load({ fresh }), slowLists(fresh).catch(() => null), readLimit()]);
    status = s; slow = l; limit = lim;
    // each job's source settings and raw status entries (for the cycles), and its notes, from the same files
    await Promise.all(status.jobs.map(async (j) => {
      j.sources_cfg = (status.cfg && status.cfg.jobs[j.id] && status.cfg.jobs[j.id].sources) || {};
      try {
        const st = await fetch(ds.siteUrl('shared/data/status/' + j.id + '.json'), { cache: 'no-cache' }).then((r) => r.json());
        j.raw = st.sources || {}; j.notes = st.notes || [];
        j.notes_n = j.notes.length ? j.notes.length + ' in the log' : '';
      } catch { j.raw = {}; j.notes = []; }
    }));
    const rows = timingRows();
    renderAttention(); renderFigures(rows); renderJobs(); renderDetail(); renderRuns(rows); renderSaves(); renderAhead(); renderSystem(); renderLinks();
    await renderNoted();
    $('checked').textContent = status.api ? 'Status read ' + ds.ago(status.checked) + ' · refreshes every 3 minutes' : 'GitHub not reachable just now; showing the jobs\' own records';
  } finally { btn.disabled = false; }
}

$('refresh').addEventListener('click', () => refresh(true));
$('copy').addEventListener('click', (e) => copyText(e.currentTarget, problemReport, 'Copy for the chat'));
$('copyall').addEventListener('click', (e) => { if (status) copyText(e.currentTarget, fullReport, 'Copy full report'); });
$('detail-rows').addEventListener('click', (e) => {
  const b = e.target.closest('[data-report]');
  if (!b || !status) return;
  const j = status.jobs.find((x) => x.id === b.dataset.report) || healthJob(status);
  copyText(b, async () => reportHead('job report').concat(['', await jobReport(j)]).join('\n'), 'Copy report');
});
refresh(false);
setInterval(() => { if (!document.hidden) refresh(false); }, ds.REFRESH_MS);
