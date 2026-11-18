// NASA and ESA Data Projects · live data status · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Works out, in the browser, how the site's automatic data jobs stand: up to date, updating now, late, partly failed
// or failed. Used by the footer of every page (shared/footer.js) and by the data-collection page. Rules in
// docs/DATA-UPDATES.md (decided Nov 14, 2026).
//
// It reads:
//   - dev/data_jobs.json: the jobs, their schedules (UTC) and sources;
//   - shared/data/status/<job>.json: each source's state, written by the jobs themselves (dev/datajob.py);
//   - GitHub's public list of the repository's workflow runs (api.github.com, no key): which jobs are running now,
//     and the latest runs. GitHub allows 60 such requests an hour per visitor, so the answer is kept for 3 minutes in
//     the browser tab (session storage) and shared by every page; without it the status files are used alone.
// Nothing about the visitor is stored or sent (see the Privacy page).

const REPO = 'mcsyme11-byte/NASA-ESA-Data-and-API-Projects';
const RUNS = 'https://api.github.com/repos/' + REPO + '/actions/runs';
const ROOT = new URL('../', import.meta.url.split('?')[0]);
const KEEP_MS = 3 * 60 * 1000;
const STORE = 'nasa-data-projects.datastatus';
const ACTIVE = ['in_progress', 'queued', 'requested', 'waiting', 'pending'];

export const REFRESH_MS = KEEP_MS;
export const siteUrl = (path) => new URL(path, ROOT).href;

async function json(url, opts) {
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(url + ': HTTP ' + r.status);
  return r.json();
}

// GitHub's run list: the latest runs of any kind (for what is running now) and the latest scheduled runs (for a
// longer history). Kept for 3 minutes in the tab.
async function runs(fresh) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || 'null');
    if (!fresh && saved && Date.now() - saved.t < KEEP_MS) return saved;
  } catch { /* storage not available */ }
  const pick = (r) => ({ id: r.id, path: r.path, event: r.event, status: r.status, conclusion: r.conclusion,
    created: r.created_at, updated: r.updated_at, url: r.html_url });
  const head = { headers: { Accept: 'application/vnd.github+json' } };
  const [latest, sched] = await Promise.all([
    json(RUNS + '?per_page=60', head), json(RUNS + '?event=schedule&per_page=100', head)]);
  const out = { t: Date.now(), runs: [...latest.workflow_runs, ...sched.workflow_runs].map(pick) };
  try { sessionStorage.setItem(STORE, JSON.stringify(out)); } catch { /* full or blocked: fine */ }
  return out;
}

// ---------------------------------------------------------------- schedules
// The next time a five-field cron schedule (UTC) runs after `from`: minutes, hours, day of month, month, day of week,
// each "*", a number or a list of numbers, as the workflows use them.
function field(text, lo, hi) {
  if (text === '*') return null;
  return text.split(',').map(Number).filter((n) => n >= lo && n <= hi).sort((a, b) => a - b);
}
export function nextRun(crons, from = new Date()) {
  let best = null;
  for (const c of crons || []) {
    const [mi, ho, dm, mo, dw] = c.trim().split(/\s+/);
    const mins = field(mi, 0, 59) || [0], hours = field(ho, 0, 23) || [...Array(24).keys()];
    const doms = field(dm, 1, 31), mons = field(mo, 1, 12), dows = field(dw, 0, 6);
    const day = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    for (let i = 0; i < 400; i++, day.setUTCDate(day.getUTCDate() + 1)) {
      if (doms && !doms.includes(day.getUTCDate())) continue;
      if (mons && !mons.includes(day.getUTCMonth() + 1)) continue;
      if (dows && !dows.includes(day.getUTCDay())) continue;
      let hit = null;
      for (const h of hours) {
        for (const m of mins) {
          const t = new Date(day.getTime() + (h * 60 + m) * 60000);
          if (t > from) { hit = t; break; }
        }
        if (hit) break;
      }
      if (hit) { if (!best || hit < best) best = hit; break; }
    }
  }
  return best;
}
// every run time of a daily or weekly schedule within one UTC day, as minutes after midnight UTC (for the chart)
export function dailyMinutes(crons) {
  const out = [];
  for (const c of crons || []) {
    const [mi, ho, dm, mo] = c.trim().split(/\s+/);
    if (dm !== '*' || mo !== '*') continue;
    for (const h of field(ho, 0, 23) || []) for (const m of field(mi, 0, 59) || [0]) out.push(h * 60 + m);
  }
  return out.sort((a, b) => a - b);
}

// ---------------------------------------------------------------- words
export function ago(when, now = Date.now()) {
  if (!when) return '';
  const s = Math.max(0, (now - new Date(when).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return m + ' min ago';
  const h = s / 3600;
  if (h < 36) return Math.round(h) + (Math.round(h) === 1 ? ' hour ago' : ' hours ago');
  const d = Math.round(h / 24);
  return d < 60 ? d + ' days ago' : Math.round(d / 30.4) + ' months ago';
}
export function until(when, now = Date.now()) {
  if (!when) return '';
  let s = Math.max(0, Math.round((new Date(when).getTime() - now) / 1000));
  if (s < 60) return 'in under a minute';
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  if (d >= 2) return 'in ' + d + ' days';
  if (d === 1) return 'in 1 day ' + h + ' h';
  if (h) return 'in ' + h + ' h ' + String(m).padStart(2, '0') + ' min';
  return 'in ' + m + ' min ' + String(s - m * 60).padStart(2, '0') + ' s';
}

export const WORDS = {
  ok: 'Up to date', updating: 'Updating now', late: 'Late', partial: 'Partly failed', failed: 'Failed', unknown: 'Unknown',
};
const RANK = { failed: 5, partial: 4, updating: 3, late: 2, ok: 1, unknown: 0 };
// "A", "A and B", "A, B and C"
const list = (xs) => (xs.length < 3 ? xs.join(' and ') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);

// ---------------------------------------------------------------- the status
// Returns { jobs: [...], state, headline, detail, latest, api, checked }. Never throws: what cannot be read is
// reported as unknown.
export async function load({ fresh = false } = {}) {
  const now = Date.now();
  let cfg;
  try { cfg = await json(siteUrl('dev/data_jobs.json'), { cache: 'no-cache' }); }
  catch { return { jobs: [], state: 'unknown', headline: 'Live data status unavailable', detail: 'The status could not be read.', api: false, checked: now }; }
  const ids = Object.keys(cfg.jobs);
  const [statuses, gh] = await Promise.all([
    Promise.all(ids.map((id) => json(siteUrl('shared/data/status/' + id + '.json'), { cache: 'no-cache' }).catch(() => null))),
    runs(fresh).catch(() => null),
  ]);
  const seen = new Set();
  const all = (gh ? gh.runs : []).filter((r) => !seen.has(r.id) && seen.add(r.id))
    .sort((a, b) => new Date(b.created) - new Date(a.created));

  const jobs = ids.map((id, i) => {
    const j = cfg.jobs[id], st = statuses[i];
    const mine = all.filter((r) => r.path && r.path.endsWith('/' + id + '.yml'));
    const running = mine.find((r) => ACTIVE.includes(r.status));
    const done = mine.filter((r) => r.status === 'completed');
    const lastOk = done.find((r) => r.conclusion === 'success');
    const sources = Object.entries(j.sources || {}).map(([key, s]) => {
      const v = st && st.sources ? st.sources[key] : null;
      return { key, label: s.label, agency: s.agency, state: v ? (v.state === 'failed' ? 'failed' : 'ok') : 'unknown',
        since: v ? v.since : null, note: v ? v.note : '' };
    });
    const guard = st && st.sources && st.sources.checks;
    if (guard) sources.push({ key: 'checks', label: 'Data checks', agency: '', state: guard.state === 'failed' ? 'failed' : 'ok', since: guard.since, note: guard.note });
    const failing = sources.filter((s) => s.state === 'failed');
    let state = 'ok';
    if (running) state = 'updating';
    else if (done[0] && done[0].conclusion === 'failure') state = 'failed';
    else if (failing.length) state = 'partial';
    else if (gh && lastOk && (now - new Date(lastOk.updated)) / 3.6e6 > j.max_age_hours) state = 'late';
    else if (!st) state = 'unknown';
    return {
      id, ...j, state, sources, failing,
      running: running || null,
      lastRun: done[0] || null,
      lastOk: lastOk || null,
      changed: st && st.last_data_change ? st.last_data_change : null,
      next: nextRun(j.cron, new Date(now)),
      history: done.slice(0, 14).reverse().map((r) => ({ result: r.conclusion, when: r.updated, url: r.url, event: r.event })),
    };
  });

  const state = jobs.reduce((s, j) => (RANK[j.state] > RANK[s] ? j.state : s), jobs.length ? 'ok' : 'unknown');
  const latest = jobs.filter((j) => j.changed).sort((a, b) => new Date(b.changed) - new Date(a.changed))[0] || null;
  const name = (j) => j.name.charAt(0).toLowerCase() + j.name.slice(1);
  const of = (s) => jobs.filter((j) => j.state === s);
  let headline, detail;
  if (state === 'failed') {
    const f = of('failed');
    headline = f.length === 1 ? 'The last ' + name(f[0]) + ' update failed' : f.length + ' data updates failed';
    detail = 'The previous data stays on the site until the next run.';
  } else if (state === 'partial') {
    const n = jobs.reduce((k, j) => k + j.failing.length, 0);
    headline = n === 1 ? 'One source is failing' : n + ' sources are failing';
    detail = 'The previous data from ' + (n === 1 ? 'it' : 'them') + ' stays on the site; everything else is up to date.';
  } else if (state === 'updating') {
    const u = of('updating');
    headline = 'Updating ' + list(u.map(name)) + ' now';
    detail = 'New data appears on the site a minute or two after the update finishes.';
  } else if (state === 'late') {
    const l = of('late');
    headline = list(l.map((j, k) => (k ? name(j) : j.name))) + (l.length === 1 ? ' is' : ' are') + ' running late';
    detail = 'GitHub sometimes starts scheduled runs hours late; the data shown is the latest saved.';
  } else if (state === 'ok') {
    headline = 'All data is up to date';
    detail = latest ? 'Latest new data: ' + latest.name.toLowerCase() + ', ' + ago(latest.changed, now) + '.' : '';
  } else {
    headline = 'Live data status unavailable';
    detail = 'The status could not be read just now.';
  }
  // runs: every run in view, newest first (the control room's timing table); cfg: dev/data_jobs.json as read
  return { jobs, state, headline, detail, latest, api: !!gh, checked: gh ? gh.t : now, runs: all, cfg };
}
