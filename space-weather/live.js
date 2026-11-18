// NASA and ESA Data Projects · Space Weather · reading the live data · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Everything on the page is read live in the visitor's browser (decided Nov 17, 2026), from sources that need no key
// and allow web pages to read them (checked Nov 17, 2026):
//   • NASA CCMC DONKI (ccmc.gsfc.nasa.gov/DONKI-API/get/…): flares, CMEs, storms, particle events, model runs;
//     at most 60 days per request.
//   • NASA CCMC iSWA (iswa.gsfc.nasa.gov, HAPI 2.0): IMAP solar wind, GOES X-rays (NOAA), Kp from GFZ, NOAA's Kp
//     forecast.
// Both go through shared/nasa.js (nasaOpenGet). When a source cannot be reached, the saved copy written by the Space
// Weather data job (data/latest.json, same shape as the model below) stands in for it, and the page says so.
//
// The model every part of the page reads (times in milliseconds since 1970, UTC):
//   flares  [{ t, cls, flux, region, loc, link }]          storms [{ t, kp, link }]
//   cmes    [{ t, speed, half, lon, lat, type, link }]     seps   [{ t, link }]
//   runs    [{ done, arrival, glancing, hit, kp: [min, max], cme, link }]   (WSA–ENLIL model runs that reach Earth)
//   wind    { speed: [[t, v]], dens, bz, bt }              (10-minute means)
//   xray    [[t, flux]]                                    (10-minute peaks, W/m²)
//   kp      [{ t, kp, kind: 'obs' | 'pred' }]               (3-hour blocks, start time)
import { nasaOpenGet } from '../shared/nasa.js';

const DONKI = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/';
const HAPI = 'https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/';
const DAY = 864e5, HOUR = 36e5;
const iso = (ms) => new Date(ms).toISOString().slice(0, 19) + 'Z';
const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
const t = (s) => (s ? Date.parse(String(s).replace(/Z?$/, 'Z')) : NaN);
const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

// ---------------------------------------------------------------- DONKI
async function donki(type, days, extra = '', ttlMs) {
  // DONKI refuses a range of more than 60 days, counting both ends; the end day (today, UTC) is included
  const end = Date.now(), start = end - (Math.min(days, 60) - 1) * DAY;
  return nasaOpenGet(`${DONKI}${type}?startDate=${ymd(start)}&endDate=${ymd(end)}${extra}`, { ttlMs });
}
const FLUX = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 };
export const flareFlux = (cls) => {
  const m = /^([ABCMX])(\d+(?:\.\d+)?)/.exec(cls || '');
  return m ? FLUX[m[1]] * Number(m[2]) : NaN;
};

export async function readEvents(days = 60) {
  const ttl = 10 * 60 * 1000;
  const [flr, cme, gst, sep, wsa] = await Promise.all([
    donki('FLR', days, '', ttl), donki('CMEAnalysis', days, '&mostAccurateOnly=true&catalog=ALL', ttl),
    donki('GST', days, '', ttl), donki('SEP', days, '', ttl), donki('WSAEnlilSimulations', 10, '', ttl)]);
  return {
    flares: (flr || []).map((f) => ({ t: t(f.peakTime || f.beginTime), cls: f.classType, flux: flareFlux(f.classType),
      region: f.activeRegionNum || null, loc: f.sourceLocation || '', link: f.link })).filter((f) => f.t && f.flux > 0),
    cmes: (cme || []).map((c) => ({ t: t(c.time21_5), speed: num(c.speed), half: num(c.halfAngle), lon: num(c.longitude),
      lat: num(c.latitude), type: c.type || '', link: c.link })).filter((c) => c.t && c.speed > 0),
    storms: (gst || []).map((g) => ({ t: t(g.startTime), kp: Math.max(...(g.allKpIndex || []).map((k) => num(k.kpIndex)).filter(Number.isFinite), 0),
      link: g.link })).filter((g) => g.t),
    seps: (sep || []).map((s) => ({ t: t(s.eventTime), link: s.link })).filter((s) => s.t),
    runs: earthRuns(wsa || []),
  };
}

// The model runs that say a CME reaches Earth; for each CME only its newest run.
function earthRuns(list) {
  const byCme = new Map();
  for (const w of list) {
    if (!(w.isEarthGB || w.isEarthMinorImpact)) continue;
    const cme = (w.cmeInputs && w.cmeInputs[0] && (w.cmeInputs[0].cmeStartTime || w.cmeInputs[0].cmeid)) || w.simulationID;
    const run = { done: t(w.modelCompletionTime), arrival: t(w.estimatedShockArrivalTime), hit: !!w.isEarthGB,
      glancing: !w.isEarthGB && !!w.isEarthMinorImpact, cme: t(w.cmeInputs && w.cmeInputs[0] && w.cmeInputs[0].cmeStartTime),
      kp: kpRange(w), link: w.link };
    const old = byCme.get(cme);
    if (!old || run.done > old.done) byCme.set(cme, run);
  }
  return [...byCme.values()].sort((a, b) => (a.arrival || a.done) - (b.arrival || b.done));
}
function kpRange(w) {
  const k = [w.kp_18, w.kp_90, w.kp_135, w.kp_180].map(num).filter(Number.isFinite);
  return k.length ? [Math.min(...k), Math.max(...k)] : null;
}

// ---------------------------------------------------------------- iSWA (HAPI)
// A HAPI request as CSV with its header, so columns are found by name. If the service does not take a list of
// parameters, the request is repeated without it.
async function hapi(id, fromMs, toMs, params, ttlMs) {
  const base = `${HAPI}data?id=${encodeURIComponent(id)}&time.min=${iso(fromMs)}&time.max=${iso(toMs)}&include=header`;
  let text;
  try {
    text = await nasaOpenGet(base + (params ? `&parameters=${params.join(',')}` : ''), { as: 'text', ttlMs });
  } catch (e) {
    if (!params) throw e;
    text = await nasaOpenGet(base, { as: 'text', ttlMs });
  }
  return parseHapi(text);
}
export function parseHapi(text) {
  const head = [], rows = [];
  for (const line of String(text).split('\n')) {
    if (line.startsWith('#')) head.push(line.slice(1));
    else if (line.trim()) rows.push(line.split(','));
  }
  if (!head.length) {
    // no header: a status answer in JSON (1406 is "no data in this time range")
    try { const j = JSON.parse(text); if (j.status && j.status.code === 1406) return { names: [], rows: [] }; } catch { /* not JSON */ }
    throw new Error('Unexpected answer from NASA iSWA');
  }
  const h = JSON.parse(head.join('\n'));
  if (h.status && h.status.code === 1406) return { names: [], rows: [] };
  if (h.status && h.status.code !== 1200) throw new Error('NASA iSWA: ' + h.status.message);
  return { names: h.parameters.map((p) => p.name), rows };
}
const col = (d, name) => d.names.indexOf(name);

// mean (or peak) per 10 minutes of the values that pass `ok`
function bins(d, name, ok, how = 'mean', step = 10 * 60 * 1000) {
  const ti = 0, vi = col(d, name);
  if (vi < 0) return [];
  const m = new Map();
  for (const r of d.rows) {
    const tt = t(r[ti]), v = num(r[vi]);
    if (!tt || !Number.isFinite(v) || !ok(v)) continue;
    const k = Math.floor(tt / step) * step, b = m.get(k) || { s: 0, n: 0, max: -Infinity };
    b.s += v; b.n++; b.max = Math.max(b.max, v); m.set(k, b);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, b]) => [k + step / 2, how === 'max' ? b.max : b.s / b.n]);
}

export async function readWind() {
  const now = Date.now(), from = now - 24 * HOUR, ttl = 4 * 60 * 1000;
  const [sw, mag] = await Promise.all([
    hapi('imap_swapi', from, now, ['sw_proton_density', 'sw_proton_speed'], ttl),
    hapi('imap_mag', from, now, ['bz_gsm', 'b_magnitude'], ttl)]);
  return {
    speed: bins(sw, 'sw_proton_speed', (v) => v > 150 && v < 3000),
    dens: bins(sw, 'sw_proton_density', (v) => v > 0 && v < 300),
    bz: bins(mag, 'bz_gsm', (v) => Math.abs(v) < 300),
    bt: bins(mag, 'b_magnitude', (v) => v >= 0 && v < 300),
  };
}

export async function readXray() {
  const now = Date.now();
  const d = await hapi('goesp_xray_flux_P1M', now - 24 * HOUR, now, ['Long_Wave'], 4 * 60 * 1000);
  return bins(d, 'Long_Wave', (v) => v > 1e-9 && v < 1e-1, 'max');
}

// Kp: the last 7 days measured (GFZ), then NOAA's forecast for the blocks after the last measured one.
export async function readKp() {
  const now = Date.now(), ttl = 15 * 60 * 1000;
  const obs = await hapi('GFZ_Indices_P3H', now - 8 * DAY, now, ['Kp_observed'], ttl);
  const out = [];
  const oi = col(obs, 'Kp_observed');
  for (const r of obs.rows) { const v = num(r[oi]); if (Number.isFinite(v) && v >= 0) out.push({ t: t(r[0]), kp: v, kind: 'obs' }); }
  try {
    const info = await nasaOpenGet(`${HAPI}info?id=NOAA_KP_P3H`, { ttlMs: HOUR });
    const stop = Math.min(t(info.stopDate) || now, now + 4 * DAY);
    const f = await hapi('NOAA_KP_P3H', now - DAY, stop, ['Kp_predicted'], ttl);
    const pi = col(f, 'Kp_predicted'), last = out.length ? out[out.length - 1].t : 0;
    for (const r of f.rows) {
      const tt = t(r[0]), v = num(r[pi]);
      if (tt > last && Number.isFinite(v) && v >= 0) out.push({ t: tt, kp: v, kind: 'pred' });
    }
  } catch { /* the forecast is extra: the measured Kp is shown without it */ }
  return out.sort((a, b) => a.t - b.t);
}

// ---------------------------------------------------------------- the saved copy (Space Weather data job)
let saved = null;
export function readSaved() {
  saved = saved || fetch(new URL('data/latest.json', import.meta.url), { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return saved;
}
export function readArchive() {
  return fetch(new URL('data/archive.json', import.meta.url), { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null);
}
