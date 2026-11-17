// NASA and ESA Data Projects · How the data is collected · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Fills the data-collection page from the live data status (shared/datastatus.js): the status board, the figures, the
// day's schedule in the visitor's time zone and the list of what each job collects. Refreshed every 3 minutes while
// the page is open; the clocks on the board are kept current every second. Rules in docs/DATA-UPDATES.md.

import * as ds from '../shared/datastatus.js?v=2026111701';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)'];
const local = (d) => d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
let status = null;

function when(job) {
  if (job.state === 'updating') return ['Started', ds.ago(job.running.created)];
  return ['Last check', job.lastRun ? ds.ago(job.lastRun.updated) : status.api ? 'not in the latest runs' : 'unavailable'];
}

function renderBoard() {
  const s = status;
  const head = $('bhead');
  head.dataset.state = s.state;
  head.querySelector('.light').dataset.state = s.state;
  $('headline').textContent = s.headline;
  $('detail').textContent = s.detail || '';
  $('checked').textContent = s.api ? 'Status read ' + ds.ago(s.checked) : 'Run times unavailable just now; showing each job’s own record';
  if (!s.jobs.length) {
    $('jobs').innerHTML = '<li class="state small">The data jobs could not be read. Try again in a moment.</li>';
    return;
  }
  $('jobs').innerHTML = s.jobs.map((j) => {
    const [wl, wv] = when(j);
    const srcs = j.sources.map((x) => `<span class="srcstate" data-state="${x.state}" title="${esc(x.label + (x.agency ? ' · ' + x.agency : '') + ': ' + (x.state === 'failed' ? 'failing since ' + ds.ago(x.since) + (x.note ? ' (' + x.note + ')' : '') : x.state === 'ok' ? 'working' : 'no record yet'))}">${esc(x.label)}</span>`).join('');
    const ticks = j.history.map((h) => `<i data-r="${h.result}" title="${esc((h.result === 'success' ? 'Finished' : h.result === 'failure' ? 'Failed' : 'Cancelled') + ', ' + local(new Date(h.when)) + (h.event === 'schedule' ? '' : ' (started by hand or by a change)'))}"></i>`).join('')
      + (j.running ? '<i data-r="running" title="Running now"></i>' : '');
    return `<li class="job" data-state="${j.state}" data-job="${j.id}">
      <span class="light" data-state="${j.state}" aria-hidden="true"></span>
      <div><h3><a href="../${esc(j.href)}">${esc(j.name)}</a></h3>
        <p class="job-meta">${esc(j.project)} · ${esc(j.runs)}</p>
        <div class="job-srcs">${srcs}</div></div>
      <dl class="job-when">
        <dt>${wl}</dt><dd data-ago="${esc(j.state === 'updating' ? j.running.created : j.lastRun ? j.lastRun.updated : '')}">${esc(wv)}</dd>
        <dt>New data</dt><dd data-ago="${esc(j.changed || '')}">${j.changed ? esc(ds.ago(j.changed)) : 'none recorded yet'}</dd>
        <dt>Next run</dt><dd data-until="${j.next ? j.next.toISOString() : ''}" title="${j.next ? esc(local(j.next)) : ''}">${j.next ? esc(ds.until(j.next)) : '–'}</dd>
      </dl>
      <div class="job-side"><span class="job-state">${ds.WORDS[j.state]}</span>
        <div class="ticks" role="img" aria-label="${esc(ticksLabel(j))}">${ticks}</div></div>
    </li>`;
  }).join('');
}

function ticksLabel(j) {
  const n = j.history.length, bad = j.history.filter((h) => h.result === 'failure').length;
  return n ? `Latest ${n} runs: ${n - bad} finished, ${bad} failed` : 'No recent runs in view';
}

// the board's times, every second (the next run counts down)
function tick() {
  const now = Date.now();
  document.querySelectorAll('#jobs [data-ago]').forEach((el) => { if (el.dataset.ago) el.textContent = ds.ago(el.dataset.ago, now); });
  document.querySelectorAll('#jobs [data-until]').forEach((el) => {
    if (!el.dataset.until) return;
    const t = new Date(el.dataset.until).getTime();
    el.textContent = t > now ? ds.until(t, now) : 'due now';
  });
  if (status) $('checked').textContent = status.api ? 'Status read ' + ds.ago(status.checked, now) : $('checked').textContent;
}

function renderFigures() {
  const s = status;
  $('f-jobs').textContent = s.jobs.length || '–';
  $('f-src').textContent = s.jobs.reduce((k, j) => k + Object.keys(j.sources_cfg || {}).length, 0) || '–';
  const runs = s.jobs.flatMap((j) => j.history);
  if (s.api && runs.length) {
    const ok = runs.filter((r) => r.result === 'success').length;
    $('f-runs').textContent = runs.length;
    const first = runs.reduce((a, r) => Math.min(a, new Date(r.when).getTime()), Date.now());
    $('f-runs-n').textContent = 'since ' + new Date(first).toLocaleDateString([], { month: 'short', day: 'numeric' });
    $('f-ok').innerHTML = Math.round((100 * ok) / runs.length) + '<small>%</small>';
  } else {
    $('f-runs').textContent = '–'; $('f-ok').textContent = '–';
    $('f-runs-n').textContent = 'GitHub not reachable just now';
  }
}

// the day's schedule, drawn in the visitor's own time zone
function renderDay() {
  const svg = $('day');
  const daily = status.jobs.filter((j) => ds.dailyMinutes(j.cron).length);
  // drawn at the size it is shown, so the text stays 11 px on a phone as on a computer
  const W = Math.max(300, Math.round(svg.parentElement.clientWidth || 1000));
  const narrow = W < 560;
  const L = narrow ? 92 : 150, R = 14, T = narrow ? 16 : 26, ROW = narrow ? 34 : 40, H = T + daily.length * ROW + 30;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const off = -new Date().getTimezoneOffset();        // minutes east of UTC
  const span = W - L - R;
  const x = (m) => L + ((((m % 1440) + 1440) % 1440) / 1440) * span;
  let out = '<g class="grid">';
  for (let h = 0; h <= 24; h += 3) out += `<line x1="${L + (h / 24) * span}" x2="${L + (h / 24) * span}" y1="${T - 8}" y2="${H - 26}"/>`;
  out += '</g>';
  for (let h = 0; h < 24; h += narrow ? 6 : 3) {
    const label = new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric' });
    out += `<text x="${L + (h / 24) * span}" y="${H - 8}" text-anchor="middle">${esc(label)}</text>`;
  }
  daily.forEach((j, i) => {
    const y = T + i * ROW + ROW / 2;
    const c = SERIES[i % SERIES.length];
    const name = narrow ? j.name.replace(' data', '').replace('Astronaut photos', 'Astronaut') : j.name;
    out += `<text x="${L - 12}" y="${y + 4}" text-anchor="end">${esc(name)}</text>`;
    out += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="var(--line2)"/>`;
    for (const m of ds.dailyMinutes(j.cron)) {
      const lm = m + off;
      const t = new Date(); t.setHours(0, 0, 0, 0); t.setMinutes(lm);
      const lbl = t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const weekly = j.cron.some((c2) => !c2.trim().endsWith('*'));
      out += `<g><title>${esc(j.name + ': ' + lbl + (weekly ? ', ' + j.runs : ', every day'))}</title>`
        + `<circle cx="${x(lm)}" cy="${y}" r="9" fill="${c}" opacity=".2"/><circle cx="${x(lm)}" cy="${y}" r="5" fill="${c}"/>`
        + (narrow ? '' : `<text x="${x(lm)}" y="${y - 13}" text-anchor="middle">${esc(lbl)}</text>`) + '</g>';
    }
  });
  const now = new Date();
  const nx = x(now.getHours() * 60 + now.getMinutes());
  out += `<line x1="${nx}" x2="${nx}" y1="${T - 10}" y2="${H - 26}" stroke="var(--brass-bright)" stroke-width="1.5"/>`
    + `<circle cx="${nx}" cy="${T - 10}" r="3.5" fill="var(--brass-bright)"/>`;
  svg.innerHTML = out;
  // the key: each job's colour and its run times, which the narrow chart leaves out
  $('day-key').innerHTML = daily.map((j, i) => {
    const times = ds.dailyMinutes(j.cron).map((m) => { const t = new Date(); t.setHours(0, 0, 0, 0); t.setMinutes(m + off);
      return t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); });
    return `<span><i class="s${(i % 6) + 1}"></i>${esc(j.name)}: ${esc(times.join(' and '))}${j.cron.some((c2) => !c2.trim().endsWith('*')) ? ' (' + esc(j.runs) + ')' : ''}</span>`;
  }).join('');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  $('tzname').textContent = 'Times in your time zone' + (tz ? ' (' + tz.replace(/_/g, ' ') + ')' : '') + '.';
  const other = status.jobs.filter((j) => !daily.includes(j));
  $('day-note').textContent = other.length ? 'Not on a daily clock: ' + other.map((j) => j.name.toLowerCase() + ' (' + j.runs
    + (j.next ? ', next on ' + j.next.toLocaleDateString([], { month: 'long', day: 'numeric' }) : '') + ')').join('; ') + '.' : '';
}

function renderWhat() {
  $('what').innerHTML = status.jobs.map((j) => {
    const agencies = [...new Set(j.sources.flatMap((x) => (x.agency || '').split(/\s+and\s+/)).filter(Boolean))];
    const badges = agencies.map((a) => `<span class="badge${/^ESA/.test(a) ? ' esa' : /NASA/.test(a) ? ' nasa' : ''}">${esc(a)}</span>`).join('');
    return `<div class="s"><div class="n"><a href="../${esc(j.href)}">${esc(j.name)}</a><span class="badges">${badges}</span></div>
      <p class="d">${esc(j.about)}</p><p class="u">${esc(j.runs.charAt(0).toUpperCase() + j.runs.slice(1))}</p></div>`;
  }).join('');
}

async function refresh(fresh) {
  const btn = $('refresh');
  btn.disabled = true;
  try {
    status = await ds.load({ fresh });
    status.jobs.forEach((j) => { j.sources_cfg = j.sources.filter((x) => x.key !== 'checks').reduce((o, x) => (o[x.key] = x, o), {}); });
    renderBoard(); renderFigures(); renderDay(); renderWhat();
  } finally {
    btn.disabled = false;
  }
}

$('refresh').addEventListener('click', () => refresh(true));
refresh(false);
setInterval(tick, 1000);
setInterval(() => { if (!document.hidden) refresh(false); }, ds.REFRESH_MS);
setInterval(() => { if (status && !document.hidden) renderDay(); }, 60000);
let resized = 0;
addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(() => status && renderDay(), 150); }, { passive: true });
