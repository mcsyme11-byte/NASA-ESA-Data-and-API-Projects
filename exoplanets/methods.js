// NASA and ESA Data Projects · Exoplanets · how planets are found (methods.html) · © 2026 Malcolm Syme ·
// mcsyme11@gmail.com
//
// The radial-velocity curve of 51 Pegasi and the microlensing event OGLE-2005-BLG-390 (data/series/), and the
// planets each method has found (data/planets.json).

import { fmt, sig, esc, PC_LY, M_JUP_EARTH, METHOD_NAMES, TIMING_CODES, loadPlanets, loadSeriesIndex, loadSeries, planetUrl, forgetPlanets, copiedText, COPY_FAILED } from './data.js';
import { reloadPage } from '../shared/reload.js?v=2026111908';
import { rvCurve, microCurve, microModel, emptyChart } from './charts.js';

const $ = (s) => document.querySelector(s);
const st = { rv: null, ml: null, span: 25 };
// where each event's planet showed, in days after the peak (OGLE-2005-BLG-390: Beaulieu et al. 2006, about ten days)
const BLIP = { 'OGLE-2005-BLG-390': [9.6, 10.4] };
const facts = (list) => list.map((f) => `<div class="f"><h4>${f.label}</h4><p>${f.value}${f.note ? ` · ${f.note}` : ''}</p></div>`).join('');
const failedParts = [];
function failed(what, e) {
  failedParts.push(what);
  const list = failedParts.length === 1 ? failedParts[0] : failedParts.map((x, i) => (i ? x[0].toLowerCase() + x.slice(1) : x)).slice(0, -1).join(', ') + ' and ' + failedParts[failedParts.length - 1].toLowerCase();
  $('#notice').innerHTML = `<div class="notice error" role="alert"><span class="t">${list} could not be loaded (${esc(e.message)}). Check the connection, then try again.</span><button class="btn outline small" type="button" id="retry">Try again</button></div>`;
  $('#retry').addEventListener('click', () => location.reload());
}
const row = (cells) => `<tr>${cells.map(([l, v, cls]) => `<td data-l="${l}"${cls ? ` class="${cls}"` : ''}>${v}</td>`).join('')}</tr>`;
const link = (p) => `<a href="${planetUrl(p.name)}">${esc(p.name)}</a>`;

async function measurements(planets) {
  let idx;
  try { idx = await loadSeriesIndex(); } catch (e) { emptyChart($('#rvChart'), 'Not loaded.'); microModel($('#mlChart')); failed('The measurements', e); return; }
  const has = (k) => idx.series.some((x) => x.key === k);
  // radial velocity, with the minimum mass worked out from the fitted wobble
  if (has('rv-51peg')) {
    try {
      const s = st.rv = await loadSeries('rv-51peg');
      rvCurve($('#rvChart'), s);
      $('#rvAside').textContent = `${fmt(s.points_total)} measurements over ${fmt(s.span_days / 365.25, 1)} years`;
      $('#rvCap').textContent = `${s.reference || 'Published velocities'}, from the NASA Exoplanet Archive's time series. The best-fitting wobble here is K = ${fmt(s.k_fitted, 1)} m/s; the archive gives ${fmt(s.k_archive, 1)} m/s. The measurements scatter around the curve by ${fmt(s.rms, 1)} m/s, from measurement error and the star's own surface motions.`;
      const p = planets && planets.byName.get(s.planet);
      const Ms = p && p.smass ? p.smass : 1.07, Pyr = s.period_d / 365.25;
      const mj = s.k_fitted / 28.4329 * Ms ** (2 / 3) * Pyr ** (1 / 3);
      $('#rvExample').innerHTML = `<b>Example, 51 Pegasi b,</b> from the wobble fitted above: K = ${fmt(s.k_fitted, 1)} m/s, P = ${fmt(s.period_d, 3)} days = ${sig(Pyr, 4)} years, and the star has ${sig(Ms, 3)} times the Sun's mass. ` +
        `<span class="sum">M<sub>p</sub> sin i = ${fmt(s.k_fitted, 1)} ÷ 28.4 × ${sig(Ms, 3)}<sup>2/3</sup> × ${sig(Pyr, 4)}<sup>1/3</sup> = ${fmt(s.k_fitted / 28.4329, 3)} × ${fmt(Ms ** (2 / 3), 3)} × ${fmt(Pyr ** (1 / 3), 3)} = <b>${fmt(mj, 2)} Jupiter masses</b></span>, ` +
        `about ${fmt(mj * M_JUP_EARTH)} Earths, at least. Its orbit takes only ${fmt(s.period_d, 1)} days: a giant planet closer to its star than Mercury is to the Sun, which nobody expected in 1995.`;
      $('#rvFacts').innerHTML = facts([
        { label: 'Wobble K', value: `${fmt(s.k_fitted, 1)} <small>m/s</small>`, note: 'fitted to these measurements' },
        { label: 'Minimum mass', value: `${fmt(mj, 2)} <small>Jupiters</small>`, note: `${fmt(mj * M_JUP_EARTH)} Earths` },
        { label: 'Year', value: `${fmt(s.period_d, 2)} <small>days</small>`, note: p && p.a ? `${sig(p.a, 2)} au from its star` : '' },
        { label: 'Distance', value: p && p.dist ? `${fmt(p.dist * PC_LY)} <small>light years</small>` : '—', note: 'in the constellation Pegasus' },
      ]);
    } catch (e) { emptyChart($('#rvChart'), 'These measurements could not be loaded.'); }
  } else emptyChart($('#rvChart'), 'No velocity measurements yet.');
  // microlensing
  if (has('microlensing')) {
    try {
      const s = st.ml = await loadSeries('microlensing');
      drawMl();
      $('#mlTitle').textContent = `The brightening of ${s.event}`;
      $('#mlAside').textContent = `${fmt(s.points_total)} measurements`;
      $('#mlCap').textContent = `${s.observatory ? s.observatory + ', ' : ''}from the NASA Exoplanet Archive's time series. Days are counted from the brightest measurement.`;
      $('#mlFacts').innerHTML = facts([
        { label: 'Brightening', value: `${fmt(Math.max(...s.points.map((x) => x[1])) - Math.min(...s.points.map((x) => x[1])), 1)} <small>mag</small>`, note: 'from the start of these measurements to the peak' },
        { label: 'Planet', value: '≈ 5.5 <small>Earths</small>', note: 'Beaulieu et al. (2006)' },
        { label: 'Distance', value: '≈ 21,500 <small>ly</small>', note: 'towards the centre of the galaxy' },
      ]);
    } catch (e) { microModel($('#mlChart')); }
  } else {
    microModel($('#mlChart'));
    $('#mlCap').textContent = 'The shape of a microlensing event with a planet, drawn from the standard lens formula (Paczyński 1986): a model, not a measurement.';
  }
}
function drawMl() {
  if (!st.ml) return;
  const b = BLIP[st.ml.event] || null;
  const view = st.span < 10 && b ? { from: b[0] - st.span, to: b[1] + st.span } : { from: -st.span, to: st.span };
  microCurve($('#mlChart'), st.ml, { ...view, blip: b });
}
$('#mlSpan').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  $('#mlSpan').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  st.span = +b.dataset.span;
  drawMl();
});

function lists(d) {
  const by = (codes) => d.list.filter((p) => codes.includes(p.method));
  const n = { rv: by(['R']).length, micro: by(['M']).length, imaging: by(['I']).length, astrometry: by(['A']).length, timing: by(TIMING_CODES).length };
  document.querySelectorAll('[data-count]').forEach((el) => { el.textContent = fmt(n[el.dataset.count]); });
  // direct imaging: the planets farthest from their stars on the sky
  const im = by(['I']).filter((p) => p.a && p.dist).map((p) => ({ p, th: p.a / p.dist })).sort((a, b) => b.th - a.th);
  $('#imTable tbody').innerHTML = im.slice(0, 8).map(({ p, th }) => row([['Planet', link(p)], ['Orbit', `${sig(p.a, 3)} au`, 'r'], ['Apart', `${sig(th, 2)}″`, 'r']])).join('')
    || '<tr><td colspan="3"><div class="empty">No planets with an orbit and a distance.</div></td></tr>';
  const hr = d.byName.get('HR 8799 e');
  $('#imExample').innerHTML = hr && hr.a && hr.dist ? `<b>Example, HR 8799 e:</b> <span class="sum">${sig(hr.a, 3)} au ÷ ${sig(hr.dist, 3)} pc = ${sig(hr.a / hr.dist, 2)}″</span>, about the width of a coin seen from 10 km away.` : '';
  // HR 8799's planets: the picture's worked example
  const hrs = (d.byHost.get('HR 8799') || []).filter((p) => p.a && p.dist).sort((a, b) => a.a - b.a);
  $('#hrTable tbody').innerHTML = hrs.map((p) => row([['Planet', link(p)], ['Orbit', `${sig(p.a, 3)} au`, 'r'],
    ['Apart on the sky', `${sig(p.a / p.dist, 2)}″`, 'r'], ['Mass', p.mass ? `${sig(p.mass / M_JUP_EARTH, 2)} Jupiters` : '—', 'r']])).join('')
    || '<tr><td colspan="4"><div class="empty">Not in the planet list.</div></td></tr>';
  if (hrs.length) $('#hrCap').textContent = `From the NASA Exoplanet Archive: HR 8799 is ${sig(hrs[0].dist, 3)} parsecs (${fmt(hrs[0].dist * PC_LY)} light years) away. An arcsecond (″) is 1/3,600 of a degree.`;
  // astrometry
  $('#asTable tbody').innerHTML = by(['A']).sort((a, b) => a.year - b.year).map((p) => row([['Planet', link(p)],
    ['Mass', p.mass ? `${sig(p.mass / M_JUP_EARTH, 2)} Jupiters` : '—', 'r'], ['Found', `${p.year}<span class="s">${esc(p.facility)}</span>`]])).join('')
    || '<tr><td colspan="3"><div class="empty">None yet.</div></td></tr>';
  const gaia = by(['A']).filter((p) => /gaia/i.test(p.facility || '')).length;
  if (gaia) $('#asAside').textContent = `${fmt(gaia)} of them by ESA's Gaia`;
  // timing, by kind
  const kinds = TIMING_CODES.map((c) => ({ c, list: by([c]).sort((a, b) => a.year - b.year) })).filter((k) => k.list.length);
  $('#tiTable tbody').innerHTML = kinds.map((k) => row([['Kind', esc(METHOD_NAMES[k.c])], ['Planets', fmt(k.list.length), 'r'],
    ['For example', `${link(k.list[0])}<span class="s">${k.list[0].year}</span>`]])).join('');
  $('#tiAside').textContent = `${fmt(n.timing)} planets`;
}

async function main() {
  let d = null;
  try { d = await loadPlanets(); lists(d); $('#copied').textContent = copiedText(d.updated); } catch (e) {
    for (const id of ['#imTable', '#asTable', '#tiTable']) $(`${id} tbody`).innerHTML = '<tr><td colspan="3"><div class="empty">The planet list could not be loaded.</div></td></tr>';
    $('#copied').textContent = COPY_FAILED;
    failed('The planet list', e);
  }
  measurements(d);
}
// the reload button: the weekly planet list again (the measurements are built by hand and do not change between
// builds); what is shown stays when the file cannot be read
reloadPage($('#reloadAll'), async () => {
  forgetPlanets();
  try {
    const d = await loadPlanets();
    lists(d);
    $('#copied').textContent = copiedText(d.updated);
    if (failedParts.length === 1 && failedParts[0] === 'The planet list') { failedParts.length = 0; $('#notice').innerHTML = ''; }
    return true;
  } catch (e) { return false; }
});
let rt;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (st.rv) rvCurve($('#rvChart'), st.rv); drawMl(); }, 150); });
main();
