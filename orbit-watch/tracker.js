// NASA and ESA Data Projects · Orbit Watch · What's in orbit · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// The globe: the Earth from shared/globe.js (NASA Blue Marble, turned to the time shown, night side shaded), with every
// object of data/objects.json drawn as a dot where SGP4 places it. The positions are worked out in a background worker
// (propagate.js) a few times a second; between two answers each dot moves along its velocity, which keeps the motion
// smooth at every speed. Directions follow shared/globe.js: x towards right ascension 0, y north; the Earth-centred
// position (x, y, z) in kilometres becomes (x, z, −y) / 6,371 in the scene, where the Earth has radius 1.
//
// Opened as tracker.html?pass=<catalogue number>,<catalogue number>&t=<time in ms>, from a close approach on the
// collisions page, it selects both objects and starts five minutes before their closest approach, ten times faster.
//
// Below the globe, data/heights.json (every object in the satellite catalogue) is drawn as a chart of heights and a
// table of the regions of Earth orbit.

import { THREE, gmst, createGlobe, bodyTexture, closeUp, GIBS_BLUE_MARBLE } from '../shared/globe.js';
import * as sat from '../shared/vendor/satellite.min.js';
import { $, $$, esc, load, fmt, utc, utcFull, ago, day, KINDS, CLOUDS } from './common.js';

const RE = 6371, MU = 398600.4418, R_EQ = 6378.137;
const frame = $('#owFrame'), host = $('#owGlobe'), over = $('#owOver'), octx = over.getContext('2d');
const tag = (html) => { $('#owTag').innerHTML = html; $('#owTag').hidden = !html; };

// ------------------------------------------------------------------ the globe
const G = createGlobe({ host, frame, night: true, minDistance: 1.15, maxDistance: 12 });
const { camera, controls, scene } = G;
const HOME0 = new THREE.Vector3(1.6, 1.4, 3.3);
/** The starting view: farther away on a narrow screen, so the whole low-orbit shell fits across. */
const home = () => HOME0.clone().multiplyScalar(Math.max(1, 1.05 / (camera.aspect || 1)));
controls.addEventListener('start', () => { G.fly = null; });
const sharper = closeUp(G, { url: GIBS_BLUE_MARBLE });
(async () => {
  const ok = await bodyTexture(G, GIBS_BLUE_MARBLE, { z: 2, cols: 5, rows: 3 });
  if (!ok) return;
  if (G.renderer.capabilities.maxTextureSize >= 5120) await bodyTexture(G, GIBS_BLUE_MARBLE, { z: 3, cols: 10, rows: 5 });
})();

// ------------------------------------------------------------------ time
let speed = 1, simBase = Date.now(), perfBase = performance.now();
const simNow = () => simBase + (performance.now() - perfBase) * speed;
function setSpeed(s) { simBase = simNow(); perfBase = performance.now(); speed = s; $$('#owSpeed button').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.s === s)); }
function setTime(t) { simBase = t; perfBase = performance.now(); ask(); }
$$('#owSpeed button').forEach((b) => b.addEventListener('click', () => setSpeed(+b.dataset.s)));
$('#owNow').addEventListener('click', () => { setTime(Date.now()); setSpeed(1); });

// ------------------------------------------------------------------ the objects
let D = null, n = 0, key = [], kind = [], pos = null, vel = null, tw = 0, busy = false;
const on = { w: true, m: true, fy: true, co: true, ir: true };
const F = {};                                                  // field name → column of a row
const worker = new Worker(new URL('propagate.js', import.meta.url), { type: 'module' });
worker.onmessage = (e) => {
  const m = e.data;
  if (m.ready != null) { ask(); return; }
  pos = m.pos; vel = m.vel; tw = m.t; busy = false;
  setTimeout(ask, 120);                                        // a few answers a second; the dots move on between them
};
function ask() { if (!D || busy) return; busy = true; worker.postMessage({ t: simNow() }); }

let pts = null, attr = null;
function makePoints() {
  const geo = new THREE.BufferGeometry(), col = new Float32Array(n * 3), c = new THREE.Color();
  attr = new THREE.BufferAttribute(new Float32Array(n * 3), 3); attr.setUsage(THREE.DynamicDrawUsage);
  for (let i = 0; i < n; i++) { c.set(KINDS[kind[i]].color); col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('position', attr); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);
  pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.95 }));
  scene.add(pts);
}

/** Where object i is at time t (ms), in the scene; false when it cannot be placed. */
function at(i, t, out) {
  if (!pos) return false;
  const k = i * 3, x = pos[k];
  if (!Number.isFinite(x)) return false;
  const dt = (t - tw) / 1000;
  out.set((x + vel[k] * dt) / RE, (pos[k + 2] + vel[k + 2] * dt) / RE, -(pos[k + 1] + vel[k + 1] * dt) / RE);
  return true;
}

function placeAll(t) {
  const a = attr.array, v = new THREE.Vector3(), fresh = Math.abs(t - tw) < 600e3;
  for (let i = 0; i < n; i++) {
    if (fresh && on[key[i]] && at(i, t, v)) { a[i * 3] = v.x; a[i * 3 + 1] = v.y; a[i * 3 + 2] = v.z; }
    else a[i * 3] = a[i * 3 + 1] = a[i * 3 + 2] = 0;          // at the Earth's centre: hidden by the Earth
  }
  attr.needsUpdate = true;
}

// ------------------------------------------------------------------ selection, the orbit line and the overlay
let sel = null, pair = null, passInfo = null;               // sel and pair: { i, rec, line, lineT }
const lineMat = [new THREE.LineBasicMaterial({ color: 0xE2C88E, transparent: true, opacity: 0.75 }),
  new THREE.LineBasicMaterial({ color: 0x8AA9C9, transparent: true, opacity: 0.6 })];

function recOf(i) {
  const r = D.o[i];
  try {
    const rec = sat.json2satrec({ OBJECT_NAME: r[F.name], OBJECT_ID: r[F.intl], EPOCH: new Date(r[F.epoch]).toISOString().replace('Z', ''),
      MEAN_MOTION: r[F.mm], ECCENTRICITY: r[F.ecc], INCLINATION: r[F.inc], RA_OF_ASC_NODE: r[F.raan], ARG_OF_PERICENTER: r[F.argp],
      MEAN_ANOMALY: r[F.ma], EPHEMERIS_TYPE: 0, CLASSIFICATION_TYPE: 'U', NORAD_CAT_ID: r[F.id], ELEMENT_SET_NO: 999, REV_AT_EPOCH: 0,
      BSTAR: r[F.bstar], MEAN_MOTION_DOT: r[F.mmdot], MEAN_MOTION_DDOT: r[F.mmddot] });
    return rec && !rec.error ? rec : null;
  } catch { return null; }
}
const eciAt = (rec, t) => { try { const p = sat.propagate(rec, new Date(t)); return p && p.position && Number.isFinite(p.position.x) ? p : null; } catch { return null; } };

function orbitLine(s, t, which) {
  if (s.line) { scene.remove(s.line); s.line.geometry.dispose(); }
  s.line = null; s.lineT = t;
  if (!s.rec) return;
  const per = 1440 / D.o[s.i][F.mm] * 60e3, p = [];
  for (let k = 0; k <= 160; k++) {
    const e = eciAt(s.rec, t + per * (k / 160 - 0.5));
    if (e) p.push(new THREE.Vector3(e.position.x / RE, e.position.z / RE, -e.position.y / RE));
  }
  if (p.length < 2) return;
  s.line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), lineMat[which]);
  scene.add(s.line);
}

function select(i, { fly = false, keepPair = false } = {}) {
  if (sel && sel.line) scene.remove(sel.line);
  if (!keepPair && pair) { if (pair.line) scene.remove(pair.line); pair = null; passInfo = null; }
  sel = i == null ? null : { i, rec: recOf(i) };
  if (sel) orbitLine(sel, simNow(), 0);
  card();
  if (sel && fly) flyToObj(i);
}
function flyToObj(i) {
  const v = new THREE.Vector3();
  if (at(i, simNow(), v)) G.flyTo(v.clone().normalize().multiplyScalar(Math.max(v.length() * 1.9, 2.2)));
}

const kindName = (i) => { const r = D.o[i], f = r[F.flag]; return CLOUDS[f] || KINDS[kind[i]].name; };
function rowsOf(i) {
  const r = D.o[i], mm = r[F.mm], ecc = r[F.ecc], nrad = mm * 2 * Math.PI / 86400, a = (MU / (nrad * nrad)) ** (1 / 3);
  const lo = a * (1 - ecc) - R_EQ, hi = a * (1 + ecc) - R_EQ, per = 1440 / mm;
  const out = [['Catalogue number', r[F.id]], ['International designator', r[F.intl] || '–']];
  if (r[F.owner]) out.push(['Owner', r[F.owner]]);
  if (r[F.launch]) out.push(['Launched', day(r[F.launch])]);
  out.push(['Height', Math.abs(hi - lo) < 20 ? `${fmt(lo)} km` : `${fmt(lo)} to ${fmt(hi)} km`],
    ['Tilt of the orbit', `${fmt(r[F.inc], 1)}°`],
    ['One lap', per < 180 ? `${fmt(per)} minutes` : `${fmt(per / 60, 1)} hours`],
    ['Speed now', '<span data-live="speed">–</span>'],
    ['Elements from', `${utc(r[F.epoch])} (${ago(r[F.epoch], simNow())})`]);
  return out;
}
function card() {
  const el = $('#owCard');
  if (!sel) { el.innerHTML = '<p class="caption">Tap a dot on the globe, or find an object by name, to see what it is, how high it flies and its orbit.</p>'; return; }
  const r = D.o[sel.i], k = kind[sel.i];
  let h = `<div class="kicker"><i class="ow-k ${k === 'm' ? 'm' : k}"></i> ${esc(kindName(sel.i))}</div><h3>${esc(r[F.name] || 'Unnamed object')}</h3>`;
  h += '<dl class="ow-rows">' + rowsOf(sel.i).map(([a, b]) => `<dt>${a}</dt><dd>${typeof b === 'string' && b.startsWith('<span') ? b : esc(b)}</dd>`).join('') + '</dl>';
  if (pair && passInfo) {
    const b = D.o[pair.i];
    h += `<p class="caption">Close approach with <b>${esc(b[F.name])}</b> (${esc(kindName(pair.i))}, blue line): predicted ${passInfo.km < 1 ? fmt(passInfo.km * 1000) + ' m' : fmt(passInfo.km, 2) + ' km'} apart at ${utc(passInfo.tca)}.</p>`;
    h += '<dl class="ow-rows"><dt>Distance now</dt><dd data-live="gap">–</dd></dl>';
  }
  h += '<div class="actions"><button class="btn small" type="button" id="owFly">Fly to it</button><button class="btn quiet small" type="button" id="owClear">Clear</button></div>';
  el.innerHTML = h;
  $('#owFly').addEventListener('click', () => flyToObj(sel.i));
  $('#owClear').addEventListener('click', () => select(null));
}
let lastLive = 0;
function live(t) {
  if (!sel || performance.now() - lastLive < 250) return;
  lastLive = performance.now();
  const sp = $('#owCard [data-live="speed"]');
  if (sp && vel && Number.isFinite(vel[sel.i * 3])) sp.textContent = `${fmt(Math.hypot(vel[sel.i * 3], vel[sel.i * 3 + 1], vel[sel.i * 3 + 2]), 2)} km/s`;
  const gp = $('#owCard [data-live="gap"]');
  if (gp && pair && sel.rec && pair.rec) {
    const a = eciAt(sel.rec, t), b = eciAt(pair.rec, t);
    if (a && b) { const d = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y, a.position.z - b.position.z); gp.textContent = d < 1 ? `${fmt(d * 1000)} m` : `${fmt(d, d < 100 ? 1 : 0)} km`; }
  }
}

/** True when the Earth stands between the camera and point p (the Earth: radius 1 at the centre). */
function hidden(p) {
  const c = camera.position, dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
  const a = dx * dx + dy * dy + dz * dz, b = 2 * (c.x * dx + c.y * dy + c.z * dz), cc = c.lengthSq() - 1, disc = b * b - 4 * a * cc;
  if (disc <= 0) return false;
  const s = (-b - Math.sqrt(disc)) / (2 * a);
  return s > 0 && s < 1;
}

function drawOver(t) {
  const dpr = Math.min(devicePixelRatio || 1, 2), W = frame.clientWidth, H = frame.clientHeight;
  if (over.width !== Math.round(W * dpr) || over.height !== Math.round(H * dpr)) { over.width = Math.round(W * dpr); over.height = Math.round(H * dpr); }
  octx.setTransform(dpr, 0, 0, dpr, 0, 0); octx.clearRect(0, 0, W, H);
  const mark = (s, color, label) => {
    const v = new THREE.Vector3();
    if (!s || !at(s.i, t, v) || hidden(v)) return;
    const q = G.toScreen(v); if (!q) return;
    octx.strokeStyle = color; octx.lineWidth = 1.6; octx.beginPath(); octx.arc(q[0], q[1], 9, 0, 7); octx.stroke();
    octx.fillStyle = color; octx.fillRect(q[0] - 2, q[1] - 2, 4, 4);
    octx.font = '13px Georgia, "Times New Roman", serif'; octx.lineWidth = 3.5; octx.strokeStyle = 'rgba(5,8,13,.92)';
    const x = q[0] + 13 + octx.measureText(label).width > W ? q[0] - 13 - octx.measureText(label).width : q[0] + 13;
    octx.strokeText(label, x, q[1] - 9); octx.fillText(label, x, q[1] - 9);
  };
  if (pair) mark(pair, '#8AA9C9', D.o[pair.i][F.name]);
  if (sel) mark(sel, '#E2C88E', D.o[sel.i][F.name]);
}

// picking: the nearest dot to a tap, within 14 px, not behind the Earth
function pick(x, y) {
  if (!pos) return;
  const t = simNow(), v = new THREE.Vector3(), W = frame.clientWidth, H = frame.clientHeight;
  let best = -1, bd = 14 * 14;
  for (let i = 0; i < n; i++) {
    if (!on[key[i]] || !at(i, t, v)) continue;
    const s = v.clone().project(camera);
    if (s.z > 1) continue;
    const px = (s.x + 1) / 2 * W, py = (1 - s.y) / 2 * H, d = (px - x) ** 2 + (py - y) ** 2;
    if (d < bd && !hidden(v)) { bd = d; best = i; }
  }
  if (best >= 0) select(best);
}
let down = null;
frame.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
frame.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || e.target.closest('button, .seg')) { down = null; return; }
  const b = frame.getBoundingClientRect(); pick(e.clientX - b.left, e.clientY - b.top); down = null;
});
frame.addEventListener('keydown', (e) => {
  if (e.target !== frame) return;
  if (e.key.startsWith('Arrow')) { G.turn(e.key); e.preventDefault(); }
  else if (e.key === '+' || e.key === '=') G.zoom(0.7);
  else if (e.key === '-' || e.key === '_') G.zoom(1.4);
  else if (e.key === 'Home') { G.flyTo(home()); e.preventDefault(); }
  else if (e.key === 'Escape') select(null);
});
$('#owIn').addEventListener('click', () => G.zoom(0.7));
$('#owOut').addEventListener('click', () => G.zoom(1.4));
$('#owHome').addEventListener('click', () => G.flyTo(home()));
$$('.ow-side [data-k]').forEach((c) => c.addEventListener('click', () => {
  const k = c.dataset.k; on[k] = !on[k]; c.setAttribute('aria-pressed', on[k]);
}));

// ------------------------------------------------------------------ find by name or number
const q = $('#owQ'), list = $('#owList');
let hits = [], cur = -1;
function suggest() {
  const s = q.value.trim().toUpperCase();
  hits = []; cur = -1;
  if (D && s.length >= 2) {
    const num = /^\d+$/.test(s);
    for (let i = 0; i < n && hits.length < 8; i++) {
      const r = D.o[i];
      if (num ? String(r[F.id]).startsWith(s) : String(r[F.name]).toUpperCase().includes(s)) hits.push(i);
    }
  }
  list.innerHTML = hits.map((i, k) => `<li role="option" id="owO${k}" data-i="${i}" aria-selected="false"><i class="ow-k ${kind[i]}"></i>${esc(D.o[i][F.name])}<small>${D.o[i][F.id]}</small></li>`).join('')
    || (s.length >= 2 && D ? '<li aria-disabled="true">Nothing on the globe by that name or number</li>' : '');
  list.hidden = !list.innerHTML; q.setAttribute('aria-expanded', !list.hidden);
}
function choose(i) { list.hidden = true; q.setAttribute('aria-expanded', 'false'); q.value = D.o[i][F.name]; if (!on[key[i]]) $(`.ow-side [data-k="${key[i]}"]`).click(); select(i, { fly: true }); }
q.addEventListener('input', suggest);
q.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    if (!hits.length) return; e.preventDefault();
    cur = (cur + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length;
    $$('li', list).forEach((li, k) => li.setAttribute('aria-selected', k === cur)); q.setAttribute('aria-activedescendant', `owO${cur}`);
  } else if (e.key === 'Enter' && hits.length) { e.preventDefault(); choose(hits[Math.max(0, cur)]); }
  else if (e.key === 'Escape') { list.hidden = true; }
});
list.addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) choose(+li.dataset.i); });

// ------------------------------------------------------------------ the loop
let running = true;
document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) requestAnimationFrame(loop); });
let lastTimeText = '';
function loop() {
  if (!running) return;
  const t = simNow();
  G.body.rotation.y = gmst(t);
  if (G.night) G.night.update(t);
  if (pts) placeAll(t);
  for (const [s, w] of [[sel, 0], [pair, 1]]) if (s && Math.abs(t - s.lineT) > 300e3) orbitLine(s, t, w);
  G.stepFly(); G.paceControls(); controls.update(); sharper();
  G.renderer.render(scene, camera);
  drawOver(t); live(t);
  const txt = utcFull(t);
  if (txt !== lastTimeText) { $('#owTime').textContent = speed === 1 && Math.abs(t - Date.now()) < 5e3 ? `Now · ${txt}` : txt; lastTimeText = txt; }
  $('#owNow').hidden = Math.abs(t - Date.now()) < 30e3 && speed === 1;
  requestAnimationFrame(loop);
}
const fit = () => G.resize();
new ResizeObserver(fit).observe(frame);
fit();
camera.position.copy(home());
requestAnimationFrame(loop);

// ------------------------------------------------------------------ data
(async () => {
  const res = await load('data/objects.json');
  if (!res.data) {
    tag(res.missing ? 'The orbit data has not been copied to the site yet: it arrives with the next run of the data job.'
      : 'The orbit data could not be loaded. Check the connection and reload the page.');
    $('#owUpd').textContent = 'Orbit data: not available yet.';
    return;
  }
  D = res.data; n = D.o.length;
  D.f.forEach((name, k) => { F[name] = k; });
  const counts = { w: 0, m: 0, fy: 0, co: 0, ir: 0 };
  for (let i = 0; i < n; i++) {
    const r = D.o[i], f = r[F.flag];
    kind[i] = f === 'mega' ? 'm' : r[F.kind];
    key[i] = f === 'mega' ? 'm' : CLOUDS[f] ? f : 'w';
    counts[key[i]]++;
  }
  for (const k in counts) { const el = $(`[data-n="${k}"]`); if (el) el.textContent = fmt(counts[k]); }
  const made = Date.parse(D.made);
  $('#owUpd').textContent = `${fmt(n)} objects · orbits copied from CelesTrak ${utc(made)} (${ago(made)})`;
  tag(`<strong>${fmt(n)}</strong> objects · drag to turn, tap a dot`);
  setTimeout(() => tag(''), 6000);
  makePoints();
  worker.postMessage({ rows: D.o, f: D.f });

  // a close approach opened from the collisions page
  const qp = new URLSearchParams(location.search), ids = (qp.get('pass') || '').split(',').map(Number), tca = +qp.get('t');
  if (ids.length === 2 && tca) {
    const ia = D.o.findIndex((r) => r[F.id] === ids[0]), ib = D.o.findIndex((r) => r[F.id] === ids[1]);
    if (ia >= 0 && ib >= 0) {
      const close = await load('data/close.json');
      const p = close.data && [...close.data.byRange, ...close.data.byProb].find((x) => x.a.id === ids[0] && x.b.id === ids[1]);
      passInfo = { tca, km: p ? p.km : NaN };
      pair = { i: ib, rec: recOf(ib) };
      setTime(tca - 5 * 60e3); setSpeed(10);
      select(ia, { keepPair: true });
      orbitLine(pair, simNow(), 1);
      setTimeout(() => flyToObj(ia), 400);
      tag(`Replaying a close approach: <strong>${esc(D.o[ia][F.name])}</strong> and <strong>${esc(D.o[ib][F.name])}</strong>, closest at ${utc(tca)}`);
    } else tag('One of the two objects of that close approach is not on the globe.');
  }
})();

// ------------------------------------------------------------------ the catalogue: heights and regions
const tip = Object.assign(document.createElement('div'), { className: 'tip', hidden: true });
document.body.append(tip);
let H = null;
function drawHeights() {
  const box = $('#owHeights'), W = box.clientWidth;
  if (!H || !W) return;
  const Ht = W < 560 ? 280 : 320, L = 46, R = 8, T = 10, B = 40, first = 2, bins = H.bins.slice(first);
  const tot = bins.map((b) => b.reduce((s, v) => s + v, 0)), top = Math.max(1, ...tot);
  const step = [1, 2, 2.5, 5, 10].map((m) => m * 10 ** Math.floor(Math.log10(top / 4))).find((s) => top / s <= 5);
  const max = Math.ceil(top / step) * step, bw = (W - L - R) / bins.length;
  const y = (v) => Ht - B - v / max * (Ht - B - T), cols = ['var(--s2)', 'var(--s5)', 'var(--s4)', 'var(--s6)', '#8b8577'];
  let s = `<svg class="chart" viewBox="0 0 ${W} ${Ht}" width="${W}" height="${Ht}" role="img" aria-label="Bar chart: objects in each 50 km band of height from 100 to 2,000 km, by kind"><g class="grid">`;
  for (let v = 0; v <= max; v += step) s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
  s += '</g>';
  const every = W < 560 ? 400 : 200;
  bins.forEach((b, k) => {
    const h0 = (k + first) * H.step, x = L + k * bw;
    let acc = 0, g = `<g class="bar" data-k="${k}">`;
    b.forEach((v, j) => { if (!v) return; g += `<rect x="${x + 1}" width="${Math.max(1, bw - 2)}" y="${y(acc + v)}" height="${y(acc) - y(acc + v)}" fill="${cols[j]}"/>`; acc += v; });
    g += `<rect x="${x}" width="${bw}" y="${T}" height="${Ht - B - T}" fill="transparent"/></g>`;
    s += g;
    if (h0 % every === 0) s += `<text x="${x}" y="${Ht - B + 16}" text-anchor="middle">${fmt(h0)}</text>`;
  });
  s += `<text x="${W - R}" y="${Ht - B + 16}" text-anchor="end">${fmt(2000)}</text>`;
  s += `<text class="axt" x="${(W + L) / 2}" y="${Ht - 4}" text-anchor="middle">Mean height above the ground, km</text></svg>`;
  box.innerHTML = s;
  const show = (e, g) => {
    const k = +g.dataset.k, b = bins[k], h0 = (k + first) * H.step;
    tip.innerHTML = `<b>${fmt(h0)} to ${fmt(h0 + H.step)} km</b><br>` + H.kinds.map((nm, j) => (b[j] ? `${nm}: ${fmt(b[j])}<br>` : '')).join('') + `All: ${fmt(tot[k])}`;
    tip.hidden = false;
    const tx = Math.min(innerWidth - tip.offsetWidth - 8, e.clientX + 14), ty = Math.max(8, e.clientY - tip.offsetHeight - 10);
    tip.style.left = `${tx}px`; tip.style.top = `${ty}px`;
  };
  $$('.bar', box).forEach((g) => {
    g.addEventListener('pointermove', (e) => show(e, g));
    g.addEventListener('pointerdown', (e) => show(e, g));
    g.addEventListener('pointerleave', () => { tip.hidden = true; });
  });
}
new ResizeObserver(drawHeights).observe($('#owHeights'));
addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

(async () => {
  const res = await load('data/heights.json');
  if (!res.data) {
    for (const el of [$('#owHeights'), $('#owRegions')]) {
      el.innerHTML = `<p class="empty">${res.missing ? 'The satellite catalogue has not been copied to the site yet: it arrives with the next run of the data job.' : 'The satellite catalogue could not be loaded. Check the connection and reload the page.'}</p>`;
    }
    $('#owHLegend').hidden = true;
    return;
  }
  H = res.data;
  const all = H.total.reduce((s, v) => s + v, 0);
  $('#owHAside').textContent = `${fmt(all)} objects in Earth orbit · catalogue copied ${utc(Date.parse(H.made))}`;
  if (H.total[4]) $('#owHLegend').insertAdjacentHTML('beforeend', '<span><i class="ow-k u"></i>Unknown</span>');
  drawHeights();
  const R = H.regions, rowsDef = [
    ['Low Earth orbit', 'under 2,000 km', R.low], ['Medium Earth orbit', '2,000 to 35,586 km: the navigation satellites', R.mid],
    ['Geostationary band', '35,786 km ± 200 km', R.geo], ['Higher', 'above 35,986 km', R.high],
    ['Coming down', 'under 100 km on average', R.below], ['Height not published', '', R.unknown]];
  let t = '<table class="table stack"><thead><tr><th>Region</th><th class="r">Working</th><th class="r">Dead</th><th class="r">Rocket bodies</th><th class="r">Debris</th><th class="r">All</th></tr></thead><tbody>';
  for (const [name, note, v] of rowsDef) {
    const sum = v.reduce((s, x) => s + x, 0);
    if (!sum) continue;
    t += `<tr><td>${name}${note ? `<span class="sub">${note}</span>` : ''}</td><td class="r" data-l="Working">${fmt(v[0])}</td><td class="r" data-l="Dead">${fmt(v[1])}</td><td class="r" data-l="Rocket bodies">${fmt(v[2])}</td><td class="r" data-l="Debris">${fmt(v[3] + v[4])}</td><td class="r" data-l="All">${fmt(sum)}</td></tr>`;
  }
  t += `<tr><td><b>All of Earth orbit</b></td><td class="r" data-l="Working">${fmt(H.total[0])}</td><td class="r" data-l="Dead">${fmt(H.total[1])}</td><td class="r" data-l="Rocket bodies">${fmt(H.total[2])}</td><td class="r" data-l="Debris">${fmt(H.total[3] + H.total[4])}</td><td class="r" data-l="All">${fmt(all)}</td></tr></tbody></table>`;
  $('#owRegions').innerHTML = t;
})();
