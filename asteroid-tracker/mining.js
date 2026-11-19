// NASA and ESA Data Projects · Asteroid Tracker · within reach (mining.html) · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Lists every asteroid in NASA/JPL's NHATS study (data/reach.json), cheapest round trip first, with its measured
// spectral type where the Small-Body Database has one (data/phys.json). The rules for reach, material and the verdict
// are in reach.js.

import { fmt } from '../shared/nasa.js';
import { reloadPage } from '../shared/reload.js?v=2026111904';
import { loadReach, loadPhys, forgetReach, typeOf, sizeOf, sizeText, pageOf, nhatsPage, TYPE_FILTERS, MISSIONS } from './reach.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const PAGE = 50;
const st = { rows: null, type: 'all', size: 0, dv: 12, q: '', sort: 'dv', dir: 1, shown: PAGE };
const monthText = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-CA', { month: 'short', year: 'numeric', timeZone: 'UTC' });

function tiles(list) {
  $('#tiles').innerHTML = list.map((t) => `<div class="tile"><div class="label">${t.label}</div><div class="value">${t.value}</div><div class="note">${t.note}</div></div>`).join('');
}

// resolves true when the list was read (for the reload button)
async function load(again = false) {
  if (!again || !st.rows) tiles(['On the list', 'Cheapest trip', 'Type measured', '100 m or more'].map((label) => ({ label, value: '…', note: 'loading' })));
  let reach, phys;
  try {
    [reach, phys] = await Promise.all([loadReach(), loadPhys().catch(() => ({ byDes: new Map() }))]);
  } catch (e) {
    if (again && st.rows) return false;   // a failed reload leaves the list on show
    tiles(['On the list', 'Cheapest trip', 'Type measured', '100 m or more'].map((label) => ({ label, value: '—', note: 'not loaded' })));
    $('#notice').innerHTML = `<div class="notice error" role="alert"><span class="t">The list of reachable asteroids could not be loaded (${esc(e.message)}). Check the connection, then try again.</span><button class="btn outline small" id="retry">Try again</button></div>`;
    $('#table tbody').innerHTML = '<tr><td colspan="6"><div class="empty">Nothing to show yet.</div></td></tr>';
    $('#retry').addEventListener('click', () => { forgetReach(); load(); });
    return false;
  }
  $('#notice').innerHTML = '';
  st.rows = reach.rows.map((r) => {
    const p = phys.byDes.get(r.des), type = typeOf(p), size = sizeOf(r, p);
    const w = (reach.windows[r.des] || [])[0] ? reach.windows[r.des].reduce((a, b) => (b.dv < a.dv ? b : a)) : null;
    return { r, p, type, size, launch: w ? w.launch : null, sizeSort: size ? size.best : 0, nameSort: r.name.replace(/^\d+\s+/, '') };
  });
  const first = st.rows[0], measured = st.rows.filter((x) => x.type.measured).length;
  tiles([
    { label: 'On the list', value: fmt(st.rows.length), note: 'near-Earth asteroids with a round trip of 12 km/s or less' },
    { label: 'Cheapest trip', value: `${fmt(first.r.dv, 1)} <small>km/s</small>`, note: `${esc(first.r.name)}, ${sizeText(first.size)} across` },
    { label: 'Type measured', value: fmt(measured), note: `${fmt(100 * measured / st.rows.length, measured / st.rows.length < 0.01 ? 1 : 0)}% of the list; most small asteroids have never been measured` },
    { label: '100 m or more', value: fmt(st.rows.filter((x) => x.size && x.size.max >= 100).length), note: 'big enough to be worth a mission' },
  ]);
  $('#updated').textContent = `NHATS list as of ${new Date(reach.updated).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.`;
  render();
  return true;
}

function filtered() {
  const q = st.q.trim().toLowerCase().replace(/[()]/g, '');
  return st.rows.filter((x) => (st.type === 'all' || x.type.filter === st.type)
    && (!st.size || (x.size && x.size.max >= st.size)) && x.r.dv <= st.dv
    && (!q || x.r.name.toLowerCase().replace(/[()]/g, '').includes(q) || x.r.des.toLowerCase() === q));
}
function sortKey(x) {
  return { name: x.nameSort, size: x.sizeSort, type: x.type.measured ? x.type.label : 'zz', dv: x.r.dv, dur: x.r.dur, launch: x.launch || '9999' }[st.sort];
}

function render() {
  const list = filtered().sort((a, b) => {
    const ka = sortKey(a), kb = sortKey(b);
    return (ka < kb ? -1 : ka > kb ? 1 : 0) * st.dir || a.r.dv - b.r.dv;
  });
  document.querySelectorAll('#table th[data-k]').forEach((th) => th.setAttribute('aria-sort', th.dataset.k === st.sort ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'));
  $('#count').textContent = `${fmt(list.length)} asteroid${list.length === 1 ? '' : 's'}`;
  if (!list.length) {
    $('#table tbody').innerHTML = '<tr><td colspan="6"><div class="empty">No asteroid on the list matches. Try a wider size, a higher round trip, or another name.</div></td></tr>';
  } else {
    $('#table tbody').innerHTML = list.slice(0, st.shown).map((x) => {
      const r = x.r, href = pageOf(r), ext = href.startsWith('http');
      const type = x.type.measured ? `${esc(x.type.label)} <span class="s">type ${esc(x.type.code)}</span>` : 'Unknown';
      const launch = x.launch ? monthText(x.launch) : `<a href="${nhatsPage(r.des)}" target="_blank" rel="noopener">JPL's page ›</a>`;
      return `<tr data-href="${esc(href)}"${ext ? ' data-ext="1"' : ''} tabindex="0"><td><a href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${esc(r.name)}</a></td>`
        + `<td class="num" data-label="Size"><span>${sizeText(x.size)}${x.size && !x.size.measured ? '<span class="s">from brightness</span>' : ''}</span></td>`
        + `<td data-label="Made of">${type}</td><td class="num" data-label="Round trip">${fmt(r.dv, 1)} km/s</td>`
        + `<td class="num" data-label="Trip length">${fmt(r.dur)} days</td><td data-label="Cheapest launch">${launch}</td></tr>`;
    }).join('');
  }
  const left = list.length - st.shown;
  $('#more').hidden = left <= 0;
  if (left > 0) $('#more').textContent = `Show ${fmt(Math.min(PAGE, left))} more`;
}

// ---------------------------------------------------------------- controls
$('#typeSeg').innerHTML = TYPE_FILTERS.map(([k, label]) => `<button type="button" aria-pressed="${k === 'all'}" data-type="${k}">${label}</button>`).join('');
$('#typeSeg').addEventListener('click', (e) => {
  const b = e.target.closest('[data-type]');
  if (!b) return;
  st.type = b.dataset.type; st.shown = PAGE;
  document.querySelectorAll('#typeSeg button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  if (st.rows) render();
});
$('#size').addEventListener('change', (e) => { st.size = Number(e.target.value); st.shown = PAGE; if (st.rows) render(); });
$('#dv').addEventListener('change', (e) => { st.dv = Number(e.target.value); st.shown = PAGE; if (st.rows) render(); });
$('#q').addEventListener('input', (e) => { st.q = e.target.value; st.shown = PAGE; if (st.rows) render(); });
document.querySelectorAll('#table th[data-k]').forEach((th) => {
  const go = () => { const k = th.dataset.k; st.dir = st.sort === k ? -st.dir : (k === 'size' ? -1 : 1); st.sort = k; st.shown = PAGE; if (st.rows) render(); };
  th.addEventListener('click', go);
  th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});
$('#more').addEventListener('click', () => { st.shown += PAGE; render(); });
$('#table tbody').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-href]');
  if (!tr || e.target.closest('a')) return;
  if (tr.dataset.ext) window.open(tr.dataset.href, '_blank', 'noopener'); else location.href = tr.dataset.href;
});
$('#table tbody').addEventListener('keydown', (e) => {
  const tr = e.target.closest('tr[data-href]');
  if (tr && e.key === 'Enter' && !e.target.closest('a')) tr.click();
});

$('#missions tbody').innerHTML = MISSIONS.map((m) => `<tr><td data-label="Mission">${esc(m.name)} <span class="badge ${m.badge}">${esc(m.agency)}</span></td>`
  + `<td data-label="Target">${m.des ? `<a href="object.html?id=${2000000 + Number(m.des)}">${esc(m.target)}</a>` : esc(m.target)}</td>`
  + `<td data-label="Type, size">${esc(m.type)}, ${esc(m.size)}</td><td data-label="What it did">${esc(m.did)}</td></tr>`).join('');

reloadPage($('#reloadAll'), () => { forgetReach(); return load(true); });
load();
