// NASA and ESA Data Projects · Space Weather · the aurora chance for a place · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// The rules (NOAA Space Weather Prediction Center, "Tips on viewing the aurora", checked Nov 17, 2026):
//   1. The aurora's edge nearest the equator lies at about 66° geomagnetic latitude at Kp 0, and 2° nearer the
//      equator for each step of Kp:  edge = 66 − 2 × Kp  (Kp 9 → 48°).
//   2. It can be seen low toward the pole when its edge is up to 4 to 5° poleward of the viewer; 4° is used here.
//   So a place at geomagnetic latitude m needs:
//      overhead:    Kp ≥ (66 − m) / 2
//      on the horizon: Kp ≥ (62 − m) / 2
// Geomagnetic latitude is the latitude measured from the axis of Earth's magnetic dipole, whose north pole is at
// 80.85° N, 72.76° W for 2025 (World Magnetic Model 2025, NOAA NCEI):
//      sin m = sin φ sin φp + cos φ cos φp cos(λ − λp)
// Darkness: the Sun at least 12° below the horizon (shared/sky.js), the same rule as the site's other sky pages.
import { jdFromMs, observer, topocentric, sunVector, moonPhase } from '../shared/sky.js';

const R = Math.PI / 180;
export const POLE = { lat: 80.85, lon: -72.76 };
export const DARK_SUN = -12;

export function geomagLat(lat, lon) {
  const s = Math.sin(lat * R) * Math.sin(POLE.lat * R) + Math.cos(lat * R) * Math.cos(POLE.lat * R) * Math.cos((lon - POLE.lon) * R);
  return Math.asin(Math.max(-1, Math.min(1, s))) / R;
}
export const edgeAt = (kp) => 66 - 2 * kp;
// the smallest Kp, in steps of a third, that brings the aurora overhead / onto the horizon (0 if always; null if never)
function need(limit, m) {
  const k = (limit - m) / 2;
  if (k <= 0) return 0;
  if (k > 9) return null;
  return Math.ceil(k * 3 - 1e-9) / 3;
}
export const needs = (m) => ({ overhead: need(66, Math.abs(m)), horizon: need(62, Math.abs(m)) });

const sunAlt = (place, ms) => {
  const jd = jdFromMs(ms), o = observer(place.lat, place.lon, jd);
  return topocentric(sunVector(jd), o, jd).trueAlt;
};
// The dark hours from now (or the next ones) within 36 hours, every 10 minutes: { from, to } or null (no darkness)
export function darkWindow(place, now = Date.now()) {
  const step = 10 * 60 * 1000;
  let from = null;
  for (let ms = now; ms <= now + 36 * 36e5; ms += step) {
    const dark = sunAlt(place, ms) <= DARK_SUN;
    if (dark && from === null) from = ms;
    if (!dark && from !== null) return { from, to: ms, now: from === now };
  }
  return from !== null ? { from, to: now + 36 * 36e5, now: from === now, endless: true } : null;
}
export const moonLit = (ms = Date.now()) => moonPhase(jdFromMs(ms)).lit;

// The verdict for a place, from the Kp now and NOAA's forecast for the dark hours.
export function chance(place, kpList, now = Date.now()) {
  const m = geomagLat(place.lat, place.lon), n = needs(m), dark = darkWindow(place, now);
  const measured = kpList.filter((k) => k.kind === 'obs');
  const kpNow = measured.length ? measured[measured.length - 1].kp : null;
  let kpNight = kpNow;
  if (dark) {
    for (const k of kpList) if (k.t + 3 * 36e5 > dark.from && k.t < dark.to && k.kp > (kpNight ?? -1)) kpNight = k.kp;
  }
  const best = kpNight ?? kpNow;
  let level = 'unlikely';
  if (best !== null && n.overhead !== null && best >= n.overhead) level = 'overhead';
  else if (best !== null && n.horizon !== null && best >= n.horizon) level = 'horizon';
  return { m, needs: n, dark, kpNow, kpNight: best, level, toward: m >= 0 ? 'north' : 'south', moon: moonLit(dark ? dark.from : now) };
}
