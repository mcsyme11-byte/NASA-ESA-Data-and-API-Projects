// NASA and ESA Data Projects · Orbit Watch · What's in orbit · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Laid out like the Asteroid Tracker's solar system map: the globe in a map card, with the time and a search box over it,
// zoom and full-screen buttons, rows of controls under it (view, distance, time, kinds shown, well-known satellites)
// and, beside it, the Selected card and the legend. Pointing at a dot shows its name in a tooltip; tapping it selects it.
//
// The globe: the Earth from shared/globe.js (NASA Blue Marble, turned to the time shown, night side shaded), with every
// object of data/objects.json drawn as a dot where SGP4 places it. The positions are worked out in a background worker
// (propagate.js) a few times a second; between two answers each dot moves along its velocity, which keeps the motion
// smooth at every speed. Directions follow shared/globe.js: x towards right ascension 0, y north; the Earth-centred
// position (x, y, z) in kilometres becomes (x, z, −y) / 6,371 in the scene, where the Earth has radius 1.
//
// Addresses: tracker.html?pass=<catalogue number>,<catalogue number>&t=<ms> replays a close approach from the collisions
// page (both objects selected, five minutes before the closest moment, at ×10); "Share this view" writes
// tracker.html?view=1&sel=<catalogue number>&t=<ISO time, when not live>&cam=<x,y,z>&spd=<speed>.
//
// Below the globe, data/heights.json (every object in the satellite catalogue) is drawn as a chart of heights and a
// table of the regions of Earth orbit.

import { THREE, gmst, createGlobe, bodyTexture, closeUp, GIBS_BLUE_MARBLE } from '../shared/globe.js';
import * as sat from '../shared/vendor/satellite.min.js';
import { takeShared, linkWith, shareButton } from '../asteroid-tracker/share.js';
import { $, $$, esc, load, fmt, utc, ago, day, KINDS, CLOUDS } from './common.js';
import { reloadPage } from '../shared/reload.js?v=2026111814';

const RE = 6371, MU = 398600.4418, R_EQ = 6378.137;
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const two = (n) => String(n).padStart(2, '0');
const frame = $('#owFrame'), host = $('#owGlobe'), over = $('#owOver'), octx = over.getContext('2d'), tip = $('#owTip');
const banner = (html) => { $('#owBanner').innerHTML = html || ''; $('#owBanner').hidden = !html; };
const hintGone = () => $('#owHint').classList.add('gone');

// Well-known satellites: a button each under the globe, and the first three labelled on the globe.
const FAMOUS = [
  { id: 25544, name: 'International Space Station', short: 'Space station', pin: 'ISS',
    story: 'The crewed laboratory of the United States, Russia, Europe, Japan and Canada, with people on board since November 2000. It boosts itself now and then, or the air would bring it down within a few years.' },
  { id: 48274, name: 'Tiangong', short: 'Tiangong', pin: 'Tiangong',
    story: 'China\'s space station: its core module Tianhe, launched in 2021, with crews on board since then.' },
  { id: 20580, name: 'Hubble Space Telescope', short: 'Hubble', pin: 'Hubble',
    story: 'The NASA and ESA telescope launched in 1990. It has no engine of its own and is slowly sinking as the air drags on it.' },
  { id: 49260, name: 'Landsat 9', short: 'Landsat 9',
    story: 'NASA and the US Geological Survey\'s Earth-watching satellite, launched in 2021. Its polar orbit takes it over every place on Earth every 16 days.' },
  { id: 60989, name: 'Sentinel-2C', short: 'Sentinel-2C',
    story: 'One of the European Copernicus programme\'s land-watching satellites, launched in 2024, run by ESA.' },
  { id: 37846, name: 'Galileo (first satellite)', short: 'Galileo',
    story: 'The first satellite of Galileo, Europe\'s satellite navigation system, launched in 2011, about 23,000 km up.' },
  { id: 60133, name: 'GOES 19', short: 'GOES 19',
    story: 'A US weather satellite (NOAA and NASA) in geostationary orbit, 35,786 km up: it goes round once a day and so watches the same half of the Earth.' },
  { id: 54743, name: 'Meteosat-12', short: 'Meteosat-12',
    story: 'Europe\'s weather satellite over Europe and Africa (EUMETSAT, built with ESA), in geostationary orbit.' },
];

// ------------------------------------------------------------------ the globe
const G = createGlobe({ host, frame, night: true, minDistance: 1.15, maxDistance: 26 });
const { camera, controls, scene } = G;
const VIEWS = { pole: new THREE.Vector3(0.0001, 1, 0.12), tilt: new THREE.Vector3(1.6, 1.4, 3.3), side: new THREE.Vector3(1, 0.05, 3) };
let viewDir = 'tilt', viewR = 4.3;
/** A view at distance r, farther away on a narrow screen so the whole shell fits across. */
const viewAt = (v = viewDir, r = viewR) => VIEWS[v].clone().normalize().multiplyScalar(r * Math.max(1, 1.05 / (camera.aspect || 1)));
controls.addEventListener('start', () => { G.fly = null; following = false; syncFollow(); hintGone(); });
const sharper = closeUp(G, { url: GIBS_BLUE_MARBLE });
(async () => {
  const ok = await bodyTexture(G, GIBS_BLUE_MARBLE, { z: 2, cols: 5, rows: 3 });
  if (ok && G.renderer.capabilities.maxTextureSize >= 5120) await bodyTexture(G, GIBS_BLUE_MARBLE, { z: 3, cols: 10, rows: 5 });
})();

// ------------------------------------------------------------------ time
let speed = 1, playing = true, simBase = Date.now(), perfBase = performance.now();
// the dots are moved at most ten times a second while time runs at up to 60 times real speed (in a tenth of a second a
// satellite moves under a kilometre, far less than a pixel); faster, and after any change, they move every frame
let lastPlace = 0, lastRate = -1, placeNow = true;
const rate = () => (playing ? speed : 0);
const simNow = () => simBase + (performance.now() - perfBase) * rate();
const isLive = () => playing && speed === 1 && Math.abs(simNow() - Date.now()) < 5e3;
function rebase() { simBase = simNow(); perfBase = performance.now(); }
function setTime(t) { simBase = t; perfBase = performance.now(); placeNow = true; ask(); }
function setSpeed(s) { rebase(); speed = s; $('#owSpeed').value = String(s); }
function setPlaying(on) { rebase(); playing = on; $('#owPlay').setAttribute('aria-pressed', on); $('#owPlay').textContent = on ? '❚❚ Pause' : '▶ Play'; }
$('#owPlay').addEventListener('click', () => setPlaying(!playing));
$('#owSpeed').addEventListener('change', () => setSpeed(+$('#owSpeed').value));
$$('[data-step]').forEach((b) => b.addEventListener('click', () => setTime(simNow() + b.dataset.step * 1000)));
$('#owNow').addEventListener('click', () => { setSpeed(1); setPlaying(true); setTime(Date.now()); });

// ------------------------------------------------------------------ the objects
let D = null, n = 0, key = [], kind = [], pos = null, vel = null, tw = 0, busy = false, stale = false;
const on = { w: true, m: true, fy: true, co: true, ir: true };
const F = {};                                                  // field name → column of a row
const byId = new Map();                                        // catalogue number → row index
const worker = new Worker(new URL('propagate.js', import.meta.url), { type: 'module' });
worker.onmessage = (e) => {
  const m = e.data;
  if (m.ready != null) { stale = false; busy = false; ask(); return; }
  if (stale) { busy = false; return; }                         // an answer for the list before a reload
  pos = m.pos; vel = m.vel; tw = m.t; busy = false; placeNow = true;
  if ($('#owLoading')) { $('#owLoading').remove(); }
  setTimeout(ask, 120);                                        // a few answers a second; the dots move on between them
};
function ask() { if (!D || busy || stale) return; busy = true; worker.postMessage({ t: simNow() }); }

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

/** Where object i is at time t (ms), in the scene; false when it cannot be placed. Between two answers of the worker
 *  each object is moved round a circle through its last position, with its last velocity, at the angular rate of a
 *  circular orbit of that radius: p = cos(wΔt)·p0 + sin(wΔt)/w·v0, w = √(μ/r³). For the near-circular orbits of almost
 *  every satellite this stays within a few kilometres of SGP4 for several minutes, even at the fastest speed. */
function at(i, t, out) {
  if (!pos) return false;
  const k = i * 3, x = pos[k], y = pos[k + 1], z = pos[k + 2];
  if (!Number.isFinite(x) || Math.abs(t - tw) > 1800e3) return false;
  const dt = (t - tw) / 1000, r = Math.sqrt(x * x + y * y + z * z), w = Math.sqrt(MU / (r * r * r)), c = Math.cos(w * dt), sn = Math.sin(w * dt) / w;
  out.set((c * x + sn * vel[k]) / RE, (c * z + sn * vel[k + 2]) / RE, -(c * y + sn * vel[k + 1]) / RE);
  return true;
}
function placeAll(t) {
  const a = attr.array, v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    if (on[key[i]] && at(i, t, v)) { a[i * 3] = v.x; a[i * 3 + 1] = v.y; a[i * 3 + 2] = v.z; }
    else a[i * 3] = a[i * 3 + 1] = a[i * 3 + 2] = 0;          // at the Earth's centre: hidden by the Earth
  }
  attr.needsUpdate = true;
}

/** True when the Earth stands between the camera and point p (the Earth: radius 1 at the centre). */
function hidden(p) {
  const c = camera.position, dx = p.x - c.x, dy = p.y - c.y, dz = p.z - c.z;
  const a = dx * dx + dy * dy + dz * dz, b = 2 * (c.x * dx + c.y * dy + c.z * dz), cc = c.lengthSq() - 1, disc = b * b - 4 * a * cc;
  if (disc <= 0) return false;
  const s = (-b - Math.sqrt(disc)) / (2 * a);
  return s > 0 && s < 1;
}
/** The nearest visible dot to a point of the frame (px), within r px, or -1. */
function nearest(x, y, r) {
  if (!pos) return -1;
  const t = simNow(), v = new THREE.Vector3(), s = new THREE.Vector3(), W = frame.clientWidth, H = frame.clientHeight;
  let best = -1, bd = r * r;
  for (let i = 0; i < n; i++) {
    if (!on[key[i]] || !at(i, t, v)) continue;
    s.copy(v).project(camera);
    if (s.z > 1) continue;
    const dx = (s.x + 1) / 2 * W - x, dy = (1 - s.y) / 2 * H - y, d = dx * dx + dy * dy;
    if (d < bd && !hidden(v)) { bd = d; best = i; }
  }
  return best;
}

// ------------------------------------------------------------------ facts about one object
const kindName = (i) => CLOUDS[D.o[i][F.flag]] || KINDS[kind[i]].name;
const famousOf = (i) => FAMOUS.find((f) => f.id === D.o[i][F.id]);
const nameOf = (i) => { const f = famousOf(i); return f ? f.name : D.o[i][F.name] || `Object ${D.o[i][F.id]}`; };
function orbitOf(i) {
  const r = D.o[i], mm = r[F.mm], ecc = r[F.ecc], nrad = mm * 2 * Math.PI / 86400, a = (MU / (nrad * nrad)) ** (1 / 3);
  return { lo: a * (1 - ecc) - R_EQ, hi: a * (1 + ecc) - R_EQ, per: 1440 / mm, inc: r[F.inc] };
}
const heightText = (o) => (Math.abs(o.hi - o.lo) < 20 ? `${fmt(o.lo)} km` : `${fmt(o.lo)} to ${fmt(o.hi)} km`);
const lapText = (per) => (per < 180 ? `${fmt(per)} minutes` : `${fmt(per / 60, 1)} hours`);
function heightNow(i, t) { const v = new THREE.Vector3(); return at(i, t, v) ? v.length() * RE - RE : NaN; }
function speedNow(i) { return vel && Number.isFinite(vel[i * 3]) ? Math.hypot(vel[i * 3], vel[i * 3 + 1], vel[i * 3 + 2]) : NaN; }

// ------------------------------------------------------------------ selection, following and the orbit lines
let sel = null, pair = null, passInfo = null, following = false;     // sel and pair: { i, rec, line, lineT }
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
  if (!keepPair && pair) { if (pair.line) scene.remove(pair.line); pair = null; passInfo = null; banner(''); }
  sel = i == null || i < 0 ? null : { i, rec: recOf(i) };
  following = false;
  if (sel) { if (!on[key[i]]) toggleKind(key[i], true); orbitLine(sel, simNow(), 0); }
  card(); syncFamous();
  if (sel && fly) flyToObj(i);
}
function flyToObj(i) {
  const v = new THREE.Vector3();
  if (at(i, simNow(), v)) G.flyTo(v.clone().normalize().multiplyScalar(Math.max(v.length() * 1.9, 2.4)));
}
function syncFollow() { const b = $('#owFollow'); if (b) { b.setAttribute('aria-pressed', following); b.textContent = following ? 'Stop following' : 'Follow it'; } }

function card() {
  const el = $('#owSel');
  if (!sel) { el.innerHTML = '<p class="note">Point at a dot for its name, tap it for details, or use "Find a satellite".</p>'; return; }
  const i = sel.i, r = D.o[i], k = kind[i], o = orbitOf(i), fam = famousOf(i);
  let h = `<h3>${esc(nameOf(i))}</h3>`;
  h += `<p class="tags"><span class="tag"><i class="ow-k ${k}"></i> ${esc(kindName(i))}</span>${fam && fam.name !== r[F.name] ? `<span class="tag">${esc(r[F.name])}</span>` : ''}</p>`;
  if (fam) h += `<p class="story">${esc(fam.story)}</p>`;
  const rows = [['Height now', '<span data-live="h">–</span>'], ['Speed now', '<span data-live="v">–</span>'],
    ['Its orbit', `${heightText(o)} up, tilted ${fmt(o.inc, 1)}° to the equator`], ['One lap', lapText(o.per)],
    ['Catalogue no.', String(r[F.id])], ['Launch code', r[F.intl] || '–']];
  if (r[F.owner]) rows.push(['Owner', r[F.owner]]);
  if (r[F.launch]) rows.push(['Launched', day(r[F.launch])]);
  rows.push(['Orbit from', `${utc(r[F.epoch])} (${ago(r[F.epoch], simNow())})`]);
  h += '<dl class="mini">' + rows.map(([a, b]) => `<div><dt>${a}</dt><dd>${b.startsWith('<span') ? b : esc(b)}</dd></div>`).join('') + '</dl>';
  if (pair && passInfo) {
    h += `<p class="story">Close approach with <b>${esc(nameOf(pair.i))}</b> (${esc(kindName(pair.i))}, the blue orbit): predicted ${passInfo.km < 1 ? fmt(passInfo.km * 1000) + ' m' : fmt(passInfo.km, 2) + ' km'} apart at ${utc(passInfo.tca)}.</p>`;
    h += '<dl class="mini"><div><dt>Apart now</dt><dd data-live="gap">–</dd></div></dl>';
  }
  h += '<p class="dlinks"><button class="btn" type="button" id="owFollow" aria-pressed="false">Follow it</button><button class="btn ghost" type="button" id="owClear">Clear</button></p>';
  el.innerHTML = h;
  $('#owFollow').addEventListener('click', () => { following = !following; if (following) G.fly = null; syncFollow(); });
  $('#owClear').addEventListener('click', () => select(null));
  lastLive = 0;
}
let lastLive = 0;
function live(t) {
  if (!sel || performance.now() - lastLive < 250) return;
  lastLive = performance.now();
  const h = $('#owSel [data-live="h"]'), v = $('#owSel [data-live="v"]'), hn = heightNow(sel.i, t), vn = speedNow(sel.i);
  if (h) h.textContent = Number.isFinite(hn) ? `${fmt(hn)} km` : '–';
  if (v) v.textContent = Number.isFinite(vn) ? `${fmt(vn, 2)} km/s (${fmt(vn * 3600)} km/h)` : '–';
  const gp = $('#owSel [data-live="gap"]');
  if (gp && pair && sel.rec && pair.rec) {
    const a = eciAt(sel.rec, t), b = eciAt(pair.rec, t);
    if (a && b) { const d = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y, a.position.z - b.position.z); gp.textContent = d < 1 ? `${fmt(d * 1000)} m` : `${fmt(d, d < 100 ? 1 : 0)} km`; }
  }
}

// ------------------------------------------------------------------ the overlay: rings, labels and the hovered dot
let hov = -1;
function drawOver(t) {
  const dpr = Math.min(devicePixelRatio || 1, 2), W = frame.clientWidth, H = frame.clientHeight;
  if (over.width !== Math.round(W * dpr) || over.height !== Math.round(H * dpr)) { over.width = Math.round(W * dpr); over.height = Math.round(H * dpr); }
  octx.setTransform(dpr, 0, 0, dpr, 0, 0); octx.clearRect(0, 0, W, H);
  if (!D) return;
  const v = new THREE.Vector3();
  const screen = (i) => (at(i, t, v) && !hidden(v) ? G.toScreen(v) : null);
  const label = (q, text, color, size = 13) => {
    octx.font = `${size}px Georgia, "Times New Roman", serif`; octx.lineWidth = 3.5; octx.strokeStyle = 'rgba(5,8,13,.92)'; octx.fillStyle = color;
    const w = octx.measureText(text).width, x = q[0] + 11 + w > W ? q[0] - 11 - w : q[0] + 11;
    octx.strokeText(text, x, q[1] - 7); octx.fillText(text, x, q[1] - 7);
  };
  const ring = (q, color, r = 9) => { octx.strokeStyle = color; octx.lineWidth = 1.6; octx.beginPath(); octx.arc(q[0], q[1], r, 0, 7); octx.stroke(); };
  // the space stations and Hubble, always labelled
  for (const f of FAMOUS) {
    if (!f.pin) continue;
    const i = byId.get(f.id); if (i == null || !on[key[i]] || (sel && sel.i === i)) continue;
    const q = screen(i); if (!q) continue;
    octx.fillStyle = '#F2E6C9'; octx.fillRect(q[0] - 2, q[1] - 2, 4, 4);
    label(q, f.pin, '#F2E6C9', 12.5);
  }
  if (hov >= 0 && (!sel || hov !== sel.i)) { const q = screen(hov); if (q) ring(q, 'rgba(242,230,201,.85)', 7); }
  if (pair) { const q = screen(pair.i); if (q) { ring(q, '#8AA9C9'); label(q, nameOf(pair.i), '#8AA9C9'); } }
  if (sel) { const q = screen(sel.i); if (q) { ring(q, '#E2C88E'); octx.fillStyle = '#E2C88E'; octx.fillRect(q[0] - 2, q[1] - 2, 4, 4); label(q, nameOf(sel.i), '#E2C88E'); } }
}

// ------------------------------------------------------------------ pointing, tapping and the keyboard
let down = null, hoverRaf = null;
frame.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; tip.hidden = true; });
frame.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || e.target.closest('button, input, .findlist')) { down = null; return; }
  const b = frame.getBoundingClientRect(), i = nearest(e.clientX - b.left, e.clientY - b.top, e.pointerType === 'mouse' ? 10 : 18);
  down = null;
  if (i >= 0) {
    select(i); hintGone();
    // on a narrow screen the Selected card is under the globe: say so for a moment
    if (innerWidth <= 1100 && !pair) { banner(`${esc(nameOf(i))} · details below`); clearTimeout(bannerT); bannerT = setTimeout(() => { if (!pair) banner(''); }, 4000); }
  }
});
let bannerT = null;
// the tooltip (mouse only): the nearest dot under the pointer, at most once a frame
frame.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || down || hoverRaf || e.target.closest('.ovl')) { if (e.target.closest && e.target.closest('.ovl')) { tip.hidden = true; hov = -1; } return; }
  hoverRaf = requestAnimationFrame(() => {
    hoverRaf = null;
    const b = frame.getBoundingClientRect(), i = nearest(e.clientX - b.left, e.clientY - b.top, 10);
    hov = i; host.classList.toggle('over', i >= 0);
    if (i < 0) { tip.hidden = true; return; }
    const o = orbitOf(i), hn = heightNow(i, simNow());
    tip.innerHTML = `<b>${esc(nameOf(i))}</b><br>${esc(kindName(i))}<br>${Number.isFinite(hn) ? `${fmt(hn)} km up · ` : ''}one lap in ${lapText(o.per)}<br><span class="note">tap for details</span>`;
    tip.hidden = false;
    tip.style.left = `${Math.min(e.clientX + 14, innerWidth - tip.offsetWidth - 8)}px`;
    tip.style.top = `${Math.min(e.clientY + 14, innerHeight - tip.offsetHeight - 8)}px`;
  });
});
frame.addEventListener('pointerleave', () => { tip.hidden = true; hov = -1; });
addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });
frame.addEventListener('keydown', (e) => {
  if (e.target !== frame) return;
  if (e.key.startsWith('Arrow')) { G.turn(e.key); following = false; syncFollow(); e.preventDefault(); }
  else if (e.key === '+' || e.key === '=') G.zoom(0.7);
  else if (e.key === '-' || e.key === '_') G.zoom(1.4);
  else if (e.key === 'Home') { setView('tilt', 4.3); e.preventDefault(); }
  else if (e.key === ' ') { setPlaying(!playing); e.preventDefault(); }
  else if (e.key === 'Escape') select(null);
  hintGone();
});
$('#owIn').addEventListener('click', () => { G.zoom(0.7); hintGone(); });
$('#owOut').addEventListener('click', () => { G.zoom(1.4); hintGone(); });

// view and distance
function setView(v, r) {
  if (v) viewDir = v; if (r) viewR = r;
  following = false; syncFollow();
  G.flyTo(viewAt());
  $$('[data-v]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === viewDir));
  $$('[data-r]').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.r === viewR));
  hintGone();
}
$$('[data-v]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.v, null)));
$$('[data-r]').forEach((b) => b.addEventListener('click', () => setView(null, +b.dataset.r)));

// the kinds shown
function toggleKind(k, force) {
  on[k] = force ?? !on[k]; placeNow = true;
  const c = $(`.mapbar [data-k="${k}"]`); if (c) c.setAttribute('aria-pressed', on[k]);
  if (sel && key[sel.i] === k && !on[k]) select(null);
}
$$('.mapbar [data-k]').forEach((c) => c.addEventListener('click', () => toggleKind(c.dataset.k)));

// full screen: the browser's own where it allows it, otherwise the globe fills the window (as on the solar system map)
const ICON_OPEN = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 8V3h5M12 3h5v5M17 12v5h-5M8 17H3v-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M8 3v5H3M17 8h-5V3M12 17v-5h5M3 12h5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const isFull = () => !!document.fullscreenElement || frame.classList.contains('pseudo-full');
function syncFull() {
  const b = $('#owFull'), full = isFull();
  b.innerHTML = full ? `${ICON_CLOSE}<span>Exit</span>` : ICON_OPEN; b.classList.toggle('wide', full);
  b.setAttribute('aria-label', full ? 'Exit full screen' : 'Full screen'); b.title = full ? 'Exit full screen (Esc)' : 'Full screen';
  G.resize();
}
const leavePseudo = () => { frame.classList.remove('pseudo-full'); document.body.classList.remove('noscroll'); syncFull(); };
$('#owFull').addEventListener('click', () => {
  if (document.fullscreenElement) { document.exitFullscreen(); return; }
  if (frame.classList.contains('pseudo-full')) { leavePseudo(); return; }
  const fallback = () => { frame.classList.add('pseudo-full'); document.body.classList.add('noscroll'); syncFull(); };
  if (frame.requestFullscreen) frame.requestFullscreen().catch(fallback); else fallback();
});
document.addEventListener('fullscreenchange', syncFull);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && frame.classList.contains('pseudo-full')) leavePseudo(); });

// ------------------------------------------------------------------ find by name or number
const q = $('#owQ'), list = $('#owList');
let hits = [], cur = -1;
function suggest() {
  const s = q.value.trim().toUpperCase();
  hits = []; cur = -1;
  if (D && s.length >= 2) {
    const num = /^\d+$/.test(s);
    for (const f of FAMOUS) { const i = byId.get(f.id); if (i != null && !num && f.name.toUpperCase().includes(s)) hits.push(i); }
    for (let i = 0; i < n && hits.length < 8; i++) {
      const r = D.o[i];
      if (!hits.includes(i) && (num ? String(r[F.id]).startsWith(s) : String(r[F.name]).toUpperCase().includes(s))) hits.push(i);
    }
  }
  list.innerHTML = hits.map((i, k) => `<li role="option" id="owO${k}" data-i="${i}" aria-selected="false"><i class="ow-k ${kind[i]}"></i>${esc(nameOf(i))}<small>${D.o[i][F.id]}</small></li>`).join('')
    || (s.length >= 2 && D ? '<li class="none">Nothing on the globe by that name or number</li>' : '');
  list.hidden = !list.innerHTML; q.setAttribute('aria-expanded', !list.hidden);
}
function choose(i) { list.hidden = true; q.setAttribute('aria-expanded', 'false'); q.value = ''; select(i, { fly: true }); hintGone(); }
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
document.addEventListener('click', (e) => { if (!e.target.closest('.ovl-find')) list.hidden = true; });

// well-known satellites
function buildFamous() {
  $('#owFamous').innerHTML = FAMOUS.filter((f) => byId.has(f.id))
    .map((f) => `<button class="chip" type="button" data-id="${f.id}" aria-pressed="false">${esc(f.short)}</button>`).join('');
  $$('#owFamous [data-id]').forEach((b) => b.addEventListener('click', () => { select(byId.get(+b.dataset.id), { fly: true }); hintGone(); }));
}
function syncFamous() { $$('#owFamous [data-id]').forEach((b) => b.setAttribute('aria-pressed', !!sel && D.o[sel.i][F.id] === +b.dataset.id)); }

// the legend beside the globe
function buildLegend(counts) {
  const li = (k, name, count, note) => `<li><i class="ow-k ${k}"></i><span><b>${name}</b>${count != null ? ` · ${fmt(count)}` : ''}${note ? `<br><span class="note">${note}</span>` : ''}</span></li>`;
  $('#owLegend').innerHTML = li('w', 'Working satellites', counts.w, 'every satellite CelesTrak lists as working, apart from the mega-constellations')
    + li('m', 'Mega-constellations', counts.m, 'Starlink, OneWeb, Kuiper, Qianfan and Guowang: thousands of small satellites each')
    + li('x', 'Debris from three breakups', counts.fy + counts.co + counts.ir, `Fengyun-1C, 2007 (${fmt(counts.fy)}); Cosmos 2251 and Iridium 33, 2009 (${fmt(counts.co + counts.ir)})`)
    + li('pin', 'The space stations and Hubble', null, 'always labelled')
    + li('ring', 'Selected', null, 'with its orbit drawn');
}

// share this view
shareButton($('#owShare'), $('#owShareMsg'), () => {
  const c = camera.position, r = (x) => x.toFixed(3);
  return linkWith({ sel: sel ? D.o[sel.i][F.id] : '', t: isLive() ? '' : new Date(simNow()).toISOString().slice(0, 19) + 'Z',
    cam: `${r(c.x)},${r(c.y)},${r(c.z)}`, spd: playing ? (speed === 1 ? '' : speed) : '0' });
}, 'What\'s in orbit · Orbit Watch');
const shared = takeShared(['sel', 't', 'cam', 'spd']);

// ------------------------------------------------------------------ the loop
// the globe is drawn only while it can be seen: not in a hidden tab, and not while scrolled off the screen (Nov 18,
// 2026: drawing 35,000 dots every frame kept a phone busy even with the globe out of sight)
let running = true, looping = true, onScreen = true;
const kick = () => { running = !document.hidden && onScreen; if (running && !looping) { looping = true; requestAnimationFrame(loop); } };
document.addEventListener('visibilitychange', kick);
new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; kick(); }).observe(frame);

let lastClock = '';
const follow = new THREE.Vector3();
function loop() {
  if (!running) { looping = false; return; }
  const t = simNow();
  G.body.rotation.y = gmst(t);
  if (G.night) G.night.update(t);
  const now = performance.now(), r = rate();
  if (pts && (placeNow || r !== lastRate || r > 60 || (r > 0 && now - lastPlace > 100))) {
    placeAll(t); lastPlace = now; lastRate = r; placeNow = false;
  }
  for (const [s, w] of [[sel, 0], [pair, 1]]) if (s && Math.abs(t - s.lineT) > 300e3) orbitLine(s, t, w);
  if (following && sel && at(sel.i, t, follow)) camera.position.copy(follow.normalize().multiplyScalar(camera.position.length()));
  G.stepFly(); G.paceControls(); controls.update(); sharper();
  G.renderer.render(scene, camera);
  drawOver(t); live(t);
  const d = new Date(t), clock = `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}|${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())}`;
  if (clock !== lastClock) {
    lastClock = clock;
    const [dd, tt] = clock.split('|'), liveNow = isLive();
    $('#owDate').textContent = dd;
    $('#owSub').textContent = liveNow ? `live · ${tt} UTC` : `${tt} UTC${playing ? (speed > 1 ? ` · ×${fmt(speed)}` : '') : ' · paused'}`;
    $('#owSub').classList.toggle('live', liveNow);
  }
  requestAnimationFrame(loop);
}
new ResizeObserver(() => G.resize()).observe(frame);
G.resize();
camera.position.copy(viewAt());
requestAnimationFrame(loop);
setTimeout(hintGone, 12000);

// ------------------------------------------------------------------ data
/** Puts a copy of the orbit data on the globe. On a reload the selected object, the second object of a replayed pass
 *  and Follow it are kept by catalogue number. */
function useObjects(data) {
  const keep = D ? { sel: sel && D.o[sel.i][F.id], pair: pair && D.o[pair.i][F.id], following } : null;
  D = data; n = D.o.length; key = []; kind = []; byId.clear(); hov = -1;
  D.f.forEach((name, k) => { F[name] = k; });
  const counts = { w: 0, m: 0, fy: 0, co: 0, ir: 0 };
  for (let i = 0; i < n; i++) {
    const r = D.o[i], f = r[F.flag];
    kind[i] = f === 'mega' ? 'm' : r[F.kind];
    key[i] = f === 'mega' ? 'm' : CLOUDS[f] ? f : 'w';
    counts[key[i]]++;
    byId.set(r[F.id], i);
  }
  const made = Date.parse(D.made);
  $('#owUpd').textContent = `${fmt(n)} objects · orbits copied from CelesTrak ${utc(made)} (${ago(made)})`;
  buildLegend(counts); buildFamous();
  if (pts) { scene.remove(pts); pts.geometry.dispose(); pts.material.dispose(); }
  makePoints();
  if (keep) {
    pos = vel = null; stale = true;
    if (sel && sel.line) scene.remove(sel.line);
    if (pair && pair.line) scene.remove(pair.line);
    const pi = keep.pair != null ? byId.get(keep.pair) : null;
    pair = pi != null ? { i: pi, rec: recOf(pi) } : null;
    if (!pair) { passInfo = null; banner(''); }
    const si = keep.sel != null ? byId.get(keep.sel) : null;
    sel = null; select(si != null ? si : -1, { keepPair: true });
    if (pair) orbitLine(pair, simNow(), 1);
    following = !!sel && keep.following; syncFollow();
  }
  worker.postMessage({ rows: D.o, f: D.f });
}
/** The orbit data; again: a reload by hand, which keeps the globe as it is when the file cannot be read or is the
 *  same copy. */
async function loadObjects(again) {
  const res = await load('data/objects.json');
  if (!res.data) {
    if (again && D) return false;
    $('#owLoading').innerHTML = `<span>${res.missing ? 'The orbit data has not been copied to the site yet: it arrives with the next run of the data job.' : 'The orbit data could not be loaded. Check the connection and reload the page.'}</span>`;
    $('#owUpd').textContent = 'Orbit data: not available yet.';
    return false;
  }
  if (again && D && res.data.made === D.made) {
    const made = Date.parse(D.made);
    $('#owUpd').textContent = `${fmt(n)} objects · orbits copied from CelesTrak ${utc(made)} (${ago(made)})`;
    return true;
  }
  useObjects(res.data);
  return true;
}

(async () => {
  if (!(await loadObjects(false))) return;

  // a shared view
  if (shared) {
    const t = Date.parse(shared.t || ''), cam = (shared.cam || '').split(',').map(Number), spd = shared.spd;
    if (Number.isFinite(t)) setTime(t);
    if (spd === '0') setPlaying(false); else if (+spd > 1) setSpeed(+spd);
    if (cam.length === 3 && cam.every(Number.isFinite) && Math.hypot(...cam) > 1.1) camera.position.set(...cam);
    const i = byId.get(+shared.sel); if (i != null) select(i);
  }

  // a close approach opened from the collisions page
  const qp = new URLSearchParams(location.search), ids = (qp.get('pass') || '').split(',').map(Number), tca = +qp.get('t');
  if (ids.length === 2 && tca) {
    const ia = byId.get(ids[0]), ib = byId.get(ids[1]);
    if (ia != null && ib != null) {
      const close = await load('data/close.json');
      const p = close.data && [...close.data.byRange, ...close.data.byProb].find((x) => x.a.id === ids[0] && x.b.id === ids[1]);
      pair = { i: ib, rec: recOf(ib) };
      passInfo = { tca, km: p ? p.km : NaN };
      setTime(tca - 5 * 60e3); setSpeed(10);
      select(ia, { keepPair: true });
      orbitLine(pair, simNow(), 1);
      setTimeout(() => flyToObj(ia), 400);
      banner(`Replaying a close approach: closest at ${esc(utc(tca))}`);
    } else banner('One of the two objects of that close approach is not on the globe.');
  }
})();

// ------------------------------------------------------------------ the catalogue: heights and regions
const htip = tip;                                                // the same tooltip as the globe's
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
  s += `<text class="axt" x="${(W + L) / 2}" y="${Ht - 4}" text-anchor="middle">${W < 420 ? "Mean height, km" : "Mean height above the ground, km"}</text></svg>`;
  box.innerHTML = s;
  const show = (e, g) => {
    const k = +g.dataset.k, b = bins[k], h0 = (k + first) * H.step;
    htip.innerHTML = `<b>${fmt(h0)} to ${fmt(h0 + H.step)} km</b><br>` + H.kinds.map((nm, j) => (b[j] ? `${nm}: ${fmt(b[j])}<br>` : '')).join('') + `All: ${fmt(tot[k])}`;
    htip.hidden = false;
    const tx = Math.min(innerWidth - htip.offsetWidth - 8, e.clientX + 14), ty = Math.max(8, e.clientY - htip.offsetHeight - 10);
    htip.style.left = `${tx}px`; htip.style.top = `${ty}px`;
  };
  $$('.bar', box).forEach((g) => {
    g.addEventListener('pointermove', (e) => show(e, g));
    g.addEventListener('pointerdown', (e) => show(e, g));
    g.addEventListener('pointerleave', () => { htip.hidden = true; });
  });
}
new ResizeObserver(drawHeights).observe($('#owHeights'));
addEventListener('scroll', () => { htip.hidden = true; }, { passive: true });

/** The catalogue's heights and regions; again: a reload by hand, which keeps the chart shown if the file cannot be read. */
async function loadHeights(again) {
  const res = await load('data/heights.json');
  if (!res.data) {
    if (again && H) return false;
    for (const el of [$('#owHeights'), $('#owRegions')]) {
      el.innerHTML = `<p class="empty">${res.missing ? 'The satellite catalogue has not been copied to the site yet: it arrives with the next run of the data job.' : 'The satellite catalogue could not be loaded. Check the connection and reload the page.'}</p>`;
    }
    $('#owHLegend').hidden = true;
    return false;
  }
  if (again && H && res.data.made === H.made) return true;
  H = res.data;
  $('#owHLegend').hidden = false;
  const all = H.total.reduce((s, v) => s + v, 0);
  $('#owHAside').textContent = `${fmt(all)} objects in Earth orbit · catalogue copied ${utc(Date.parse(H.made))}`;
  if (H.total[4] && !$('#owHLegend .ow-k.u')) $('#owHLegend').insertAdjacentHTML('beforeend', '<span><i class="ow-k u"></i>Unknown</span>');
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
  return true;
}
loadHeights(false);

// the Reload button: the orbits and the catalogue together; the globe is rebuilt only when the copy is newer
reloadPage($('#owReload'), async () => (await Promise.all([loadObjects(true), loadHeights(true)])).every(Boolean));
