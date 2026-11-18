// NASA and ESA Data Projects · Orbit Watch · shared helpers of its pages · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Loading the data files (written twice a day by the data job, orbit-watch/fetch_orbits.py) and the hand-checked
// figures (facts.json), number and date formats, and the names and colours of the kinds of object.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** A file of this site, or null if it is missing or unreadable (the page then shows its empty or error state). */
export async function load(path) {
  try {
    const r = await fetch(path, { cache: 'no-cache' });
    if (!r.ok) return { missing: r.status === 404, data: null };
    return { data: await r.json() };
  } catch {
    return { failed: true, data: null };
  }
}

export const fmt = (n, d = 0) => (n == null || !Number.isFinite(n) ? '–'
  : n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }));
export const big = (n) => (n >= 1e6 ? `${fmt(n / 1e6, n % 1e6 ? 1 : 0)} million` : fmt(n));

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (n) => String(n).padStart(2, '0');
/** "Nov 19, 03:12 UTC" */
export const utc = (ms) => { const d = new Date(ms); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC`; };
/** "Nov 19, 2026, 03:12:40 UTC" */
export const utcFull = (ms) => { const d = new Date(ms); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())} UTC`; };
/** "Aug 4, 2026" from "2026-08-04" */
export const day = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${MON[m - 1]} ${d}, ${y}`; };
/** "3 hours ago" */
export function ago(ms, now = Date.now()) {
  const h = (now - ms) / 3600e3;
  if (h < 1) return 'less than an hour ago';
  if (h < 48) return `${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'} ago`;
  return `${Math.round(h / 24)} days ago`;
}

/** The kinds of object, in the order of the data files (fetch_orbits.py) and the charts. */
export const KINDS = {
  w: { name: 'Working satellite', many: 'Working satellites', color: '#8AA9C9' },
  m: { name: 'Mega-constellation satellite', many: 'Mega-constellations', color: '#5F7A96' },
  d: { name: 'Dead satellite', many: 'Dead satellites', color: '#B79AC8' },
  r: { name: 'Rocket body', many: 'Rocket bodies', color: '#C9784A' },
  x: { name: 'Debris', many: 'Debris', color: '#D1A956' },
  u: { name: 'Unknown object', many: 'Unknown', color: '#8b8577' },
};
export const CLOUDS = { fy: 'Fengyun-1C debris', co: 'Cosmos 2251 debris', ir: 'Iridium 33 debris' };
