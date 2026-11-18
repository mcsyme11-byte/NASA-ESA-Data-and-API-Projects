// NASA and ESA Data Projects · Space Weather · hand-drawn SVG charts · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Each chart is drawn at its frame's real width (so text stays readable on phones) and redrawn on resize, like the
// Asteroid Tracker's charts. Colours are the theme's chart colours (docs/DESIGN.md): brass for flares, blue for CMEs,
// green, amber and copper for quiet, active and storm Kp. Shapes differ too (sticks, circles, triangles, bars), so
// colour is never the only difference. Marks show their details on hover, or on a tap on a touch screen.

const NS = 'http://www.w3.org/2000/svg';
const C = { brass: '#C0A062', bright: '#E2C88E', dim: '#7E6A45', blue: '#8AA9C9', green: '#8FB996', amber: '#D1A956',
  copper: '#C9784A', red: '#C9675A', muted: '#98A0AB', line: '#2A3446', ink: '#EDE6D3' };
const DAY = 864e5, HOUR = 36e5;

const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
};
const text = (parent, attrs, s) => { const t = el('text', attrs, parent); t.textContent = s; return t; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const utc = (ms, withDay = true) => new Date(ms).toLocaleString('en-CA', { timeZone: 'UTC', ...(withDay ? { month: 'short', day: 'numeric' } : {}), hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) + ' UTC';
const dayLabel = (ms) => new Date(ms).toLocaleDateString('en-CA', { timeZone: 'UTC', month: 'short', day: 'numeric' });

// ---- the tooltip: hover with a mouse, tap on a touch screen ----
const tip = () => document.getElementById('tip');
function place(e) {
  const t = tip();
  t.style.left = Math.max(8, Math.min(e.clientX + 14, innerWidth - t.offsetWidth - 8)) + 'px';
  t.style.top = Math.min(e.clientY + 14, innerHeight - t.offsetHeight - 8) + 'px';
}
function hoverTip(node, html) {
  node.classList.add('hit');
  const show = (e) => { const t = tip(); t.innerHTML = html; t.hidden = false; place(e); };
  node.addEventListener('pointermove', show);
  node.addEventListener('pointerdown', show);
  node.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') tip().hidden = true; });
}
export function hideTip() { const t = tip(); if (t) t.hidden = true; }
addEventListener('scroll', hideTip, { passive: true });
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.hit')) hideTip(); });

function frame(box, H, label) {
  const W = Math.max(300, Math.round(box.clientWidth || 600));
  box.innerHTML = '';
  const svg = el('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label }, box);
  return { svg, W, grid: el('g', { class: 'grid' }, svg) };
}
export function emptyBox(box, msg, cls = 'state') { box.innerHTML = `<p class="${cls}">${esc(msg)}</p>`; }
const hline = (g, x1, x2, y, dash) => el('line', { x1, x2, y1: y, y2: y, ...(dash ? { stroke: C.line, 'stroke-dasharray': '3 4' } : {}) }, g);

// ---- 1. the timeline: flares, CMEs and storms over the chosen days ----
export function timeline(box, ev, days, now = Date.now()) {
  const narrow = (box.clientWidth || 600) < 560;
  const H = narrow ? 400 : 430;
  const from = now - days * DAY;
  const f = ev.flares.filter((x) => x.t >= from), c = ev.cmes.filter((x) => x.t >= from);
  const s = ev.storms.filter((x) => x.t >= from), r = ev.runs.filter((x) => x.done >= from);
  const label = `${f.length} flares, ${c.length} coronal mass ejections and ${s.length} geomagnetic storms in the last ${days} days`;
  const { svg, W, grid } = frame(box, H, label);
  const L = narrow ? 34 : 46, Rr = W - 10, X = (ms) => L + (ms - from) / (now - from) * (Rr - L);
  // day lines and labels
  const stepDays = days <= 7 ? 1 : days <= 30 ? (narrow ? 10 : 7) : (narrow ? 20 : 14);
  const first = new Date(from); first.setUTCHours(0, 0, 0, 0);
  for (let d = first.getTime() + DAY, i = 0; d < now; d += DAY, i++) {
    if (i % stepDays) continue;
    el('line', { x1: X(d), x2: X(d), y1: 14, y2: H - 38 }, grid);
    text(svg, { x: X(d), y: H - 20, 'text-anchor': 'middle' }, dayLabel(d));
  }
  // flares: log flux from 10⁻⁶ (C) to 10⁻³ (X10), top band
  const top = 22, fb = 150, fy = (fl) => fb - (Math.log10(Math.max(fl, 1e-6)) + 6) / 3 * (fb - top);
  text(svg, { x: L, y: 12, class: 'axt' }, 'Solar flares · peak X-ray class');
  for (const [lab, fl] of [['C', 1e-6], ['M', 1e-5], ['X', 1e-4], ['X10', 1e-3]]) {
    hline(svg, L, Rr, fy(fl), true); text(svg, { x: L - 6, y: fy(fl) + 4, 'text-anchor': 'end' }, lab);
  }
  for (const x of f) {
    const col = x.cls[0] === 'X' ? C.bright : x.cls[0] === 'M' ? C.brass : C.dim;
    const g = el('g', {}, svg);
    el('line', { x1: X(x.t), x2: X(x.t), y1: fb, y2: fy(x.flux), stroke: col, 'stroke-width': 3 }, g);
    el('circle', { cx: X(x.t), cy: fy(x.flux), r: 4, fill: col }, g);
    el('rect', { x: X(x.t) - 7, y: fy(x.flux) - 7, width: 14, height: fb - fy(x.flux) + 7, fill: 'transparent' }, g);
    hoverTip(g, `<b>${esc(x.cls)} flare</b><br>Peak ${utc(x.t)}${x.region ? '<br>Sunspot region ' + x.region : ''}${x.loc ? ' · ' + esc(x.loc) : ''}`);
  }
  const big = f.reduce((a, x) => (!a || x.flux > a.flux ? x : a), null);
  if (big) text(svg, { x: Math.min(X(big.t) + 7, Rr - 4), y: fy(big.flux) - 6, 'text-anchor': X(big.t) > Rr - 140 ? 'end' : 'start' }, `${big.cls}, the strongest`);
  // CMEs: speed 0–2000 km/s, middle band
  const ct = 190, cb = 300, maxV = Math.max(1200, ...c.map((x) => x.speed)), cy = (v) => cb - Math.min(v, maxV) / maxV * (cb - ct);
  text(svg, { x: L, y: ct - 12, class: 'axt' }, 'Coronal mass ejections · speed (km/s)');
  for (const v of [0, 500, 1000, 1500, 2000, 2500, 3000].filter((v) => v <= maxV)) { hline(svg, L, Rr, cy(v), true); text(svg, { x: L - 6, y: cy(v) + 4, 'text-anchor': 'end' }, String(v)); }
  for (const x of c) {
    const half = Number.isFinite(x.half) ? x.half : 20;
    const n = el('circle', { cx: X(x.t), cy: cy(x.speed), r: (2 + half / 9).toFixed(1), fill: C.blue, 'fill-opacity': '.5', stroke: C.blue }, svg);
    hoverTip(n, `<b>CME, ${Math.round(x.speed)} km/s</b><br>${utc(x.t)}<br>Half-width ${Number.isFinite(x.half) ? Math.round(x.half) + '°' : 'not measured'}`
      + (Number.isFinite(x.lon) ? `<br>${Math.abs(x.lon) < 45 ? 'Facing Earth' : Math.abs(x.lon) > 90 ? 'Far side of the Sun' : 'Off to the side'}` : ''));
  }
  for (const x of r) {
    const g = el('path', { d: `M${X(x.done).toFixed(1)} ${cb + 6} l6 10 h-12z`, fill: C.brass }, svg);
    hoverTip(g, `<b>Model run, ${utc(x.done)}</b><br>${x.hit ? 'Expects the CME to hit Earth' : 'Expects a glancing blow'}${x.arrival ? '<br>Arrival about ' + utc(x.arrival) : ''}${x.kp ? `<br>Kp ${fmtKp(x.kp[0])}${x.kp[1] !== x.kp[0] ? ' to ' + fmtKp(x.kp[1]) : ''}` : ''}`);
  }
  // storms: Kp 5–9, bottom band
  const st = 340, sb = H - 38, sy = (kp) => sb - (Math.max(kp, 4) - 4) / 5 * (sb - st);
  text(svg, { x: L, y: st - 6, class: 'axt' }, 'Geomagnetic storms · highest Kp');
  for (const x of s) {
    const g = el('rect', { x: X(x.t) - 5, y: sy(x.kp), width: 10, height: sb - sy(x.kp), fill: x.kp >= 7 ? C.copper : C.amber }, svg);
    hoverTip(g, `<b>Storm, Kp ${fmtKp(x.kp)} (${gName(x.kp)})</b><br>From ${utc(x.t)}`);
  }
  if (!s.length) text(svg, { x: (L + Rr) / 2, y: sb - 6, 'text-anchor': 'middle', 'font-style': 'italic' }, 'No geomagnetic storm in this period');
  el('line', { x1: L, x2: Rr, y1: sb, y2: sb, stroke: C.line }, svg);
  return label;
}

// ---- 2. a 24-hour line (speed, Bz) ----
export function line24(box, pts, o) {
  const H = 230, now = Date.now(), from = now - 24 * HOUR;
  const { svg, W, grid } = frame(box, H, o.label);
  if (pts.length < 2) { emptyBox(box, o.empty); return; }
  const L = 46, Rr = W - 12, T = 18, B = 196;
  const vals = pts.map((p) => p[1]);
  let lo = o.lo, hi = o.hi;
  lo = Math.min(lo, Math.floor(Math.min(...vals) / o.tick) * o.tick); hi = Math.max(hi, Math.ceil(Math.max(...vals) / o.tick) * o.tick);
  const X = (ms) => L + (ms - from) / (now - from) * (Rr - L), Y = (v) => B - (v - lo) / (hi - lo) * (B - T);
  for (let v = lo; v <= hi + 1e-9; v += o.tick) { el('line', { x1: L, x2: Rr, y1: Y(v), y2: Y(v) }, grid); text(svg, { x: L - 6, y: Y(v) + 4, 'text-anchor': 'end' }, String(Math.round(v * 10) / 10)); }
  if (o.south) {
    el('rect', { x: L, y: Y(0), width: Rr - L, height: B - Y(0), fill: C.red, 'fill-opacity': '.07' }, svg);
    el('line', { x1: L, x2: Rr, y1: Y(0), y2: Y(0), stroke: C.muted }, svg);
    text(svg, { x: Rr - 4, y: B - 6, 'text-anchor': 'end' }, 'south: energy gets in');
    text(svg, { x: Rr - 4, y: T + 12, 'text-anchor': 'end' }, 'north: shielded');
  }
  // a gap of more than 30 minutes breaks the line
  let d = '';
  pts.forEach((p, i) => { d += (i && p[0] - pts[i - 1][0] <= 30 * 60e3 ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1); });
  el('path', { d, fill: 'none', stroke: o.colour, 'stroke-width': 2.2, 'stroke-linejoin': 'round' }, svg);
  const last = pts[pts.length - 1];
  el('circle', { cx: X(last[0]), cy: Y(last[1]), r: 4, fill: o.colour }, svg);
  for (let h = 0; h <= 24; h += 6) {
    const ms = from + h * HOUR;
    text(svg, { x: X(ms), y: 216, 'text-anchor': h === 0 ? 'start' : h === 24 ? 'end' : 'middle' }, h === 24 ? 'now' : new Date(ms).toISOString().slice(11, 16));
  }
  text(svg, { x: L, y: 10, class: 'axt' }, o.unit + ' · UTC');
  // one invisible strip per point for the tooltip
  const w = Math.max(2, (Rr - L) / 144);
  for (const p of pts) {
    const r = el('rect', { x: X(p[0]) - w / 2, y: T, width: w, height: B - T, fill: 'transparent' }, svg);
    hoverTip(r, `<b>${o.fmt(p[1])}</b><br>${utc(p[0], false)}`);
  }
}

// ---- 3. Kp bars, measured then forecast ----
export const fmtKp = (k) => {
  const w = Math.floor(k + 1e-6), f = k - w;
  return f > 0.5 ? `${w + 1}−` : f > 0.2 ? `${w}+` : `${w}`;
};
export const gName = (k) => (k >= 9 ? 'G5, extreme' : k >= 8 ? 'G4, severe' : k >= 7 ? 'G3, strong' : k >= 6 ? 'G2, moderate' : k >= 5 ? 'G1, minor' : k >= 4 ? 'active' : 'quiet');
export function kpBars(box, kp) {
  const narrow = (box.clientWidth || 600) < 560, H = 250;
  const label = 'Kp every 3 hours, measured for the last 7 days and forecast for the next days';
  const { svg, W, grid } = frame(box, H, label);
  if (!kp.length) { emptyBox(box, 'The Kp index could not be read just now.'); return; }
  const L = 30, Rr = W - 10, T = 16, B = 206, from = kp[0].t, to = kp[kp.length - 1].t + 3 * HOUR;
  const X = (ms) => L + (ms - from) / (to - from) * (Rr - L), Y = (v) => B - v / 9 * (B - T);
  for (let v = 0; v <= 9; v++) el('line', { x1: L, x2: Rr, y1: Y(v), y2: Y(v) }, grid);
  for (const v of [0, 3, 5, 7, 9]) text(svg, { x: L - 6, y: Y(v) + 4, 'text-anchor': 'end' }, String(v));
  el('line', { x1: L, x2: Rr, y1: Y(5), y2: Y(5), stroke: C.amber, 'stroke-dasharray': '5 4' }, svg);
  text(svg, { x: Rr, y: Y(5) - 6, 'text-anchor': 'end' }, 'Storm from Kp 5');
  const bw = (X(from + 3 * HOUR) - X(from));
  const nowX = X(Date.now());
  for (const k of kp) {
    const col = k.kp >= 5 ? C.copper : k.kp >= 4 ? C.amber : C.green;
    const r = el('rect', { x: X(k.t) + 1, y: Y(k.kp), width: Math.max(bw - 2, 1), height: Math.max(B - Y(k.kp), 1.5), fill: col, ...(k.kind === 'pred' ? { 'fill-opacity': '.35', stroke: col } : {}) }, svg);
    hoverTip(r, `<b>Kp ${fmtKp(k.kp)}</b> (${gName(k.kp)})<br>${utc(k.t)} to ${new Date(k.t + 3 * HOUR).toISOString().slice(11, 16)} UTC<br>${k.kind === 'pred' ? 'NOAA forecast' : 'Measured (GFZ)'}`);
  }
  if (nowX > L && nowX < Rr) { el('line', { x1: nowX, x2: nowX, y1: T, y2: B, stroke: C.ink, 'stroke-opacity': '.5' }, svg); text(svg, { x: nowX + 4, y: T + 8 }, 'now'); }
  const first = new Date(from); first.setUTCHours(0, 0, 0, 0);
  for (let d = first.getTime() + 86400e3, i = 0; d < to; d += 86400e3, i++) {
    if (narrow && i % 2) continue;
    text(svg, { x: X(d), y: 226, 'text-anchor': 'middle' }, dayLabel(d));
  }
  text(svg, { x: L, y: 10, class: 'axt' }, 'Kp · 3-hour blocks, UTC');
}

// ---- 4. since 2010: monthly counts from the archive (data/archive.json) ----
export function monthly(box, months) {
  const H = 300;
  const { svg, W, grid } = frame(box, H, 'Strong flares and geomagnetic storms each month since 2010');
  if (!months || !months.length) { emptyBox(box, 'The record since 2010 is not available yet.'); return; }
  const L = 34, Rr = W - 10, T = 22, B = 250, n = months.length, bw = (Rr - L) / n;
  const maxF = Math.max(5, ...months.map((m) => (m.M || 0) + (m.X || 0))), Y = (v) => B - v / maxF * (B - T);
  for (const v of [0, Math.round(maxF / 2), maxF]) { el('line', { x1: L, x2: Rr, y1: Y(v), y2: Y(v) }, grid); text(svg, { x: L - 6, y: Y(v) + 4, 'text-anchor': 'end' }, String(v)); }
  months.forEach((m, i) => {
    const x = L + i * bw, mm = m.M || 0, xx = m.X || 0;
    const g = el('g', {}, svg);
    if (mm) el('rect', { x, y: Y(mm), width: Math.max(bw - 0.6, 0.8), height: B - Y(mm), fill: C.brass }, g);
    if (xx) el('rect', { x, y: Y(mm + xx), width: Math.max(bw - 0.6, 0.8), height: Y(mm) - Y(mm + xx), fill: C.bright }, g);
    if (m.storms) el('circle', { cx: x + bw / 2, cy: B + 12, r: Math.min(2 + m.storms, 7), fill: (m.maxKp || 0) >= 7 ? C.copper : C.amber }, g);
    el('rect', { x, y: T, width: bw, height: B - T + 22, fill: 'transparent' }, g);
    hoverTip(g, `<b>${esc(m.m)}</b><br>${mm} M-class, ${xx} X-class flares<br>${m.cmes || 0} CMEs measured<br>${m.storms || 0} storms${m.maxKp ? ', highest Kp ' + fmtKp(m.maxKp) : ''}`);
  });
  for (let i = 0; i < n; i++) if (months[i].m.endsWith('-01') && Number(months[i].m.slice(0, 4)) % 2 === 0) text(svg, { x: L + i * bw, y: 288, 'text-anchor': 'middle' }, months[i].m.slice(0, 4));
  text(svg, { x: L, y: 12, class: 'axt' }, 'M and X flares each month · storms below');
}
