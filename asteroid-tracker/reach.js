// NASA and ESA Data Projects · Asteroid Tracker · reach and resources (the mining view) · © 2026 Malcolm Syme ·
// mcsyme11@gmail.com
//
// Shared by mining.html ("Within reach") and the asteroid pages. Reads data/reach.json (NASA/JPL NHATS: round trips
// from Earth orbit) and data/phys.json (NASA/JPL Small-Body Database: spectral type, spin, albedo, density), both
// written by fetch_reach.py, and works out, by the fixed rules below, how hard an asteroid is to reach, what it is
// likely made of, and a verdict.
//
// Rule 1, reach (NHATS's cheapest round trip, from a circular 400 km Earth orbit and back):
//   up to 5 km/s   about as easy as a round trip to orbit around the Moon (about 5 km/s), or easier
//   5 to 9 km/s    between a trip to the Moon's orbit and a landing on the Moon and back (about 9 km/s)
//   9 to 12 km/s   harder than a Moon landing and back, but within NHATS's limit (12 km/s)
//   not listed     no round trip within NHATS's limits (12 km/s, 450 days, 8 days at the asteroid) was found
//   (Moon figures: NASA's NHATS team, "Putting accessibility into context", NASA Technical Reports Server 20150009390.)
// Rule 2, material: the measured spectral type (SMASSII first, then Tholen), by group (TYPES below). An X-group type
//   is split by albedo, as Tholen's E, M and P: below 0.1 dark; 0.1 to 0.3 possibly metal-rich; above 0.3 enstatite.
//   No type: unknown; a measured albedo gives a hint only (below 0.1 likely carbon-rich, 0.1 to 0.3 likely stony).
// Rule 3, size and spin: smaller than 10 m is very small for a mission; spinning once in less than 2.2 hours is
//   faster than a pile of loose rubble can hold together, so it is likely one solid rock, which is harder to land on.
// Rule 4, mining today: always "not realistic today". No mission has extracted resources from an asteroid; the most
//   brought back is OSIRIS-REx's 121.6 g from Bennu (NASA, 2024).
//
// The rocket equation, used in the notes: mass at start ÷ mass at end = e^(Δv ÷ ve), ve the exhaust speed.
//   Example: Δv 5.0 km/s, hydrogen-oxygen engine (ve about 4.4 km/s): e^(5.0 ÷ 4.4) = 3.1, so 68% of the starting
//   mass is propellant; at 9 km/s, 87%.
// Mass from size: m = (π ÷ 6) × D³ × density. Example, Bennu: (π ÷ 6) × (484 m)³ × 1,194 kg/m³ = 7.1 × 10¹⁰ kg.

import { fmt } from '../shared/nasa.js';

export const MOON_ORBIT_DV = 5, MOON_SURFACE_DV = 9, NHATS_MAX_DV = 12;
export const VE_HYDROLOX = 4.4;                                  // km/s, hydrogen-oxygen engine exhaust speed
export const SPIN_BARRIER_H = 2.2;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---------------------------------------------------------------- data
let reachP = null, physP = null;
async function json(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}
// a reload button forgets the files read, so the next request reads them again
export function forgetReach() { reachP = null; physP = null; }

export function loadReach() {
  reachP ||= json(new URL('data/reach.json', import.meta.url)).then((d) => {
    const f = Object.fromEntries(d.fields.map((k, i) => [k, i]));
    const wf = Object.fromEntries(d.window_fields.map((k, i) => [k, i]));
    const rows = d.rows.map((r) => ({
      des: r[f.des], name: r[f.name], spkid: r[f.spkid], h: r[f.h], sizeMin: r[f.size_min], sizeMax: r[f.size_max],
      size: r[f.size], dv: r[f.dv], dur: r[f.dur], fastDv: r[f.fast_dv], fastDur: r[f.fast_dur], nTraj: r[f.n_traj], occ: r[f.occ],
    }));
    const windows = {};
    for (const [des, list] of Object.entries(d.windows || {})) {
      windows[des] = list.map((w) => ({
        period: w[wf.period], launch: w[wf.launch], out: w[wf.out], stay: w[wf.stay], back: w[wf.back], dv: w[wf.dv],
        leave: w[wf.dv_leave_earth], arrive: w[wf.dv_arrive], depart: w[wf.dv_depart], ret: w[wf.dv_return], entry: w[wf.entry_speed],
      }));
    }
    return { updated: d.updated, rows, byDes: new Map(rows.map((r) => [r.des, r])), windows, computed: d.computed || {} };
  });
  return reachP;
}
export function loadPhys() {
  physP ||= json(new URL('data/phys.json', import.meta.url)).then((d) => {
    const f = Object.fromEntries(d.fields.map((k, i) => [k, i]));
    const byDes = new Map();
    for (const r of d.rows) {
      byDes.set(String(r[f.des]), {
        spkid: r[f.spkid], specB: r[f.spec_B], specT: r[f.spec_T], rot: r[f.rot_per], albedo: r[f.albedo],
        density: r[f.density], diameterKm: r[f.diameter], extent: r[f.extent],
      });
    }
    return { updated: d.updated, byDes };
  });
  return physP;
}

// The asteroid's own page on this site: NeoWs uses 2,000,000 + number for numbered asteroids, the SBDB spkid otherwise.
export function pageOf(row) {
  if (/^\d+$/.test(row.des)) return `object.html?id=${2000000 + Number(row.des)}`;
  if (row.spkid) return `object.html?id=${row.spkid}`;
  return nhatsPage(row.des);
}
export const nhatsPage = (des) => `https://cneos.jpl.nasa.gov/nhats/details.html#?des=${encodeURIComponent(des)}`;

// ---------------------------------------------------------------- rule 1, reach
export function reachOf(row) {
  if (!row) return { key: 'none', short: 'Not on the list', text: 'No round trip within NHATS\'s limits (12 km/s, 450 days, 8 days at the asteroid) was found: the hardest group to reach.' };
  const dv = row.dv;
  if (dv <= MOON_ORBIT_DV) return { key: 'easy', short: 'Easy', text: `About as easy as a round trip to orbit around the Moon (about ${MOON_ORBIT_DV} km/s), or easier.` };
  if (dv <= MOON_SURFACE_DV) return { key: 'moderate', short: 'Moderate', text: `Between a trip to orbit around the Moon (about ${MOON_ORBIT_DV} km/s) and a landing on the Moon and back (about ${MOON_SURFACE_DV} km/s).` };
  return { key: 'hard', short: 'Hard', text: `Harder than landing on the Moon and coming back (about ${MOON_SURFACE_DV} km/s), but within NHATS's limit of ${NHATS_MAX_DV} km/s.` };
}

// the rocket equation: share of the mass leaving Earth orbit that is propellant
export const propellantShare = (dv, ve = VE_HYDROLOX) => 1 - Math.exp(-dv / ve);

// ---------------------------------------------------------------- rule 2, material
// group: C carbon-rich, S stony, X X group (split by albedo), V basalt, D dark and primitive, U unknown
const GROUPS = {
  C: { so: 'its most useful resource would be water bound in clay, with carbon, not metal.', label: 'Carbon-rich', filter: 'C', what: 'Dark rock rich in carbon, with clay minerals that hold water in their crystals. Pieces of such asteroids reach Earth as carbonaceous chondrite meteorites.', use: '<b>Water</b> (for drinking, air, and split into rocket propellant in space) and carbon; little free metal.', example: 'Bennu (B) and Ryugu (Cb), both sampled by spacecraft.' },
  S: { so: 'it holds metal only as small grains in rock, and little water.', label: 'Stony', filter: 'S', what: 'Silicate rock with grains of nickel-iron metal mixed in, like ordinary chondrite meteorites.', use: '<b>Metal</b> in small grains, and rock; little water.', example: 'Itokawa, sampled by Hayabusa, and Eros, orbited by NEAR Shoemaker; Didymos, the target of DART and Hera.' },
  M: { so: 'it may be rich in nickel-iron metal, though only a visit could confirm it.', label: 'Possibly metal-rich', filter: 'X', what: 'An X-group spectrum with a moderate albedo, which fits nickel-iron metal, but also some rocks; telescopes alone cannot tell.', use: 'Possibly <b>metal</b> (iron, nickel and the platinum-group metals mixed into them).', example: '16 Psyche, a main-belt asteroid that NASA\'s Psyche mission reaches in 2029.' },
  P: { so: 'it is probably carbon-rich, with water bound in clay.', label: 'Dark X group', filter: 'X', what: 'An X-group spectrum with a dark surface: probably carbon-rich rock, like the C group.', use: 'Probably <b>water</b> and carbon, as for the C group.', example: '' },
  E: { so: 'it is probably a pale, iron-poor rock with little to mine.', label: 'Enstatite', filter: 'X', what: 'An X-group spectrum with a very bright surface: enstatite, a pale, iron-poor rock.', use: 'Little water or free metal.', example: '' },
  X: { so: 'what it is made of stays unclear until its albedo is measured.', label: 'X group', filter: 'X', what: 'An X-group spectrum. Without its albedo (how much light it reflects) it could be metal-rich, stony or dark carbon-rich rock.', use: 'Unclear until its albedo is measured.', example: '' },
  V: { so: 'it is volcanic rock with little water or free metal.', label: 'Basalt', filter: 'O', what: 'Basalt, volcanic rock like the crust of the large asteroid Vesta, which pieces of it may have come from.', use: 'Rock; little water or free metal.', example: '' },
  D: { so: 'it is probably rich in carbon and organic material.', label: 'Dark, primitive', filter: 'O', what: 'Very dark, reddish rock rich in organic material; common in the outer asteroid belt, rare near Earth.', use: 'Carbon and possibly water.', example: '' },
  O: { so: 'what it is made of is unclear.', label: 'Rare type', filter: 'O', what: 'A rare spectral type, not clearly in one of the large groups.', use: 'Unclear.', example: '' },
};
const C_TYPES = /^(B|C|Cb|Cg|Cgh|Ch|CF|CG|CB|F|G)$/i, S_TYPES = /^(S|Sa|Sk|Sl|Sq|Sr|Sv|Q|K|L|Ld|A|R|SQ|SA|SG|SK|SL|SR)$/, X_TYPES = /^(X|Xc|Xe|Xk|XC|XE|XK)$/;

export function typeOf(p) {
  const raw = p && (p.specB || p.specT);
  if (!raw) {
    const a = p && p.albedo;
    const hint = a == null ? '' : a < 0.1 ? 'Its dark surface (albedo ' + fmt(a, 3) + ') suggests carbon-rich rock: a hint, not a measurement.'
      : a <= 0.3 ? 'Its albedo of ' + fmt(a, 2) + ' suggests stony rock: a hint, not a measurement.' : 'Its very bright surface (albedo ' + fmt(a, 2) + ') suggests enstatite or basalt: a hint, not a measurement.';
    return { group: 'U', filter: 'U', label: 'Unknown', code: '', system: '', uncertain: false, measured: false, hint };
  }
  const system = p.specB ? 'SMASSII' : 'Tholen';
  const uncertain = /:/.test(raw);
  let t = raw.replace(/[:]/g, '').replace(/\(.*\)$/, '').trim();
  let g;
  if (C_TYPES.test(t) || /^C/.test(t)) g = 'C';
  else if (S_TYPES.test(t) || /^S/.test(t)) g = 'S';
  else if (X_TYPES.test(t) || t === 'X' || /^X/.test(t)) g = p.albedo == null ? 'X' : p.albedo < 0.1 ? 'P' : p.albedo <= 0.3 ? 'M' : 'E';
  else if (t === 'M') g = 'M';
  else if (t === 'P') g = 'P';
  else if (t === 'E') g = 'E';
  else if (/^V/.test(t)) g = 'V';
  else if (/^(D|T)$/.test(t)) g = 'D';
  else if (/^[A-Z]{2,}$/.test(t) && system === 'Tholen') {      // Tholen's mixed classes, such as SMU: the first letter fits best
    const first = { S: 'S', C: 'C', M: 'M', E: 'E', P: 'P', X: 'X', T: 'D', D: 'D', B: 'C', F: 'C', G: 'C', Q: 'S', V: 'V', A: 'S' }[t[0]];
    g = first || 'O';
  } else g = 'O';
  const G = GROUPS[g];
  return { group: g, filter: G.filter, label: G.label, code: raw, system, uncertain: uncertain || (system === 'Tholen' && t.length > 1 && /^[A-Z]+$/.test(t)), measured: true, what: G.what, use: G.use, so: G.so, example: G.example, hint: '' };
}
export const TYPE_FILTERS = [['all', 'All'], ['C', 'Carbon-rich'], ['S', 'Stony'], ['X', 'X group, maybe metal'], ['O', 'Other types'], ['U', 'Unknown']];

// ---------------------------------------------------------------- rule 3, size and spin
// sizes in metres: { best, min, max, measured }
export function sizeOf(row, p, neowsRange) {
  if (p && p.diameterKm) return { best: p.diameterKm * 1000, min: p.diameterKm * 1000, max: p.diameterKm * 1000, measured: true };
  if (row && row.size) return { best: row.size, min: row.size, max: row.size, measured: true };
  if (row && row.sizeMin) return { best: Math.sqrt(row.sizeMin * row.sizeMax), min: row.sizeMin, max: row.sizeMax, measured: false };
  if (neowsRange) return { best: Math.sqrt(neowsRange.min * neowsRange.max), min: neowsRange.min, max: neowsRange.max, measured: false };
  return null;
}
const DENSITY = { C: [1.2, 2.0], P: [1.2, 2.0], S: [1.9, 2.7], V: [2.5, 3.3], M: [3.4, 4.1], E: [2.0, 3.0], X: [1.2, 4.1], D: [1.2, 2.0], O: [1.2, 3.3], U: [1.2, 2.7] };
export const densityRange = (type) => (DENSITY[type.group] || DENSITY.U).map((d) => fmt(d, 1)).join('–');
// mass in kg: [min, max]; one value when size and density are both measured
export function massOf(size, p, type) {
  if (!size) return null;
  const vol = (d) => Math.PI / 6 * d ** 3;
  const [lo, hi] = p && p.density ? [p.density, p.density] : DENSITY[type.group] || DENSITY.U;
  return [vol(size.min) * lo * 1000, vol(size.max) * hi * 1000];
}
export function tonnes(kg) {
  const t = kg / 1000;
  if (t >= 1e9) return fmt(t / 1e9, t >= 1e10 ? 0 : 1) + ' billion tonnes';
  if (t >= 1e6) return fmt(t / 1e6, t >= 1e7 ? 0 : 1) + ' million tonnes';
  if (t >= 1e3) return fmt(t / 1e3, t >= 1e4 ? 0 : 1) + ' thousand tonnes';
  return fmt(t, t >= 10 ? 0 : 1) + ' tonnes';
}
export function sizeText(s) {
  if (!s) return 'unknown';
  const m = (v) => (v >= 1000 ? fmt(v / 1000, 1) + ' km' : fmt(v, v < 10 ? 1 : 0) + ' m');
  return s.measured ? 'about ' + m(s.best) : `${s.max >= 1000 ? fmt(s.min / 1000, 1) : fmt(s.min, s.min < 10 ? 1 : 0)}–${m(s.max)}`;
}

// ---------------------------------------------------------------- rule 4, the verdict
export function verdict(row, type, size, p) {
  const reach = reachOf(row);
  const small = size && size.max < 10, fast = p && p.rot && p.rot < SPIN_BARRIER_H;
  let head, why = [];
  if (!row) head = 'Hard to reach for a round trip';
  else if (small) head = 'Reachable, but very small';
  else if (row.dv <= MOON_SURFACE_DV) head = 'A realistic target for a robotic sample mission';
  else head = 'Reachable, but costly';
  why.push(row ? `A round trip needs at least ${fmt(row.dv, 1)} km/s: ${reach.text.charAt(0).toLowerCase()}${reach.text.slice(1)}` : reach.text);
  if (type.measured) why.push(`It is ${/group/.test(type.label) ? 'in the ' + type.label.replace(/^D/, 'd') : type.label.toLowerCase()} (type ${esc(type.code)}), so ${type.so}`);
  else why.push('Its spectral type has not been measured, so what it is made of is unknown.');
  if (small) why.push('At under 10 m it is a boulder: a target for a quick look, not for mining.');
  if (fast) why.push(`It turns once every ${fmt(p.rot * 60, 0)} minutes, faster than loose rubble can hold together, so it is probably one solid rock and hard to land on.`);
  why.push('No mission has yet extracted resources from an asteroid, and the most brought back so far is 121.6 g.');
  return { head, why, reach };
}

// ---------------------------------------------------------------- real missions (hand-checked, sources in DATA-SOURCES.md)
export const MISSIONS = [
  { name: 'OSIRIS-REx', agency: 'NASA', badge: 'nasa', target: 'Bennu', des: '101955', type: 'B', size: '490 m', did: 'Collected rock and dust in October 2020 and returned 121.6 g to Earth in September 2023, the largest asteroid sample yet.' },
  { name: 'Hayabusa2', agency: 'JAXA', badge: '', target: 'Ryugu', des: '162173', type: 'Cb', size: '900 m', did: 'Returned 5.4 g in December 2020 (figures from NASA, which received part of the sample).' },
  { name: 'Psyche', agency: 'NASA', badge: 'nasa', target: '16 Psyche (main belt)', des: '', type: 'M', size: 'about 280 km at its widest', did: 'Launched in October 2023, to arrive in 2029; NASA\'s first mission to an asteroid with more metal than rock or ice.' },
  { name: 'Hera', agency: 'ESA', badge: 'esa', target: 'Didymos and its moon Dimorphos', des: '65803', type: 'S', size: '780 m and about 150 m', did: 'Launched in October 2024 to study the crater left by NASA\'s DART impact of 2022; arrival planned for November 2026.' },
];
