// NASA and ESA Data Projects · Exoplanets · overview (index.html) · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// The counts (data/summary.json), the transit light curves (data/series/), the "Make a transit" box, the two charts of
// the whole catalogue and the nearest planets about Earth's size in the habitable zone (data/planets.json).

import { fmt, sig, esc, dateText, GROUPS, groupOf, METHOD_NAMES, PC_LY, R_EARTH_KM, R_SUN_KM,
  loadSummary, loadPlanets, loadSeriesIndex, loadSeries, planetUrl, sizeCell, forgetPlanets, copiedText, COPY_FAILED } from './data.js';
import { lightCurve, massPeriod, perYear, toyTransit, emptyChart, mark } from './charts.js';
import { reloadPage } from '../shared/reload.js?v=2026111907';

const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
const st = { series: [], pick: null, planets: null, summary: null };

function stats(list) {
  $('#stats').innerHTML = list.map((t) => `<div class="stat"><div class="label">${t.label}</div><div class="value">${t.value}</div><div class="note">${t.note}</div></div>`).join('');
}
const failedParts = [];
function failed(what, e) {
  failedParts.push(what);
  const list = failedParts.length === 1 ? failedParts[0] : failedParts.map((x, i) => (i ? x[0].toLowerCase() + x.slice(1) : x)).slice(0, -1).join(', ') + ' and ' + failedParts[failedParts.length - 1].toLowerCase();
  $('#notice').innerHTML = `<div class="notice error" role="alert"><span class="t">${list} could not be loaded (${esc(e.message)}). Check the connection, then try again.</span><button class="btn outline small" type="button" id="retry">Try again</button></div>`;
  $('#retry').addEventListener('click', () => location.reload());
}

// ---- the counts ----
// again: a reload by hand, which keeps what is shown when the file cannot be read
async function counts(again) {
  let s;
  try { s = await loadSummary(); } catch (e) {
    if (again) return false;
    $('#updated').textContent = COPY_FAILED;
    stats(['Confirmed planets', 'Found by transit', 'In the habitable zone', 'Nearest'].map((label) => ({ label, value: '—', note: 'not loaded' })));
    document.querySelectorAll('[data-count]').forEach((n) => { n.textContent = '—'; });
    failed('The planet counts', e);
    return false;
  }
  st.summary = s;
  const by = (codes) => codes.reduce((a, c) => a + (s.by_method[c] || 0), 0);
  const near = s.nearest;
  stats([
    { label: 'Confirmed planets', value: fmt(s.total), note: `in NASA's archive, ${dateText(s.updated)}` },
    { label: 'Found by transit', value: fmt(s.by_method.T || 0), note: `${fmt(100 * (s.by_method.T || 0) / s.total)}%: the star dims as a planet crosses it` },
    { label: 'In the habitable zone', value: fmt(s.hz.nasa), note: `by NASA's rule; ${fmt(s.hz.nasa_small)} of them about Earth's size` },
    { label: 'Nearest', value: `${sig(near.dist_pc * PC_LY, 2)} <small>light years</small>`, note: `${esc(near.name)}, ${fmt(near.dist_pc, 2)} parsecs` },
  ]);
  const n = { transit: by(['T']), rv: by(['R']), micro: by(['M']), imaging: by(['I']), astrometry: by(['A']), timing: by(['V', 'E', 'P', 'U']) };
  document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = fmt(n[el.dataset.count]); });
  const other = s.total - Object.values(n).reduce((a, b) => a + b, 0);
  if (other > 0) $('#otherCount').textContent = `${fmt(other)} more were found in other ways: by the light a planet reflects or blocks as it goes round (brightness changes along the orbit), or by the motion of the disc of gas around a young star.`;
  $('#updated').textContent = copiedText(s.updated);
  perYear($('#py'), s.years);
  st.years = s.years;
  return true;
}

// ---- the light curves ----
// The buttons are written in index.html, so nothing moves as the page loads; one whose light curve has not been built
// is taken away. Each telescope's own wording: who runs it, how its stretches of observation are named, where the
// files come from.
const PICK_LABEL = { 'hot-jupiter': 'A hot Jupiter' };
const SCOPES = {
  TESS: { agency: 'NASA', runs: ['sector (27-day stretch) of observations', 'sectors (27-day stretches) of observations'], from: 'from MAST at STScI', every: 2 },
  Kepler: { agency: 'NASA', runs: ['quarter (3-month stretch) of observations', 'quarters (3-month stretches) of observations'], from: 'from MAST at STScI', every: 30 },
  CHEOPS: { agency: 'ESA', runs: ['visit that caught a transit (a few hours to a day of watching the star)', 'visits that caught a transit (each a few hours to a day of watching the star)'], from: 'processed by the CHEOPS pipeline and served by DACE at the University of Geneva', every: 1 },
};
const scope = (s) => SCOPES[s.mission] || SCOPES.TESS;
const everyText = (s) => {
  const m = s.cadence_min || scope(s).every;
  return m < 1.5 ? (m < 0.75 ? `${fmt(Math.round(m * 60))} seconds` : 'minute') : `${fmt(Math.round(m))} minutes`;
};
async function curves() {
  let idx;
  try { idx = await loadSeriesIndex(); } catch (e) { emptyChart($('#lc'), 'The light curves could not be loaded.'); failed('The light curves', e); return; }
  st.series = idx.series.filter((x) => x.kind === 'transit');
  if (!st.series.length) { emptyChart($('#lc'), 'No light curves yet.'); return; }
  const built = new Map(st.series.map((x) => [x.key, x]));
  $('#lcPick').querySelectorAll('button[data-k]').forEach((b) => {
    const x = built.get(b.dataset.k);
    if (!x) { b.remove(); return; }
    b.textContent = PICK_LABEL[x.key] || (x.mission === 'CHEOPS' ? `${x.planet} (ESA's CHEOPS)` : x.planet);
  });
  $('#lcPick').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-k]'); if (!b) return;
    $('#lcPick').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    showCurve(b.dataset.k);
  });
  // the worked example always uses the smallest planet built (TOI-700 d when present)
  const small = st.series.find((x) => x.key === 'toi-700d') || st.series[st.series.length - 1];
  loadSeries(small.key).then(dipExample).catch(() => {});
  showCurve(st.series[0].key);
}
async function showCurve(key) {
  let s;
  try { s = await loadSeries(key); } catch (e) { emptyChart($('#lc'), 'This light curve could not be loaded.'); return; }
  st.pick = s;
  lightCurve($('#lc'), s);
  $('#lcTitle').textContent = `${s.star}: its brightness around ${s.planet}'s transits`;
  const sc = scope(s), every = everyText(s);
  $('#lcEvery').textContent = `single measurements, every ${every}`;
  $('#lcAside').textContent = `${fmt(s.transits)} transits, ${fmt(s.points_total)} measurements`;
  const ratio = s.star_radius_sun ? Math.sqrt(s.depth_measured) * s.star_radius_sun * R_SUN_KM / R_EARTH_KM : null;
  $('#lcCap').innerHTML = `${sc.agency} ${s.mission}, one measurement every ${every}, ` +
    `${fmt(s.files)} ${sc.runs[s.files === 1 ? 0 : 1]}, ${sc.from}. ` +
    `The dip measured here is ${sig(s.depth_measured * 100, 2)}%${s.depth_archive_pct ? `; the archive gives ${sig(s.depth_archive_pct, 3)}%` : ''}.` +
    (ratio ? ` With the star's radius, ${sig(s.star_radius_sun, 3)} Suns, that makes the planet about ${sig(ratio, 2)} times Earth's width (the archive: ${sig(s.radius_earth, 3)}).` : '') +
    ` ${fmt(s.points.length)} of the measurements are drawn as dots; the line averages all of them.`;
}
function dipExample(s) {
  const rStar = s.star_radius_sun * R_SUN_KM, d = s.depth_measured, rp = rStar * Math.sqrt(d);
  $('#dipExample').innerHTML = `<b>Example, ${esc(s.planet)}.</b> In the TESS light curve above, the dip measures δ = ${sig(d * 100, 2)}% (${sig(d, 2)}). ` +
    `Its star is ${sig(s.star_radius_sun, 3)} times the Sun's radius, ${fmt(Math.round(rStar / 100) * 100)} km. ` +
    `<span class="sum">R<sub>p</sub> = ${fmt(Math.round(rStar / 100) * 100)} × √${sig(d, 2)} = ${fmt(Math.round(rStar / 100) * 100)} × ${sig(Math.sqrt(d), 3)} ≈ ${fmt(Math.round(rp / 10) * 10)} km</span>, ` +
    `about <b>${sig(rp / R_EARTH_KM, 2)} times Earth's radius</b> (the archive's fitted value is ${sig(s.radius_earth, 3)}).`;
}

// ---- "Make a transit" ----
function toy() {
  const rp = +$('#toyPlanet [aria-pressed="true"]').dataset.r, rs = +$('#toyStar [aria-pressed="true"]').dataset.r;
  const d = (rp / rs) ** 2, dSun = (rp / R_SUN_KM) ** 2;
  $('#toyDip').innerHTML = `${sig(d * 100, 2)}<small>%</small>`;
  $('#toyNote').textContent = rs === R_SUN_KM ? `${fmt(Math.round(d * 1e6))} parts in a million` : `${fmt(d / dSun, 1)} times deeper than in front of the Sun`;
  toyTransit($('#toy'), d);
}
for (const id of ['#toyPlanet', '#toyStar']) {
  $(id).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $(id).querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    toy();
  });
}

// ---- the catalogue ----
function keys() {
  const sw = (g) => `<svg class="mk" viewBox="-7 -7 14 14" aria-hidden="true"></svg>`;
  $('#mpKey').innerHTML = GROUPS.map((g) => `<span>${sw(g)}${g.label}</span>`).join('');
  [...$('#mpKey').querySelectorAll('svg')].forEach((s, i) => mark(s, GROUPS[i].shape, 0, 0, 4.5, { fill: GROUPS[i].col }));
  $('#pyKey').innerHTML = GROUPS.map((g) => `<span><i class="${g.sw}"></i>${g.label}</span>`).join('');
}
async function catalogue(again) {
  let d;
  try { d = await loadPlanets(); } catch (e) {
    if (again) return false;
    emptyChart($('#mp'), 'The planet list could not be loaded.');
    $('#near tbody').innerHTML = '<tr><td colspan="5"><div class="empty">The planet list could not be loaded.</div></td></tr>';
    failed('The planet list', e);
    return false;
  }
  st.planets = d.list;
  massPeriod($('#mp'), d.list);
  const n = d.list.filter((p) => p.period > 0 && p.mass > 0).length;
  $('#mpCap').textContent = `NASA Exoplanet Archive: the ${fmt(n)} confirmed planets with a known mass and period. Earth and Jupiter circled for comparison.`;
  const near = d.list.filter((p) => p.hz_nasa === 1 && p.small === 1 && p.dist).sort((a, b) => a.dist - b.dist).slice(0, 8);
  $('#near tbody').innerHTML = near.length ? near.map((p) => `<tr data-p="${esc(p.name)}">
      <td data-l="Planet"><a href="${planetUrl(p.name)}">${esc(p.name)}</a></td>
      <td data-l="Distance" class="r">${sig(p.dist * PC_LY, p.dist * PC_LY < 100 ? 2 : 3)} ly</td>
      <td data-l="Size (Earth = 1)" class="r">${sizeCell(p)}</td>
      <td data-l="Starlight (Earth = 1)" class="r">${sig(p.light, 2)}</td>
      <td data-l="Found by">${esc(METHOD_NAMES[p.method])}, ${p.year}</td></tr>`).join('')
    : '<tr><td colspan="5"><div class="empty">No planets match.</div></td></tr>';
  return true;
}
$('#near tbody').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-p]');
  if (tr && !e.target.closest('a')) location.href = planetUrl(tr.dataset.p);
});
// the reload button: the weekly copies again (the light curves are built by hand and do not change between builds)
reloadPage($('#reloadAll'), async () => {
  forgetPlanets();
  const ok = (await Promise.all([counts(true), catalogue(true)])).every(Boolean);
  if (ok) { failedParts.length = 0; $('#notice').innerHTML = ''; }
  return ok;
});

// ---- redraw at the new width ----
let rt;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    if (st.pick) lightCurve($('#lc'), st.pick);
    if (st.planets) massPeriod($('#mp'), st.planets);
    if (st.years) perYear($('#py'), st.years);
    toy();
  }, 150);
});

keys();
toy();
counts();
curves();
catalogue();
