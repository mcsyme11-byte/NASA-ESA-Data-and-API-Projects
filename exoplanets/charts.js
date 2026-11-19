// NASA and ESA Data Projects · Exoplanets · hand-drawn SVG charts · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Each chart is drawn at its frame's real width (so text stays readable on phones) and redrawn on resize, as in the
// Asteroid Tracker. Colours and shapes follow docs/DESIGN.md: one colour and one shape per discovery method.

import { fmt, sig, esc, GROUPS, groupOf, METHOD_NAMES, zones, PC_LY } from './data.js';

const NS = 'http://www.w3.org/2000/svg';
const BRASS = '#C0A062', BRIGHT = '#E2C88E', BLUE = '#8AA9C9', GREEN = '#8FB996', INK = '#EDE6D3', MUTED = '#9AA3B2';

const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const text = (parent, attrs, s) => { const t = el('text', attrs, parent); t.textContent = s; return t; };
const label = (parent, attrs, s) => text(parent, { class: 'lab', ...attrs }, s);
const frameWidth = (svg) => Math.max(280, Math.round(svg.parentElement.clientWidth || 600));
function start(svg, W, H) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  return el('g', { class: 'grid' }, svg);
}
const yTitle = (svg, H, m, s) =>
  text(svg, { x: 14, y: (H - m.b + m.t) / 2, 'text-anchor': 'middle', class: 'axt', transform: `rotate(-90 14 ${(H - m.b + m.t) / 2})` }, s);
export function emptyChart(svg, msg) {
  const W = frameWidth(svg), H = 160;
  start(svg, W, H);
  text(svg, { x: W / 2, y: H / 2 + 4, 'text-anchor': 'middle', 'font-style': 'italic' }, msg);
}
/** "Nice" tick values covering [a, b]. */
function ticks(a, b, n = 5) {
  const step0 = (b - a) / n, mag = 10 ** Math.floor(Math.log10(step0)), r = step0 / mag;
  const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
  const out = [];
  for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

// ---- tooltip: hover with a mouse, tap on a touch screen ----
const tip = () => document.getElementById('tip');
function place(e) {
  const t = tip();
  t.style.left = Math.max(8, Math.min(e.clientX + 14, innerWidth - t.offsetWidth - 8)) + 'px';
  t.style.top = Math.min(e.clientY + 14, innerHeight - t.offsetHeight - 8) + 'px';
}
export function showTip(html, e) { const t = tip(); if (!t) return; t.innerHTML = html; t.hidden = false; place(e); }
export function hideTip() { const t = tip(); if (t) t.hidden = true; }
function hoverTip(node, html) {
  node.classList.add('hit');
  const show = (e) => showTip(typeof html === 'function' ? html() : html, e);
  node.addEventListener('pointermove', show);
  node.addEventListener('pointerdown', show);
  node.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideTip(); });
}
addEventListener('scroll', hideTip, { passive: true });
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.hit')) hideTip(); });

/** Tooltips for many points: the nearest point within reach of the pointer. */
function nearestTip(svg, pts, html, reach = 14) {
  svg.classList.add('hit');
  const find = (e) => {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, k = vb.width / r.width;
    const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
    let best = null, bd = (reach * k) ** 2;
    for (const p of pts) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p; } }
    return best;
  };
  const show = (e) => { const p = find(e); if (p) showTip(html(p), e); else if (e.pointerType === 'mouse') hideTip(); };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerdown', show);
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hideTip(); });
}

/** One point in a method's shape. */
export function mark(parent, shape, x, y, r, attrs = {}) {
  const a = { ...attrs };
  switch (shape) {
    case 'square': return el('rect', { x: x - r * 0.85, y: y - r * 0.85, width: r * 1.7, height: r * 1.7, ...a }, parent);
    case 'triangle': return el('path', { d: `M${x} ${y - r * 1.15}L${x + r} ${y + r * 0.7}L${x - r} ${y + r * 0.7}Z`, ...a }, parent);
    case 'diamond': return el('path', { d: `M${x} ${y - r * 1.2}L${x + r * 1.2} ${y}L${x} ${y + r * 1.2}L${x - r * 1.2} ${y}Z`, ...a }, parent);
    case 'star': {
      let d = '';
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.55 : r * 1.35;
        d += `${i ? 'L' : 'M'}${(x + rr * Math.cos(ang)).toFixed(1)} ${(y + rr * Math.sin(ang)).toFixed(1)}`;
      }
      return el('path', { d: d + 'Z', ...a }, parent);
    }
    case 'cross': return el('path', { d: `M${x - r} ${y - r}L${x + r} ${y + r}M${x + r} ${y - r}L${x - r} ${y + r}`, stroke: a.fill, 'stroke-width': 1.8, fill: 'none' }, parent);
    default: return el('circle', { cx: x, cy: y, r, ...a }, parent);
  }
}

// ---- 1. a folded transit light curve (series/<key>.json, kind "transit") ----
export function lightCurve(svg, s) {
  const W = frameWidth(svg), H = W < 600 ? 300 : 340, m = { l: W < 600 ? 62 : 70, r: 14, t: 26, b: 44 };
  const g = start(svg, W, H);
  const xs = s.bins.map((b) => b[0]), half = Math.max(...xs.map(Math.abs)) + (xs[1] - xs[0]) / 2;
  // the scale covers the averaged curve and most single measurements (1st to 99th percentile)
  const ys = s.points.map((p) => p[1]).sort((a, b) => a - b);
  const q = (f) => ys[Math.min(ys.length - 1, Math.max(0, Math.round(f * (ys.length - 1))))];
  const lo = Math.min(q(0.01), ...s.bins.map((b) => b[1])), hi = Math.max(q(0.99), 1);
  const pad = (hi - lo) * 0.08, ya = lo - pad, yb = hi + pad;
  const X = (h) => m.l + (h + half) / (2 * half) * (W - m.l - m.r);
  const Y = (f) => H - m.b - (f - ya) / (yb - ya) * (H - m.t - m.b);
  const pct = (yb - ya) * 100, dig = pct < 0.2 ? 3 : pct < 2 ? 2 : 1;
  const yt = ticks(ya, yb, 5), ydig = yt.length > 1 ? Math.max(0, -Math.floor(Math.log10((yt[1] - yt[0]) * 100) + 1e-9)) : dig;
  yt.forEach((v) => { el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, g); text(svg, { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end' }, fmt(v * 100, ydig) + '%'); });
  ticks(-half, half, W < 600 ? 4 : 8).forEach((v) => { el('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b }, g); text(svg, { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle' }, v === 0 ? '0' : (v > 0 ? '+' : '−') + fmt(Math.abs(v), Math.abs(v) < 1 ? 1 : 0) + ' h'); });
  text(svg, { x: (W + m.l) / 2, y: H - 8, 'text-anchor': 'middle', class: 'axt' }, W < 440 ? 'Hours from mid-transit' : 'Hours from the middle of the transit');
  yTitle(svg, H, m, 'Brightness');
  // single measurements
  const pg = el('g', { fill: BLUE, 'fill-opacity': 0.45 }, svg);
  for (const [h, f] of s.points) if (f >= ya && f <= yb) el('circle', { cx: X(h).toFixed(1), cy: Y(f).toFixed(1), r: W < 600 ? 1.3 : 1.6 }, pg);
  // the average, as a line with its bins as points
  el('polyline', { points: s.bins.map((b) => `${X(b[0]).toFixed(1)},${Y(b[1]).toFixed(1)}`).join(' '), fill: 'none', stroke: BRASS, 'stroke-width': 2.2 }, svg);
  const bg = el('g', {}, svg);
  for (const b of s.bins) {
    const d = el('circle', { cx: X(b[0]), cy: Y(b[1]), r: 3, fill: BRASS }, bg);
    hoverTip(d, `<b>${b[0] > 0 ? '+' : ''}${fmt(b[0], 2)} h</b><br>brightness ${fmt(b[1] * 100, 4)}%<br>± ${fmt(b[2] * 100, 4)}% (the average's uncertainty)`);
  }
  // the dip and the duration
  if (s.depth_measured > 0) {
    const xr = X(Math.min(half * 0.62, s.duration_h / 2 + (half - s.duration_h / 2) * 0.45));
    el('line', { x1: xr, x2: xr, y1: Y(1), y2: Y(1 - s.depth_measured), stroke: BRIGHT, 'stroke-dasharray': '3 3' }, svg);
    label(svg, { x: xr + 6, y: (Y(1) + Y(1 - s.depth_measured)) / 2 + 4 }, `dip ${sig(s.depth_measured * 100, 2)}%`);
  }
  const yd = H - m.b - 10;
  el('line', { x1: X(-s.duration_h / 2), x2: X(s.duration_h / 2), y1: yd, y2: yd, stroke: BRIGHT }, svg);
  label(svg, { x: X(0), y: yd - 6, 'text-anchor': 'middle' }, `transit lasts ${sig(s.duration_h, 2)} h`);
}

// ---- 2. a star's velocity folded on the planet's period (kind "rv") ----
export function rvCurve(svg, s) {
  const W = frameWidth(svg), H = W < 600 ? 290 : 330, m = { l: W < 600 ? 50 : 58, r: 14, t: 26, b: 44 };
  const g = start(svg, W, H);
  const P = s.period_d, vs = s.points.map((p) => p[1]);
  const lim = Math.max(s.k_fitted * 1.6, ...vs.map(Math.abs)) * 1.05;
  const X = (ph) => m.l + ph * (W - m.l - m.r);
  const Y = (v) => H - m.b - (v + lim) / (2 * lim) * (H - m.t - m.b);
  ticks(-lim, lim, 6).forEach((v) => { el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, g); text(svg, { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end' }, (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v))); });
  const days = ticks(0, P, W < 600 ? 4 : 8);
  days.forEach((d) => { el('line', { x1: X(d / P), x2: X(d / P), y1: m.t, y2: H - m.b }, g); text(svg, { x: X(d / P), y: H - m.b + 16, 'text-anchor': 'middle' }, fmt(d, d % 1 ? 1 : 0) + ' d'); });
  text(svg, { x: (W + m.l) / 2, y: H - 8, 'text-anchor': 'middle', class: 'axt' }, W < 420 ? `Days into its ${fmt(P, 2)}-day orbit` : `Days into the planet's ${fmt(P, 2)}-day orbit`);
  yTitle(svg, H, m, 'Star’s speed, m/s');
  label(svg, { x: m.l + 6, y: m.t - 8 }, '↑ moving away from us (redder)');
  label(svg, { x: m.l + 6, y: H - m.b - 8 }, '↓ moving towards us (bluer)');
  const pg = el('g', {}, svg);
  for (const [ph, v, e] of s.points) {
    const x = X(ph), y = Y(v);
    if (e) el('line', { x1: x, x2: x, y1: Y(v - e), y2: Y(v + e), stroke: BLUE, 'stroke-opacity': 0.5 }, pg);
    el('circle', { cx: x, cy: y, r: 2.4, fill: BLUE }, pg);
  }
  const curve = [];
  for (let i = 0; i <= 200; i++) curve.push(`${X(i / 200).toFixed(1)},${Y(s.k_fitted * Math.cos(2 * Math.PI * i / 200)).toFixed(1)}`);
  el('polyline', { points: curve.join(' '), fill: 'none', stroke: BRASS, 'stroke-width': 2.2 }, svg);
  el('line', { x1: X(0.5), x2: X(0.5), y1: Y(0), y2: Y(-s.k_fitted), stroke: BRIGHT, 'stroke-dasharray': '3 3' }, svg);
  label(svg, { x: X(0.5) + 6, y: Y(-s.k_fitted / 2) + 4 }, `K = ${fmt(s.k_fitted, 1)} m/s`);
  nearestTip(svg, s.points.map(([ph, v, e]) => ({ x: X(ph), y: Y(v), ph, v, e })),
    (p) => `<b>${fmt(p.ph * P, 2)} days into the orbit</b><br>${p.v > 0 ? '+' : '−'}${fmt(Math.abs(p.v), 1)} m/s${p.e ? ` ± ${fmt(p.e, 1)}` : ''}`);
}

// ---- 3. a microlensing event (kind "microlensing"), or the shape of one when no measurement was built ----
export function microCurve(svg, s, { from = -25, to = 25, blip = null } = {}) {
  const W = frameWidth(svg), H = W < 600 ? 290 : 330, m = { l: W < 600 ? 54 : 62, r: 14, t: 26, b: 44 };
  const g = start(svg, W, H);
  const lo = Math.max(from, Math.min(...s.points.map((p) => p[0])) - 0.5), hi = Math.min(to, Math.max(...s.points.map((p) => p[0])) + 0.5);
  const pts = s.points.filter((p) => p[0] >= lo && p[0] <= hi);
  if (!pts.length) return emptyChart(svg, 'No measurements in this stretch of time.');
  const mag = s.values === 'mag';
  const vals = pts.map((p) => p[1]);
  let a = Math.min(...vals), b = Math.max(...vals);
  const pad = (b - a) * 0.08; a -= pad; b += pad;
  const X = (t) => m.l + (t - lo) / (hi - lo) * (W - m.l - m.r);
  // magnitudes: smaller is brighter, so the scale is turned over to show brightening upwards
  const Y = (v) => (mag ? m.t + (v - a) / (b - a) * (H - m.t - m.b) : H - m.b - (v - a) / (b - a) * (H - m.t - m.b));
  ticks(a, b, 5).forEach((v) => { el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, g); text(svg, { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end' }, fmt(v, mag ? 1 : 0)); });
  if (blip && blip[1] > lo && blip[0] < hi) {
    const x1 = X(Math.max(lo, blip[0])), x2 = X(Math.min(hi, blip[1]));
    el('rect', { x: x1, y: m.t, width: Math.max(2, x2 - x1), height: H - m.t - m.b, fill: BRIGHT, 'fill-opacity': 0.12 }, svg);
    label(svg, { x: Math.min(x2 + 6, W - m.r - 4), y: m.t + 14, 'text-anchor': x2 + 110 > W - m.r ? 'end' : 'start' }, 'the planet’s blip');
  }
  ticks(lo, hi, W < 600 ? 4 : 8).forEach((v) => { el('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b }, g); text(svg, { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle' }, (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v)) + ' d'); });
  text(svg, { x: (W + m.l) / 2, y: H - 8, 'text-anchor': 'middle', class: 'axt' }, W < 420 ? 'Days from the peak' : 'Days from the brightest point');
  yTitle(svg, H, m, mag ? 'Brightness (magnitude)' : 'Brightness (flux)');
  const pg = el('g', { fill: GREEN }, svg);
  for (const [t, v, e] of pts) {
    if (e) el('line', { x1: X(t), x2: X(t), y1: Y(v - e), y2: Y(v + e), stroke: GREEN, 'stroke-opacity': 0.4 }, pg);
    el('circle', { cx: X(t), cy: Y(v), r: 2 }, pg);
  }
  nearestTip(svg, pts.map(([t, v, e]) => ({ x: X(t), y: Y(v), t, v, e })),
    (p) => `<b>${p.t > 0 ? '+' : p.t < 0 ? '−' : ''}${fmt(Math.abs(p.t), 2)} days</b><br>${mag ? 'magnitude' : 'flux'} ${fmt(p.v, mag ? 3 : 1)}${p.e ? ` ± ${fmt(p.e, mag ? 3 : 1)}` : ''}`);
}
/** The shape of a microlensing event (Paczyński 1986), with a planet's short extra brightening: a model, not data. */
export function microModel(svg) {
  const W = frameWidth(svg), H = W < 600 ? 260 : 300, m = { l: 54, r: 14, t: 26, b: 44 };
  const g = start(svg, W, H);
  const u0 = 0.15, tE = 20, A = (t) => { const u = Math.hypot(u0, t / tE); return (u * u + 2) / (u * Math.sqrt(u * u + 4)); };
  const bump = (t) => 1.6 * Math.exp(-(((t - 9) / 0.6) ** 2));
  const X = (t) => m.l + (t + 40) / 80 * (W - m.l - m.r), Y = (v) => H - m.b - (v - 0.8) / 7.4 * (H - m.t - m.b);
  [1, 3, 5, 7].forEach((v) => { el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, g); text(svg, { x: m.l - 8, y: Y(v) + 4, 'text-anchor': 'end' }, `${v}×`); });
  [-40, -20, 0, 20, 40].forEach((v) => { el('line', { x1: X(v), x2: X(v), y1: m.t, y2: H - m.b }, g); text(svg, { x: X(v), y: H - m.b + 16, 'text-anchor': 'middle' }, (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v) + ' d'); });
  text(svg, { x: (W + m.l) / 2, y: H - 8, 'text-anchor': 'middle', class: 'axt' }, W < 420 ? 'Days from the peak' : 'Days from the brightest point');
  yTitle(svg, H, m, 'Brightening');
  const star = [], planet = [];
  for (let i = 0; i <= 400; i++) { const t = -40 + i * 0.2; star.push(`${X(t).toFixed(1)},${Y(A(t)).toFixed(1)}`); planet.push(`${X(t).toFixed(1)},${Y(A(t) + bump(t)).toFixed(1)}`); }
  el('polyline', { points: planet.join(' '), fill: 'none', stroke: GREEN, 'stroke-width': 2.2 }, svg);
  el('polyline', { points: star.join(' '), fill: 'none', stroke: MUTED, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, svg);
  label(svg, { x: X(9) + 8, y: Y(A(9) + 1.6) }, 'the planet’s extra blip');
  label(svg, { x: X(-30), y: Y(A(-30)) - 10 }, 'the lens star alone');
}

// ---- 4. mass against year length, every planet with both, by method ----
export function massPeriod(svg, planets) {
  const list = planets.filter((p) => p.period > 0 && p.mass > 0);
  const W = frameWidth(svg), H = W < 600 ? Math.round(W * 0.95) : 400, m = { l: W < 600 ? 50 : 58, r: 14, t: 18, b: 46 };
  const g = start(svg, W, H);
  const xa = -1, xb = 7, ya = -1, yb = 4.5;
  const X = (v) => m.l + (Math.log10(v) - xa) / (xb - xa) * (W - m.l - m.r);
  const Y = (v) => H - m.b - (Math.log10(v) - ya) / (yb - ya) * (H - m.t - m.b);
  const dec = (e) => (e < 0 ? '0.' + '0'.repeat(-e - 1) + '1' : fmt(10 ** e));
  for (let e = xa; e <= xb; e++) { el('line', { x1: X(10 ** e), x2: X(10 ** e), y1: m.t, y2: H - m.b }, g); if (W >= 600 || e % 2 === 1) text(svg, { x: X(10 ** e), y: H - m.b + 16, 'text-anchor': 'middle' }, e >= 6 ? `10${'⁰¹²³⁴⁵⁶⁷'[e]}` : dec(e)); }
  for (let e = ya; e <= 4; e++) { el('line', { x1: m.l, x2: W - m.r, y1: Y(10 ** e), y2: Y(10 ** e) }, g); text(svg, { x: m.l - 6, y: Y(10 ** e) + 4, 'text-anchor': 'end' }, dec(e)); }
  text(svg, { x: (W + m.l) / 2, y: H - 8, 'text-anchor': 'middle', class: 'axt' }, W < 600 ? 'Year length, days' : 'Year length (orbital period), days');
  yTitle(svg, H, m, 'Mass, Earths');
  const r = W < 600 ? 2.2 : 2.7, pts = [];
  // the most common method first, so the rare ones sit on top
  for (const gr of GROUPS) {
    const gg = el('g', { 'fill-opacity': 0.8 }, svg);
    for (const p of list) {
      if (groupOf(p.method) !== gr) continue;
      const x = X(p.period), y = Y(p.mass);
      if (x < m.l || x > W - m.r || y < m.t || y > H - m.b) continue;
      mark(gg, gr.shape, +x.toFixed(1), +y.toFixed(1), r, { fill: gr.col });
      pts.push({ x, y, p });
    }
  }
  for (const [name, P, M] of [['Earth', 365.25, 1], ['Jupiter', 4332.6, 317.8]]) {
    el('circle', { cx: X(P), cy: Y(M), r: 6, fill: 'none', stroke: INK, 'stroke-width': 1.6 }, svg);
    label(svg, { x: X(P) + 9, y: Y(M) + 4 }, name);
  }
  nearestTip(svg, pts, ({ p }) => `<b>${esc(p.name)}</b><br>${METHOD_NAMES[p.method]}, ${p.year}<br>year: ${sig(p.period, 3)} days<br>mass: ${p.mass_kind === 'msini' ? 'at least ' : ''}${sig(p.mass, 3)} Earths`);
}

// ---- 5. planets confirmed each year, by method (stacked) ----
export function perYear(svg, years) {
  const W = frameWidth(svg), H = W < 600 ? 260 : 320, m = { l: 46, r: 10, t: 18, b: 40 };
  const g = start(svg, W, H);
  const ys = Object.keys(years).map(Number).sort((a, b) => a - b);
  const all = []; for (let y = ys[0]; y <= ys[ys.length - 1]; y++) all.push(y);
  const tot = (y) => Object.values(years[y] || {}).reduce((a, b) => a + b, 0);
  const top = Math.max(...all.map(tot)) * 1.06, bw = (W - m.l - m.r) / all.length;
  const Y = (v) => H - m.b - v / top * (H - m.t - m.b);
  ticks(0, top, 4).forEach((v) => { el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v) }, g); text(svg, { x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end' }, fmt(v)); });
  all.forEach((y, i) => {
    const grp = el('g', {}, svg);
    let acc = 0;
    const counts = {};
    for (const [code, n] of Object.entries(years[y] || {})) { const gr = groupOf(code); counts[gr.id] = (counts[gr.id] || 0) + n; }
    for (const gr of GROUPS) {
      const n = counts[gr.id]; if (!n) continue;
      el('rect', { x: m.l + i * bw + 0.5, y: Y(acc + n), width: Math.max(1, bw - 1), height: Y(acc) - Y(acc + n), fill: gr.col }, grp);
      acc += n;
    }
    el('rect', { x: m.l + i * bw, y: m.t, width: bw, height: H - m.t - m.b, fill: 'transparent' }, grp);
    hoverTip(grp, `<b>${y}: ${fmt(acc)} planets</b>` + GROUPS.filter((gr) => counts[gr.id]).map((gr) => `<br>${gr.label}: ${fmt(counts[gr.id])}`).join(''));
    if (y % (W < 600 ? 10 : 5) === 0) text(svg, { x: m.l + i * bw + bw / 2, y: H - m.b + 16, 'text-anchor': 'middle' }, y);
  });
  // the two years Kepler's statistics confirmed hundreds of planets at once
  for (const y of [2014, 2016]) if (tot(y)) label(svg, { x: m.l + (all.indexOf(y) + 0.5) * bw - 6, y: Y(tot(y)) + 4, 'text-anchor': 'end' }, `${y}: ${fmt(tot(y))}`);
}

// ---- 6. one planetary system to scale, with the habitable zone ----
export function system(svg, host, planets, pick) {
  const W = frameWidth(svg), H = W < 600 ? 170 : 190, m = { l: 26, r: 26, t: 30, b: 40 };
  const g = start(svg, W, H);
  const p0 = planets[0], z = zones(p0.teff, p0.slum);
  // each planet's orbit: the archive's, else from Kepler's third law (a³ = M P², au, years, Suns)
  const orbits = planets.map((p) => ({ p, a: p.a || (p.smass && p.period ? Math.cbrt(p.smass * (p.period / 365.25) ** 2) : null), worked: !p.a }))
    .filter((o) => o.a).sort((a, b) => a.a - b.a);
  if (!orbits.length) return emptyChart(svg, 'No orbit sizes known for this system.');
  const amax = Math.max(...orbits.map((o) => o.a), z.nasa.a_out && z.nasa.a_out < orbits[orbits.length - 1].a * 4 ? z.nasa.a_out : 0) * 1.12;
  const X = (a) => m.l + a / amax * (W - m.l - m.r), cy = m.t + (H - m.t - m.b) / 2;
  const tk = ticks(0, amax, W < 600 ? 3 : 5);
  el('line', { x1: m.l, x2: W - m.r, y1: H - m.b + 4, y2: H - m.b + 4 }, g);
  const dp = tk.length > 1 ? Math.max(0, -Math.floor(Math.log10(tk[1] - tk[0]) + 1e-9)) : 0;
  tk.forEach((v) => { el('line', { x1: X(v), x2: X(v), y1: H - m.b + 4, y2: H - m.b + 9 }, g); text(svg, { x: X(v), y: H - m.b + 22, 'text-anchor': 'middle' }, `${fmt(v, v ? dp : 0)} au`); });
  // the zone: NASA's rule as a band, the temperature-adjusted conservative zone as a dashed outline
  if (z.nasa.a_in) {
    const x1 = X(z.nasa.a_in), x2 = Math.min(X(z.nasa.a_out), W - m.r);
    if (x1 < W - m.r) {
      el('rect', { x: x1, y: m.t, width: x2 - x1, height: H - m.t - m.b, fill: GREEN, 'fill-opacity': 0.13 }, svg);
      label(svg, { x: Math.max(x1 + 4, Math.min((x1 + x2) / 2, W - m.r - 60)), y: m.t - 10, 'text-anchor': 'middle', fill: GREEN }, 'habitable zone');
    }
  }
  if (z.cons && z.cons.a_in && X(z.cons.a_in) < W - m.r) {
    const x1 = X(z.cons.a_in), x2 = Math.min(X(z.cons.a_out), W - m.r);
    el('rect', { x: x1, y: m.t + 6, width: x2 - x1, height: H - m.t - m.b - 12, fill: 'none', stroke: GREEN, 'stroke-dasharray': '4 4', 'stroke-opacity': 0.8 }, svg);
  }
  el('circle', { cx: m.l, cy, r: 9, fill: BRASS }, svg);
  for (const o of orbits) {
    const rr = o.p.radius ? Math.min(11, 3 + o.p.radius * 0.9) : 4.5, x = X(o.a);
    const grp = el('g', {}, svg);
    el('circle', { cx: x, cy, r: rr, fill: o.p === pick ? BRIGHT : INK, stroke: o.p === pick ? BRIGHT : 'none', 'stroke-width': 3, 'stroke-opacity': 0.35 }, grp);
    label(grp, { x, y: cy + rr + 15, 'text-anchor': 'middle' }, o.p.name.slice(host.length).trim() || o.p.name);
    el('circle', { cx: x, cy, r: 14, fill: 'transparent' }, grp);
    hoverTip(grp, `<b>${esc(o.p.name)}</b><br>${sig(o.a, 3)} au from its star${o.worked ? ' (worked out from its year)' : ''}<br>year: ${sig(o.p.period, 3)} days`);
  }
}

// ---- 7. "Make a transit": the dip a planet makes in front of a star ----
export function toyTransit(svg, depth) {
  const W = frameWidth(svg), H = 84, m = { l: 12, r: 12, t: 10, b: 10 };
  start(svg, W, H);
  const d = Math.min(depth, 0.012), scale = (H - m.t - m.b - 22) / 0.012;
  const xs = [m.l, W * 0.35, W * 0.4, W * 0.6, W * 0.65, W - m.r];
  const y0 = m.t + 4, y1 = y0 + d * scale;
  el('polyline', { points: `${xs[0]},${y0} ${xs[1]},${y0} ${xs[2]},${y1} ${xs[3]},${y1} ${xs[4]},${y0} ${xs[5]},${y0}`, fill: 'none', stroke: BRASS, 'stroke-width': 2.2 }, svg);
  label(svg, { x: W / 2, y: Math.max(y1 + 18, y0 + 18), 'text-anchor': 'middle' }, depth > 0.012 ? 'dip (not to scale: deeper still)' : 'dip, to scale');
}

export { frameWidth, PC_LY };

// ---- 8. where a star is in the sky: the bright stars within 30° of it (stereographic projection, north up, east
// to the left, as the sky looks from Earth) ----
const RAD = Math.PI / 180;
export function sepDeg(ra1, de1, ra2, de2) {
  const c = Math.sin(de1 * RAD) * Math.sin(de2 * RAD) + Math.cos(de1 * RAD) * Math.cos(de2 * RAD) * Math.cos((ra1 - ra2) * RAD);
  return Math.acos(Math.max(-1, Math.min(1, c))) / RAD;
}
export function skyChart(svg, star, stars, field = 30) {
  const W = Math.min(frameWidth(svg), 560), H = W, cx = W / 2, cy = H / 2, R = W / 2 - 6;
  start(svg, W, H);
  const d0 = star.dec * RAD, a0 = star.ra * RAD, scale = R / (2 * Math.tan(field * RAD / 2));
  const proj = (ra, de) => {
    const d = de * RAD, da = ra * RAD - a0;
    const k = 2 / (1 + Math.sin(d0) * Math.sin(d) + Math.cos(d0) * Math.cos(d) * Math.cos(da));
    const x = k * Math.cos(d) * Math.sin(da), y = k * (Math.cos(d0) * Math.sin(d) - Math.sin(d0) * Math.cos(d) * Math.cos(da));
    return [cx - x * scale, cy - y * scale];
  };
  el('circle', { cx, cy, r: R, fill: '#0B1019', stroke: '#2A3446' }, svg);
  // lines of declination every 10°, for a sense of north and south
  const grid = el('g', { fill: 'none', stroke: '#2A3446', 'stroke-dasharray': '2 4' }, svg);
  for (let dd = -80; dd <= 80; dd += 10) {
    if (Math.abs(dd - star.dec) > field + 10) continue;
    const pts = [];
    for (let ra = 0; ra <= 360; ra += 2) {
      if (sepDeg(ra, dd, star.ra, star.dec) > field) continue;
      pts.push(proj(ra, dd));
    }
    if (pts.length > 1) el('polyline', { points: pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ') }, grid);
  }
  const sg = el('g', { fill: INK }, svg);
  const named = [];
  for (const [ra, de, mag, name] of stars) {
    if (sepDeg(ra, de, star.ra, star.dec) > field) continue;
    const [x, y] = proj(ra, de);
    el('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: Math.max(0.8, 4.4 - 0.8 * mag).toFixed(2), 'fill-opacity': mag < 3 ? 1 : 0.75 }, sg);
    if (name) named.push([x, y, name]);
  }
  // labels never cover each other: the host's name first, then each star's name in the first free place around it
  const boxes = [];
  const free = (b) => !boxes.some((o) => b[0] < o[2] && o[0] < b[2] && b[1] < o[3] && o[1] < b[3]);
  const put = (tries, text, attrs, size) => {
    const w = text.length * size * 0.56;
    for (const [x, y, anchor] of tries) {
      const x0 = anchor === 'end' ? x - w : x;
      const b = [x0, y - size, x0 + w, y + 3];
      if (b[0] < 2 || b[2] > W - 2 || !free(b)) continue;
      boxes.push(b);
      label(svg, { x, y, 'text-anchor': anchor, ...attrs }, text);
      return;
    }
  };
  boxes.push([cx - 17, cy - 17, cx + 17, cy + 17]);
  put([[cx + 19, cy + 22, 'start'], [cx + 19, cy - 14, 'start'], [cx - 19, cy + 22, 'end'], [cx - 19, cy - 14, 'end']],
    star.host, { fill: BRIGHT }, 13);
  for (const [x, y, name] of named) {
    put([[x + 6, y - 5, 'start'], [x - 6, y - 5, 'end'], [x + 6, y + 14, 'start'], [x - 6, y + 14, 'end']],
      name, { 'font-size': 11 }, 11);
  }
  // the star, ringed
  el('circle', { cx, cy, r: 9, fill: 'none', stroke: BRIGHT, 'stroke-width': 2 }, svg);
  el('line', { x1: cx, x2: cx, y1: cy - 16, y2: cy - 11, stroke: BRIGHT, 'stroke-width': 2 }, svg);
  el('line', { x1: cx, x2: cx, y1: cy + 11, y2: cy + 16, stroke: BRIGHT, 'stroke-width': 2 }, svg);
  label(svg, { x: cx, y: 22, 'text-anchor': 'middle' }, 'north');
  label(svg, { x: 18, y: cy + 4 }, 'east');
  // a 10° bar: about the width of a fist at arm's length
  const bar = 10 * RAD * scale;
  el('line', { x1: W - 20 - bar, x2: W - 20, y1: H - 22, y2: H - 22, stroke: MUTED, 'stroke-width': 2 }, svg);
  label(svg, { x: W - 20 - bar / 2, y: H - 30, 'text-anchor': 'middle' }, '10°');
}
