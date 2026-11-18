// NASA and ESA Data Projects · Exoplanets · data, methods and the habitable-zone rules · © 2026 Malcolm Syme ·
// mcsyme11@gmail.com
//
// The pages read files built from the NASA Exoplanet Archive and MAST (fetch_planets.py, tools/build_series.py): the
// archives send no CORS headers, so web pages never call them.

export const fmt = (n, d = 0) =>
  n === null || n === undefined || !isFinite(n) ? '—'
    : Number(n).toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });
/** Rounds to `s` significant figures for display (0.000613 → "0.000613", 1234 → "1,234"). */
export function sig(n, s = 3) {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  if (n === 0) return '0';
  const d = Math.max(0, s - 1 - Math.floor(Math.log10(Math.abs(n))));
  return fmt(n, Math.min(d, 8));
}
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export const dateText = (iso) => new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export const PC_LY = 3.26156;          // light years in a parsec
export const R_SUN_KM = 695700, R_EARTH_KM = 6371, AU_KM = 149597870.7;
export const M_JUP_EARTH = 317.83;

// The discovery methods: the codes written by fetch_planets.py, the archive's names, the six groups the pages use,
// with a colour (docs/DESIGN.md series order) and a shape each, so colour is never the only difference.
export const GROUPS = [
  { id: 'transit', label: 'Transit', codes: ['T'], col: '#C0A062', sw: 's1', shape: 'circle' },
  { id: 'rv', label: 'Radial velocity', codes: ['R'], col: '#8AA9C9', sw: 's2', shape: 'square' },
  { id: 'micro', label: 'Microlensing', codes: ['M'], col: '#8FB996', sw: 's3', shape: 'triangle' },
  { id: 'imaging', label: 'Direct imaging', codes: ['I'], col: '#C9784A', sw: 's4', shape: 'diamond' },
  { id: 'astrometry', label: 'Astrometry', codes: ['A'], col: '#B79AC8', sw: 's5', shape: 'star' },
  { id: 'other', label: 'Timing and other', codes: ['V', 'E', 'P', 'U', 'B', 'K', 'O'], col: '#D1A956', sw: 's6', shape: 'cross' },
];
export const METHOD_NAMES = {
  T: 'Transit', R: 'Radial velocity', M: 'Microlensing', I: 'Direct imaging', A: 'Astrometry',
  V: 'Transit timing', E: 'Eclipse timing', P: 'Pulsar timing', U: 'Pulsation timing',
  B: 'Brightness changes along the orbit', K: 'Motion of the disc around the star', O: 'Other',
};
export const TIMING_CODES = ['V', 'E', 'P', 'U'];
export const groupOf = (code) => GROUPS.find((g) => g.codes.includes(code)) || GROUPS[5];

// ---- the habitable zone (the same rules as fetch_planets.py) ----
// 1. NASA's rule: the NASA Exoplanet Exploration Program's conservative zone, 0.95 to 1.67 au for a star like the
//    Sun, scaled by the square root of the star's luminosity: in starlight received (Earth = 1), 0.359 to 1.108.
export const NASA_HZ = { in_au: 0.95, out_au: 1.67, s_in: 1 / 0.95 ** 2, s_out: 1 / 1.67 ** 2 };
// 2. The star's temperature taken into account: Kopparapu et al. (2014), one Earth mass, stars of 2,600 to 7,200 K.
const KOP = {
  recent_venus: [1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15],
  runaway_greenhouse: [1.107, 1.332e-4, 1.580e-8, -8.308e-12, -1.931e-15],
  maximum_greenhouse: [0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16],
  early_mars: [0.320, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16],
};
export const TEFF_RANGE = [2600, 7200];
export function seff(limit, teff) {
  const [s, a, b, c, d] = KOP[limit], t = teff - 5780;
  return s + a * t + b * t ** 2 + c * t ** 3 + d * t ** 4;
}
/** The zone's edges for a star, in starlight (Earth = 1) and, when the luminosity is known, in au. */
export function zones(teff, logL) {
  const L = logL === null || logL === undefined ? null : 10 ** logL;
  const au = (s) => (L === null ? null : Math.sqrt(L / s));
  const out = { L, nasa: { s_in: NASA_HZ.s_in, s_out: NASA_HZ.s_out, a_in: au(NASA_HZ.s_in), a_out: au(NASA_HZ.s_out) } };
  if (teff && teff >= TEFF_RANGE[0] && teff <= TEFF_RANGE[1]) {
    const c = { s_in: seff('runaway_greenhouse', teff), s_out: seff('maximum_greenhouse', teff) };
    const o = { s_in: seff('recent_venus', teff), s_out: seff('early_mars', teff) };
    out.cons = { ...c, a_in: au(c.s_in), a_out: au(c.s_out) };
    out.opt = { ...o, a_in: au(o.s_in), a_out: au(o.s_out) };
  }
  return out;
}

// ---- loading ----
const cache = {};
async function getJson(path) {
  if (!cache[path]) {
    cache[path] = fetch(new URL(path, import.meta.url)).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    cache[path].catch(() => { delete cache[path]; });
  }
  return cache[path];
}
export const loadSummary = () => getJson('data/summary.json');
export const loadSeriesIndex = () => getJson('data/series/index.json');
export const loadSeries = (key) => getJson(`data/series/${key}.json`);
/** Every planet as an object with named fields. */
export async function loadPlanets() {
  const d = await getJson('data/planets.json');
  if (!d.list) {
    const f = d.fields;
    d.list = d.rows.map((r) => Object.fromEntries(f.map((k, i) => [k, r[i]])));
    d.byName = new Map(d.list.map((p) => [p.name, p]));
    d.byHost = new Map();
    for (const p of d.list) {
      if (!d.byHost.has(p.host)) d.byHost.set(p.host, []);
      d.byHost.get(p.host).push(p);
    }
  }
  return d;
}

// ---- text for one planet ----
export const distText = (pc) => (pc ? `${sig(pc * PC_LY, pc * PC_LY < 100 ? 2 : 3)} light years` : 'distance not known');
/** A planet's size for a table: its measured radius, else its mass (a minimum from radial velocity), else the
 * archive's estimated radius. */
export function sizeCell(p) {
  if (p.radius && p.radius_kind === 'measured') return `radius ${sig(p.radius, 3)}`;
  if (p.mass && p.mass_kind !== 'est') return `mass ${p.mass_kind === 'msini' ? '≥ ' : ''}${sig(p.mass, 3)}`;
  if (p.radius) return `radius ${sig(p.radius, 3)} <span class="s">estimated</span>`;
  if (p.mass) return `mass ${sig(p.mass, 3)} <span class="s">estimated</span>`;
  return '—';
}
export function zoneText(p) {
  if (p.hz_nasa === null || p.hz_nasa === undefined) return 'not known (no starlight figure)';
  const t = p.hz_temp === 2 ? 'inside (conservative)' : p.hz_temp === 1 ? 'inside the wider, optimistic zone only'
    : p.hz_temp === 0 ? 'outside' : 'not worked out (star outside 2,600–7,200 K)';
  return `NASA's rule: ${p.hz_nasa ? 'inside' : 'outside'} · with the star's temperature: ${t}`;
}
export const planetUrl = (name) => `explorer.html?p=${encodeURIComponent(name)}`;
export const archiveUrl = (host) => `https://exoplanetarchive.ipac.caltech.edu/overview/${encodeURIComponent(host)}`;
