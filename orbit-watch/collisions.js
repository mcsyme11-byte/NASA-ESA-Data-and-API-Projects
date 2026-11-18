// NASA and ESA Data Projects · Orbit Watch · Close calls and collisions · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// 1. The closest predicted passes (data/close.json, from CelesTrak SOCRATES Plus), each with a link that replays it on
//    the globe when both objects are on it.
// 2. The collision calculator, following the NASA standard breakup model (Johnson and others, 2001), as three rules:
//      ε = m_small · v² / (2 · m_big)                  (J/kg, v in m/s)
//      ε > 40 J/g: catastrophic, M = m_big + m_small;  otherwise M = m_small · v²  (v in km/s)
//      N(> L) = 0.1 · M^0.75 · L^−1.71                 (L in m)
// 3. A teaching model of the Kessler syndrome: one band of height, whole objects B and debris D, year by year:
//      collisions C = k · B · (B + D);  B += launches − removals − B/τ − C;  D += 800 · C − D/τ
//    with τ, the time the air takes to bring an object down by a factor e, set by the height. Not a forecast.
// 4. The biggest breakups so far (facts.json, from NASA's Orbital Debris Quarterly News).

import { $, $$, esc, load, fmt, big, utc, day, KINDS } from './common.js';


// ------------------------------------------------------------------ 1. close approaches
let close = null, order = 'byRange';
const kindLabel = (k) => (KINDS[k] ? KINDS[k].name : 'Object');
function closeTable() {
  const el = $('#owClose'), list = close[order];
  $('#owCloseTitle').textContent = order === 'byRange' ? `The ${list.length} closest passes` : `The ${list.length} passes most likely to hit`;
  if (!list.length) { el.innerHTML = '<p class="empty">No passes in this list this week.</p>'; return; }
  const dist = (km) => (km < 1 ? `${fmt(km * 1000)} m` : `${fmt(km, 2)} km`);
  const chance = (p) => (p > 0 ? `1 in ${fmt(Math.max(1, Math.round(1 / p)))}` : 'very small');
  const obj = (o) => `${esc(o.name || `Object ${o.id}`)}<span class="sub">${kindLabel(o.kind)} · ${o.id}</span>`;
  el.innerHTML = '<table class="table stack"><thead><tr><th>When</th><th>Object 1</th><th>Object 2</th><th class="r">Miss distance</th><th class="r">Speed between them</th><th class="r">Chance of hitting</th><th></th></tr></thead><tbody>'
    + list.map((p) => `<tr><td data-l="When">${utc(p.tca)}</td><td data-l="Object 1">${obj(p.a)}</td><td data-l="Object 2">${obj(p.b)}</td>`
      + `<td class="r" data-l="Miss distance">${dist(p.km)}</td><td class="r" data-l="Speed">${fmt(p.kms, 1)} km/s</td><td class="r" data-l="Chance">${chance(p.p)}</td>`
      + `<td class="r">${p.globe ? `<a class="btn outline small" href="tracker.html?pass=${p.a.id},${p.b.id}&amp;t=${p.tca}">Watch</a>` : ''}</td></tr>`).join('')
    + '</tbody></table>';
}
$$('#owOrder button').forEach((b) => b.addEventListener('click', () => {
  order = b.dataset.o; $$('#owOrder button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  if (close) closeTable();
}));
(async () => {
  const res = await load('data/close.json');
  if (!res.data) {
    $('#owClose').innerHTML = `<p class="empty">${res.missing ? 'The close approaches have not been copied to the site yet: they arrive with the next run of the data job.' : 'The close approaches could not be loaded. Check the connection and reload the page.'}</p>`;
    return;
  }
  close = res.data;
  $('#owCloseAside').textContent = `${fmt(close.screened)} passes within 5 km · copied ${utc(Date.parse(close.made))}`;
  closeTable();
})();

// ------------------------------------------------------------------ 2. the calculator
const sBig = $('#owBig'), sSmall = $('#owSmall'), sV = $('#owV');
const bigKg = () => 10 ** (sBig.value / 10000 * 4);                                   // 1 kg to 10 t
const SMALL_SPAN = 3 + Math.log10(4000);
const smallKg = () => 10 ** (-3 + sSmall.value / 10000 * SMALL_SPAN);                   // 1 g to 4 t
const setBig = (kg) => { sBig.value = Math.round(Math.log10(kg) / 4 * 10000); };
const setSmall = (kg) => { sSmall.value = Math.round((Math.log10(kg) + 3) / SMALL_SPAN * 10000); };
const kgText = (kg) => (kg >= 1000 ? `${fmt(kg / 1000, kg < 1e4 ? 1 : 0)} t` : kg >= 10 ? `${fmt(kg)} kg` : kg >= 1 ? `${fmt(kg, 1)} kg` : `${fmt(kg * 1000, kg < 0.01 ? 1 : 0)} g`);
const PRESETS = { 2009: [900, 560, 11.7], cube: [600, 4, 10], cm: [600, 0.0014, 10] };    // a 1 cm aluminium ball: 1.4 g
let cloudN = 0, cloudH = 0.17;
function calc() {
  let mb = bigKg(), ms = smallKg();
  if (ms > mb) [mb, ms] = [ms, mb];
  const v = +sV.value, eps = ms * (v * 1000) ** 2 / (2 * mb), epsG = eps / 1000, cat = epsG > 40;
  const M = cat ? mb + ms : ms * v * v, N = (L) => 0.1 * M ** 0.75 * L ** -1.71, E = 0.5 * ms * (v * 1000) ** 2;
  $('#owBigV').textContent = kgText(bigKg()); $('#owSmallV').textContent = kgText(smallKg());
  $('#owVV').textContent = `${fmt(v, 1)} km/s (${fmt(v * 3600)} km/h)`;
  const vd = $('#owVerdict');
  vd.className = `ow-verdict ${cat ? 'cat' : 'non'}`;
  vd.textContent = cat ? 'Catastrophic: both objects break apart' : 'Not catastrophic: a crater and a spray of pieces';
  $('#owEps').textContent = `ε = ${epsG >= 100 ? fmt(epsG) : fmt(epsG, epsG < 1 ? 3 : 1)} J/g · the line is 40 J/g`;
  const n10 = N(0.1), n1 = N(0.01);
  $('#owN10').textContent = n10 < 1 ? 'none' : big(Math.round(n10));
  $('#owN1').textContent = n1 < 1 ? 'none' : big(Math.round(n1));
  // energy: under 10 MJ, the car going as fast with the same energy; above, tonnes of TNT (4.184 GJ a tonne)
  if (E < 1e7) { $('#owE').innerHTML = `${fmt(E / 1000)} <small>kJ</small>`; $('#owELike').textContent = `as much as a 1-tonne car at ${fmt(Math.sqrt(2 * E / 1000) * 3.6)} km/h`; }
  else { $('#owE').innerHTML = `${fmt(E / 1e9, E < 1e10 ? 2 : 1)} <small>GJ</small>`; $('#owELike').textContent = `as much as ${fmt(E / 4.184e9, E < 4.184e10 ? 1 : 0)} tonnes of TNT`; }
  cloudN = Math.round(Math.min(1500, Math.max(0, n10))); drawCloud();
}
[sBig, sSmall, sV].forEach((s) => s.addEventListener('input', () => { $$('[data-p]').forEach((x) => x.setAttribute('aria-pressed', 'false')); calc(); }));
$$('[data-p]').forEach((b) => b.addEventListener('click', () => {
  $$('[data-p]').forEach((x) => x.setAttribute('aria-pressed', x === b));
  const [mb, ms, v] = PRESETS[b.dataset.p]; setBig(mb); setSmall(ms); sV.value = v; calc();
}));
$$('#owAfter button').forEach((b) => b.addEventListener('click', () => {
  $$('#owAfter button').forEach((x) => x.setAttribute('aria-pressed', x === b)); cloudH = +b.dataset.h; drawCloud();
}));

// The cloud, an illustration: pieces spread along the orbit as they drift apart (about 3° an hour for the spread of
// speeds in a collision), and after weeks the orbits themselves turn apart and the ring thickens.
function drawCloud() {
  const c = $('#owCloud'), b = c.getBoundingClientRect();
  if (!b.width) return;
  const dpr = Math.min(devicePixelRatio || 1, 2); c.width = b.width * dpr; c.height = b.height * dpr;
  const g = c.getContext('2d'), W = c.width, H = c.height, cx = W / 2, cy = H / 2, rx = W * 0.42, ry = H * 0.36;
  g.strokeStyle = 'rgba(138,169,201,.28)'; g.lineWidth = dpr; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 7); g.stroke();
  const eg = g.createRadialGradient(cx - ry * 0.15, cy - ry * 0.15, 2, cx, cy, ry * 0.45);
  eg.addColorStop(0, '#2c4a6b'); eg.addColorStop(1, '#14233a'); g.fillStyle = eg; g.beginPath(); g.arc(cx, cy, ry * 0.45, 0, 7); g.fill();
  let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647), nrm = () => Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(6.2832 * r());
  const spread = Math.min(Math.PI, 0.05 * cloudH), widen = Math.min(1, cloudH / 720) * 0.16;
  g.fillStyle = '#D1A956';
  for (let i = 0; i < cloudN; i++) {
    const a = -1.1 + (cloudH > 60 ? r() * 6.2832 : nrm() * spread), k = 1 + nrm() * (0.008 + widen);
    g.fillRect(cx + Math.cos(a) * rx * k - dpr, cy + Math.sin(a) * ry * k - dpr, 2 * dpr, 2 * dpr);
  }
  const label = cloudN ? `${fmt(cloudN)} pieces over 10 cm${cloudN >= 1500 ? ' (1,500 drawn)' : ''}${b.width > 520 ? ' · illustration, not to scale' : ''}` : 'No pieces over 10 cm';
  g.font = `${12.5 * dpr}px Georgia, "Times New Roman", serif`; g.lineWidth = 3.5 * dpr; g.strokeStyle = 'rgba(5,8,13,.92)'; g.fillStyle = '#E2C88E';
  g.strokeText(label, 10 * dpr, 20 * dpr); g.fillText(label, 10 * dpr, 20 * dpr);
}
new ResizeObserver(drawCloud).observe($('#owCloud'));
setBig(900); setSmall(560); sV.value = 11.7; calc();

// ------------------------------------------------------------------ 3. the Kessler teaching model
const TAU = { 400: 2, 550: 12, 800: 150 };               // years for the air to bring a population down by a factor e
let alt = 800;
const sL = $('#owL'), sR = $('#owR');
function model(L, R) {
  const tau = TAU[alt]; let B = 1500, D = 1500; const out = [];
  for (let y = 0; y <= 200; y++) {
    out.push(B + D);
    const col = 8e-9 * B * (B + D);
    B = Math.max(0, B + L - Math.min(R, B) - B / tau - col);
    D = Math.max(0, D + 800 * col - D / tau);
  }
  return out;
}
function kessler() {
  $('#owLV').textContent = `${sL.value} a year`; $('#owRV').textContent = `${sR.value} a year`;
  const svg = $('#owKess'), W = svg.clientWidth || 600, H = svg.clientHeight || 280, L = 56, R = 14, T = 10, B = 36;
  const a = model(+sL.value, +sR.value), z = model(0, 0), top = Math.max(...a.slice(0, 201), ...z);
  const max = top > 40000 ? 40000 : Math.max(5000, Math.ceil(top / 5000) * 5000), step = max / 4;
  const x = (i) => L + i / 200 * (W - L - R), y = (v) => H - B - Math.min(v, max) / max * (H - B - T);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let s = '<g class="grid">';
  for (let v = 0; v <= max; v += step) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  for (let yr = 0; yr <= 200; yr += 50) s += `<text x="${x(yr)}" y="${H - B + 16}" text-anchor="${yr ? (yr === 200 ? 'end' : 'middle') : 'start'}">${yr ? `+${yr}` : 'now'}</text>`;
  s += '</g>';
  const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  s += `<path d="${path(z)}" fill="none" stroke="var(--s3)" stroke-width="2" stroke-dasharray="5 4"/>`;
  s += `<path d="${path(a)}" fill="none" stroke="var(--s1)" stroke-width="2.4"/>`;
  s += `<text class="axt" x="${(W + L) / 2}" y="${H - 2}" text-anchor="middle">Years from now</text>`;
  svg.innerHTML = s;
  const end = a[200], start = a[0];
  $('#owKNote').textContent = end > 40000 ? 'runs away: off the top of the chart' : end > start * 1.5 ? `keeps growing: ${fmt(end)} after 200 years` : end < start * 0.7 ? `falls: ${fmt(end)} after 200 years` : `about level: ${fmt(end)} after 200 years`;
}
$$('#owAlt button').forEach((b) => b.addEventListener('click', () => {
  $$('#owAlt button').forEach((x) => x.setAttribute('aria-pressed', x === b)); alt = +b.dataset.a; kessler();
}));
[sL, sR].forEach((s) => s.addEventListener('input', kessler));
new ResizeObserver(kessler).observe($('#owKess'));

// ------------------------------------------------------------------ 4. past breakups
(async () => {
  const res = await load('facts.json');
  if (!res.data) { $('#owPast').innerHTML = '<p class="empty">This table could not be loaded. Check the connection and reload the page.</p>'; return; }
  const f = res.data;
  $('#owPast').innerHTML = '<table class="table stack"><thead><tr><th>Date</th><th>What broke up</th><th>What happened</th><th class="r">Height</th><th class="r">Pieces catalogued</th></tr></thead><tbody>'
    + f.events.map((e) => `<tr><td data-l="Date">${day(e.date)}</td><td data-l="Object">${esc(e.name)}</td><td data-l="What happened">${esc(e.what)}</td><td class="r" data-l="Height">${esc(e.km)} km</td><td class="r" data-l="Pieces">${fmt(e.catalogued)}</td></tr>`).join('')
    + '</tbody></table>';
  $('#owPastSrc').textContent = f.eventsSource;
})();
