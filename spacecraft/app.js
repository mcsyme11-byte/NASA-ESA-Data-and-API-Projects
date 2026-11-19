// NASA and ESA Data Projects · Spacecraft, right now · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// The page around the map (spacemap.js): views, filters, the list (nearest to Earth first), the card for the chosen
// craft, time, and share links. Data: catalogue.json (mission facts, checked by hand), data/positions.json
// (NASA/JPL Horizons), data/tle.json (CelesTrak), data/links.json (catalogue links that stopped answering), and since
// Nov 14, 2026 past.json (past missions, checked by hand) with data/routes.json (their routes, from Horizons).

import { SpaceMap, craftPos, relAt, parentAt, R_EARTH, R_MOON, R_MARS, AU_KM, jdFromMs, msFromJd } from './spacemap.js';
import { satrecOf } from '../shared/sats.js';
import { shareButton, linkWith, takeShared } from '../asteroid-tracker/share.js';
import { reloadPage } from '../shared/reload.js?v=2026111902';

const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (n, d = 0) => n.toLocaleString('en-CA', { minimumFractionDigits: d, maximumFractionDigits: d });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthText = (s) => { const [y, m, d] = s.split('-'); return d ? `${Number(d)} ${MONTHS[m - 1]} ${y}` : m ? `${MONTHS[m - 1]} ${y}` : y; };
const LIGHT_KM_S = 299792.458;

const VIEWS = {
  solar: { center: 'Sun', viewR: 6, label: 'Solar system' },
  near: { center: 'Earth', viewR: 0.012, label: 'Near Earth' },
  orbit: { center: 'Earth', viewR: 0.0003, label: 'Earth orbit' },
  moon: { center: 'Moon', viewR: 0.000045, label: 'Moon' },
  mars: { center: 'Mars', viewR: 0.00013, label: 'Mars' },
};
const ANGLES = { top: 0, tilt: 55, side: 86 };
const AGENCIES = ['All', 'NASA', 'ESA', 'JAXA', 'ISRO', 'CNSA', 'Other'];
const MAIN_AGENCY = new Set(['NASA', 'ESA', 'JAXA', 'ISRO', 'CNSA']);
const KINDS = [['all', 'All'], ['station', 'Stations'], ['telescope', 'Telescopes'], ['planetary', 'Planet missions'], ['sun', 'Sun'], ['surface', 'Landers and rovers'], ['earth', 'Earth watchers']];
const KIND_WORD = { station: 'Crewed station', telescope: 'Telescope', planetary: 'Planetary mission', sun: 'Watching the Sun', surface: 'Rover', earth: 'Watching Earth', capsule: 'Moon flight' };
const kindWord = (i) => (i.kind === 'surface' && i.past ? 'Lander' : KIND_WORD[i.kind] || '') + (i.crewed && i.kind === 'capsule' ? ', crewed' : '');
const SHOWS = [['active', 'Active'], ['past', 'Past missions'], ['fleet', 'Earth-orbit fleet']];
const MISSIONS = [['all', 'All'], ['big', 'Big'], ['small', 'Small'], ['sat', 'Satellites'], ['crewed', 'Crewed']];
const year = (s) => s.slice(0, 4);

const getJson = (u) => fetch(u, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))));
const map = new SpaceMap($('#scMap'), { viewR: 6, tilt: 55, spin: -20 });
let all = [], view = 'solar', agency = 'All', kind = 'all', q = '', live = true, speed = 0, updated = '', broken = new Set();
let show = { active: true, past: false, fleet: false }, mission = 'all', counts = { active: 0, past: 0, fleet: 0 };
const earth = (j) => map.earthAt(j);

// ---------------------------------------------------------------- loading
const shared = takeShared(['craft', 'v']);
// again: the reload button (added Nov 19, 2026): the files read afresh, the view and the chosen craft kept
async function load(again) {
  $('#scState').hidden = true;
  const [cat, pos, tle, links, past, routes] = await Promise.allSettled([getJson('catalogue.json'), getJson('data/positions.json'), getJson('data/tle.json'),
    getJson('data/links.json'), getJson('past.json'), getJson('data/routes.json')]);
  if (cat.status !== 'fulfilled' || (pos.status !== 'fulfilled' && tle.status !== 'fulfilled')) {
    if (again) return false;                   // a failed reload keeps the map as it was; the button says so
    state('The spacecraft positions could not be loaded. Check the connection and <button class="linkbtn" type="button" data-retry>try again</button>.');
    $('#scList').innerHTML = '<div class="state small">Nothing to list yet.</div>';
    $('#scCount').textContent = 'Positions could not be loaded';
    return false;
  }
  const P = pos.status === 'fulfilled' ? pos.value : { craft: {} }, T = tle.status === 'fulfilled' ? tle.value : { sats: [] };
  if (links.status === 'fulfilled') broken = new Set(links.value.broken || []);
  const tleBy = Object.fromEntries((T.sats || []).map((s) => [s.key, s]));
  all = [];
  for (const info of cat.value.craft) {
    if (info.src.tle) {
      const t = tleBy[info.key], rec = t && satrecOf(t);
      if (rec) all.push({ key: info.key, info, parent: 'Earth', rec, tle: t });
    } else if (info.src.site) {                // a rover at a fixed place on Mars
      all.push({ key: info.key, info, parent: info.src.center, site: info.src.site, local: true });
    } else {
      const s = P.craft && P.craft[info.key];
      if (s && s.xyz && s.xyz.length >= 6) {
        const samples = [s.jd0, s.step];
        for (const v of s.xyz) samples.push(v / AU_KM);
        all.push({ key: info.key, id: info.key, info, parent: s.parent, samples, local: !!info.src.local, horizons: s.horizons });
      }
    }
  }
  // past missions: where each rests now, and its route for the replay
  const R = routes.status === 'fulfilled' ? routes.value : { craft: {}, now: {} };
  const samplesOf = (s) => { const out = [s.jd0, s.step]; for (const v of s.xyz) out.push(v / AU_KM); return out; };
  for (const info of past.status === 'fulfilled' ? past.value.craft : []) {
    info.past = true;
    const r = R.craft && R.craft[info.key], d = R.now && R.now[info.key], rs = info.rest;
    const route = r && r.xyz && r.xyz.length >= 6 ? { key: info.key + ':route', parent: r.parent, samples: samplesOf(r) } : null;
    let rest = null, parent = 'Sun', local = false;
    if (rs && rs.site) { rest = { parent: 'Mars', site: rs.site, local: true }; parent = 'Mars'; local = true; }
    else if (rs && rs.body) { rest = { body: rs.body }; if (rs.body === 'Moon') { parent = 'Moon'; local = true; } }
    else if (rs === 'drift' && d && d.xyz) rest = { parent: 'Sun', samples: samplesOf(d) };
    all.push({ key: info.key, info, past: true, parent, local, route, rest });
  }
  counts = { active: all.filter((c) => !c.past && !c.info.fleet).length, past: all.filter((c) => c.past).length, fleet: all.filter((c) => c.info.fleet).length };
  map.craft = all;
  updated = [P.updated, T.updated].filter(Boolean).sort().pop() || '';
  if (tle.status !== 'fulfilled') note('The satellites in Earth orbit could not be loaded just now; the rest of the map works.');
  else if (pos.status !== 'fulfilled') note('The deep-space positions could not be loaded just now; the satellites in Earth orbit work.');
  chips(); applyFilter();
  if (again) {
    if (map.sel && !map.byKey(map.sel)) unselect();
    map.request();
    return tle.status === 'fulfilled' && pos.status === 'fulfilled';
  }
  if (shared && shared.v && VIEWS[shared.v]) setViewName(shared.v, true);
  if (shared && shared.craft && map.byKey(shared.craft)) select(shared.craft, true);
  tick();
  return true;
}
reloadPage($('#scReload'), () => load(true));
function state(html) { const s = $('#scState'); s.innerHTML = html; s.hidden = false; const b = s.querySelector('[data-retry]'); if (b) b.addEventListener('click', () => load()); }
function note(text) { state(`<span>${esc(text)}</span>`); setTimeout(() => { $('#scState').hidden = true; }, 8000); }

// ---------------------------------------------------------------- views and angle
function setViewName(v, quick) {
  view = v;
  $$('.views [data-v]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === v));
  map.setView({ center: VIEWS[v].center, viewR: VIEWS[v].viewR, panX: 0, panY: 0 });
  if (!quick) map.request();
}
$$('.views [data-v]').forEach((b) => b.addEventListener('click', () => setViewName(b.dataset.v)));
$$('[data-a]').forEach((b) => b.addEventListener('click', () => { map.setView({ tilt: ANGLES[b.dataset.a] }); markAngle(); }));
function markAngle() { $$('[data-a]').forEach((b) => b.setAttribute('aria-pressed', Math.abs(map.tilt - ANGLES[b.dataset.a]) < 1)); }
map.onView = markAngle;
$('#zIn').addEventListener('click', () => { map.setView({ viewR: map.viewR / 1.6 }); });
$('#zOut').addEventListener('click', () => { map.setView({ viewR: map.viewR * 1.6 }); });
$('#zPan').addEventListener('click', () => { map.panMode = !map.panMode; $('#zPan').setAttribute('aria-pressed', map.panMode); });

// ---------------------------------------------------------------- filters and list
function chips() {
  $('#scAgency').innerHTML = AGENCIES.map((a) => `<button type="button" class="chip" data-ag="${a}" aria-pressed="${a === agency}">${a}</button>`).join('');
  $('#scKind').innerHTML = KINDS.map(([k, l]) => `<button type="button" class="chip" data-kind="${k}" aria-pressed="${k === kind}">${l}</button>`).join('');
  $('#scShow').innerHTML = SHOWS.map(([k, l]) => `<button type="button" class="chip" data-show="${k}" aria-pressed="${show[k]}">${l}</button>`).join('');
  $('#scMission').innerHTML = MISSIONS.map(([k, l]) => `<button type="button" class="chip" data-mission="${k}" aria-pressed="${k === mission}">${l}</button>`).join('');
}
$('#scShow').addEventListener('click', (e) => { const b = e.target.closest('[data-show]'); if (!b) return; show[b.dataset.show] = !show[b.dataset.show]; chips(); applyFilter(); });
$('#scMission').addEventListener('click', (e) => { const b = e.target.closest('[data-mission]'); if (!b) return; mission = b.dataset.mission; chips(); applyFilter(); });
$('#scAgency').addEventListener('click', (e) => { const b = e.target.closest('[data-ag]'); if (!b) return; agency = b.dataset.ag; chips(); applyFilter(); });
$('#scKind').addEventListener('click', (e) => { const b = e.target.closest('[data-kind]'); if (!b) return; kind = b.dataset.kind; chips(); applyFilter(); });
let qt = null;
$('#scQ').addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { q = $('#scQ').value.trim().toLowerCase(); applyFilter(); }, 100); });
function matches(c) {
  const i = c.info;
  if (agency !== 'All' && !(agency === 'Other' ? i.agencies.some((a) => !MAIN_AGENCY.has(a)) : i.agencies.includes(agency))) return false;
  if (!(c.past ? show.past : i.fleet ? show.fleet : show.active)) return false;
  if (kind !== 'all' && i.kind !== kind) return false;
  if (mission === 'big' && i.size !== 'big') return false;
  if (mission === 'small' && i.size !== 'small') return false;
  if (mission === 'sat' && !c.rec) return false;
  if (mission === 'crewed' && !i.crewed) return false;
  if (q && !`${i.name} ${i.full || ''} ${i.agencies.join(' ')} ${i.where || ''} ${kindWord(i)} ${i.past ? 'past ' + i.end_word : ''}`.toLowerCase().includes(q)) return false;
  return true;
}
let listed = [];
function applyFilter() {
  const shown = all.filter(matches);
  map.shown = shown.length === all.length ? null : new Set(shown.map((c) => c.key));
  map.request();
  const E = earth(map.jd);
  listed = shown.map((c) => { const p = map.pos(c); return { c, d: p ? Math.hypot(p[0] - E[0], p[1] - E[1], p[2] - E[2]) : Infinity }; }).sort((a, b) => a.d - b.d);
  $('#scListN').textContent = `${shown.length}${shown.length === all.length ? '' : ' of ' + all.length} · by distance from Earth`;
  $('#scList').innerHTML = listed.length ? listed.map(({ c, d }) => c.past
    ? `<button type="button" class="sc-row is-past" data-key="${c.key}" aria-pressed="${c.key === map.sel}">
      <span class="n">${esc(c.info.name)}<small>past</small></span><span class="d">${year(c.info.launch) === year(c.info.ended) ? year(c.info.launch) : `${year(c.info.launch)}–${year(c.info.ended)}`}</span>
      <span class="a">${esc(c.info.agencies.join(' · '))} · ${esc(c.info.end_word)}</span></button>`
    : `<button type="button" class="sc-row" data-key="${c.key}" aria-pressed="${c.key === map.sel}">
      <span class="n">${esc(c.info.name)}</span><span class="d">${esc(distWord(c, d))}</span>
      <span class="a">${esc(c.info.agencies.join(' · '))}${c.info.where ? ' · ' + esc(c.info.where) : ''}</span></button>`).join('')
    : `<div class="state small">No spacecraft match. <button class="linkbtn" type="button" id="scClear">Show all</button></div>`;
  const clr = $('#scClear');
  if (clr) clr.addEventListener('click', () => { agency = 'All'; kind = 'all'; mission = 'all'; show = { active: true, past: true, fleet: true }; q = ''; $('#scQ').value = ''; chips(); applyFilter(); });
}
function distWord(c, dAu) {
  if (!Number.isFinite(dAu)) return '';
  if (c.parent === 'Earth' && c.rec) { const r = relAt(c, map.jd); return r ? `${fmt(Math.hypot(...r) * AU_KM - R_EARTH)} km up` : ''; }
  if (c.parent === 'Mars' && c.info.kind === 'surface') return 'on Mars';
  if (c.parent === 'Mars') return 'at Mars';
  if (c.parent === 'Moon') return 'at the Moon';
  const km = dAu * AU_KM;
  if (km < 1e7) return `${fmt(km / 1e6, 1)} million km`;
  return `${dAu >= 10 ? fmt(dAu) : fmt(dAu, dAu < 1 ? 2 : 1)} au`;
}
$('#scList').addEventListener('click', (e) => { const b = e.target.closest('[data-key]'); if (b) select(b.dataset.key); });

// ---------------------------------------------------------------- choosing a craft
function viewFor(c) {
  if (c.past) {
    if (c.rest && c.rest.site) return { v: 'mars' };
    if (c.parent === 'Moon') return { v: 'moon', viewR: 0.00005 };
    const p = map.pos(c), d = p ? Math.hypot(...p) : 6;
    return { v: 'solar', viewR: Math.min(240, Math.max(1.6, d * 1.25)) };
  }
  if (c.parent === 'Mars' || c.parent === 'Moon') {      // far orbits (Hope reaches 43,000 km): zoom out to fit
    const v = c.parent === 'Mars' ? 'mars' : 'moon', r = relAt(c, map.jd);
    return { v, viewR: r ? Math.max(VIEWS[v].viewR, Math.hypot(...r) * 1.35) : VIEWS[v].viewR };
  }
  if (c.parent === 'Earth' && c.rec) { const r = relAt(c, map.jd); const R = r ? Math.hypot(...r) : 0.0003; return { v: 'orbit', viewR: Math.max(VIEWS.orbit.viewR, R * 1.35) }; }
  if (c.parent === 'Earth') return { v: 'near' };
  const p = map.pos(c), d = p ? Math.hypot(...p) : 6;
  return { v: 'solar', viewR: Math.min(240, Math.max(1.6, d * 1.25)) };
}
function select(key, fromShare) {
  const c = map.byKey(key);
  if (!c) return;
  if (rp && rp.c.key !== key) stopReplay(true);
  map.sel = key; map.showPath = true;
  const f = viewFor(c);
  setViewName(f.v, true);
  if (f.viewR) map.setView({ viewR: f.viewR });
  $$('.sc-row').forEach((b) => b.setAttribute('aria-pressed', b.dataset.key === key));
  card(c);
  if (!fromShare && matchMedia('(max-width: 900px)').matches) $('#scFrame').scrollIntoView({ block: 'start', behavior: 'smooth' });
  map.request();
}
function unselect() { if (rp) stopReplay(true); map.sel = null; if (map.center && map.center.craft) map.setView({ center: VIEWS[view].center, panX: 0, panY: 0 }); $('#scCard').hidden = true; $$('.sc-row').forEach((b) => b.setAttribute('aria-pressed', 'false')); map.request(); }
map.onTap = (e) => {
  const b = map.pick(e.clientX, e.clientY, 16);
  if (!b) return;
  if (b.kind === 'craft') select(b.key);
  else if (b.kind === 'cluster') setViewName(b.group === 'Mars' ? 'mars' : map.viewR > 0.05 ? 'near' : 'orbit');
  else if (b.kind === 'planet' && (b.name === 'Mars' || b.name === 'Earth')) setViewName(b.name === 'Mars' ? 'mars' : 'near');
  else if (b.kind === 'moon') setViewName('moon');
};

// ---------------------------------------------------------------- the card
function figures(c) {
  const jd = map.jd, p = map.pos(c, jd), E = earth(jd), out = [];
  if (c.past && !(rp && rp.c === c)) {
    if (!p || !c.rest || c.rest.body === 'Moon' || c.rest.site) return [];
    const dE = Math.hypot(p[0] - E[0], p[1] - E[1], p[2] - E[2]) * AU_KM;
    return [['From Earth now', dE < 1e7 ? `${fmt(dE / 1e6, 2)} million km` : `${fmt(dE / AU_KM, dE / AU_KM < 10 ? 2 : 1)} au`, `light takes ${lightText(dE)}`],
      ['From the Sun now', `${fmt(Math.hypot(...p), 2)} au`, c.rest.body ? `at ${c.rest.body}` : 'drifting']];
  }
  if (!p) return [['Position', 'outside the data for this date']];
  const dE = Math.hypot(p[0] - E[0], p[1] - E[1], p[2] - E[2]) * AU_KM, dS = Math.hypot(...p);
  const step = c.rec || c.local ? 1 / 1440 : 0.05, p1 = map.pos(c, jd - step), p2 = map.pos(c, jd + step);
  const vSun = p1 && p2 ? Math.hypot(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]) * AU_KM / (2 * step * 86400) : null;
  if (c.rec) {
    const r = relAt(c, jd), r1 = relAt(c, jd - 1 / 1440), r2 = relAt(c, jd + 1 / 1440);
    const h = Math.hypot(...r) * AU_KM - R_EARTH, v = Math.hypot(r2[0] - r1[0], r2[1] - r1[1], r2[2] - r1[2]) * AU_KM / 120;
    const period = 2 * Math.PI / c.rec.no;
    out.push(['Height', `${fmt(h)} km`, 'above the surface'], ['Speed', `${fmt(v, 2)} km/s`, `${fmt(v * 3600)} km/h`],
      ['Once round', period < 180 ? `${fmt(period)} min` : period < 2880 ? `${fmt(period / 60, 1)} hours` : `${fmt(period / 1440, 1)} days`, 'one orbit']);
  } else if (c.local) {
    const r = relAt(c, jd), R = c.parent === 'Mars' ? R_MARS : R_MOON;
    if (c.info.kind === 'surface') out.push(['Where', c.info.where, 'on the surface']);
    else if (r) {
      const r1 = relAt(c, jd - 1 / 1440), r2 = relAt(c, jd + 1 / 1440);
      out.push(['Height', `${fmt(Math.hypot(...r) * AU_KM - R)} km`, `above ${c.parent === 'Mars' ? 'Mars' : 'the Moon'}`]);
      if (r1 && r2) out.push(['Speed', `${fmt(Math.hypot(r2[0] - r1[0], r2[1] - r1[1], r2[2] - r1[2]) * AU_KM / 120, 2)} km/s`, `around ${c.parent === 'Mars' ? 'Mars' : 'the Moon'}`]);
    }
    out.push(['From Earth', dE > 1e7 ? `${fmt(dE / AU_KM, 2)} au` : `${fmt(dE)} km`, `light takes ${lightText(dE)}`]);
  } else {
    out.push(['From Earth', dE < 1e7 ? `${fmt(dE / 1e6, 2)} million km` : `${fmt(dE / AU_KM, dE / AU_KM < 10 ? 2 : 1)} au`, `light takes ${lightText(dE)}`]);
    out.push(['From the Sun', `${fmt(dS, dS < 10 ? 2 : 1)} au`, `${fmt(dS * AU_KM / 1e6)} million km`]);
    if (vSun) out.push(['Speed', `${fmt(vSun, 1)} km/s`, 'relative to the Sun']);
  }
  return out;
}
function lightText(km) { const s = km / LIGHT_KM_S; return s < 60 ? `${fmt(s, 1)} s` : s < 3600 ? `${fmt(s / 60, 1)} min` : `${fmt(s / 3600, 1)} hours`; }
function pastCard(c) {
  const i = c.info, el = $('#scCard');
  const links = (i.links || []).filter((l) => !broken.has(l.url));
  links.push({ label: 'NASA/JPL Horizons: its route data', url: 'https://ssd.jpl.nasa.gov/horizons/' });
  const yrs = (Date.parse(i.ended) - Date.parse(i.launch)) / (365.25 * 864e5);
  const lasted = yrs >= 1.5 ? `after ${fmt(yrs)} years` : yrs >= 2 / 12 ? `after ${fmt(yrs * 12)} months` : `after ${fmt(yrs * 365.25)} days`;
  el.innerHTML = `
    <div class="cc-top"><div><div class="lbl">${esc(i.agencies.join(' · '))} · ${esc(kindWord(i))} · past</div>
      <h3>${esc(i.name)}</h3>${i.full ? `<div class="cc-full">${esc(i.full)}</div>` : ''}</div>
      <button class="cc-x" type="button" aria-label="Close">×</button></div>
    <dl class="cc-fig" id="ccFig"></dl>
    <dl class="cc-fig cc-launch"><div><dt>Launched</dt><dd>${esc(monthText(i.launch))}<span>${esc(i.vehicle)}</span></dd></div>
      <div><dt>Ended</dt><dd>${esc(monthText(i.ended))}<span>${esc(lasted)}</span></dd></div></dl>
    <p class="cc-about">${esc(i.about)}</p>
    <div class="cc-end"><span class="lbl">How it ended</span>${esc(i.end)}</div>
    ${i.timeline && i.timeline.length ? `<div class="lbl">Timeline</div><ol class="cc-tl">${i.timeline.map(([d, t]) => `<li><span>${esc(monthText(d))}</span>${esc(t)}</li>`).join('')}</ol>` : ''}
    <div class="lbl">Read more</div>
    <ul class="cc-links">${links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} <span class="ext">↗</span></a></li>`).join('')}</ul>
    <div class="cc-act">
      ${c.route ? `<button class="btn" type="button" id="ccReplay" aria-pressed="${!!(rp && rp.c === c)}">Replay its route</button>` : ''}
      <button class="btn ghost" type="button" id="ccShare">Share</button>
    </div>
    <p class="sharemsg" id="ccShareMsg" hidden></p>
    <p class="note">${c.route ? 'Route: NASA/JPL Horizons. ' : ''}${c.rest ? 'Drawn in grey ' + (c.rest.samples ? 'where Horizons places it today.' : 'where it rests now.') : 'Not drawn on the map now: ' + esc(i.end_word) + '.'} Mission facts: ${esc(i.agencies.slice(0, 2).join(' and '))}.</p>`;
  el.hidden = false;
  figs(c);
  el.querySelector('.cc-x').addEventListener('click', unselect);
  const b = $('#ccReplay');
  if (b) b.addEventListener('click', () => (rp && rp.c === c ? stopReplay() : startReplay(c)));
  shareButton($('#ccShare'), $('#ccShareMsg'), () => linkWith({ craft: c.key, v: view }), `${i.name}, on the spacecraft map`);
}
function card(c) {
  if (c.past) return pastCard(c);
  const i = c.info, el = $('#scCard');
  const links = (i.links || []).filter((l) => !broken.has(l.url));
  links.push(c.rec ? { label: 'CelesTrak: its orbital elements', url: 'https://celestrak.org/' } : { label: 'NASA/JPL Horizons: its position data', url: 'https://ssd.jpl.nasa.gov/horizons/' });
  const today = new Date(msFromJd(map.jd)).toISOString().slice(0, 7);
  el.innerHTML = `
    <div class="cc-top"><div><div class="lbl">${esc(i.agencies.join(' · '))} · ${esc(kindWord(i))}${(i.tags || []).includes('military') ? ' · military' : ''}</div>
      <h3>${esc(i.name)}</h3>${i.full ? `<div class="cc-full">${esc(i.full)}</div>` : ''}</div>
      <button class="cc-x" type="button" aria-label="Close">×</button></div>
    <dl class="cc-fig" id="ccFig"></dl>
    <dl class="cc-fig cc-launch"><div><dt>Launched</dt><dd>${esc(monthText(i.launch))}<span>${esc(i.vehicle)}</span></dd></div></dl>
    <p class="cc-about">${esc(i.about)}</p>
    ${i.timeline && i.timeline.length ? `<div class="lbl">Timeline</div><ol class="cc-tl">${i.timeline.map(([d, t]) => `<li class="${d.slice(0, 7) > today ? 'next' : ''}"><span>${esc(monthText(d))}</span>${esc(t)}</li>`).join('')}</ol>` : ''}
    <div class="lbl">Read more</div>
    <ul class="cc-links">${links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} <span class="ext">↗</span></a></li>`).join('')}</ul>
    <div class="cc-act">
      <button class="btn" type="button" id="ccFollow" aria-pressed="${!!(map.center && map.center.craft === c.key)}">Follow it</button>
      <button class="btn ghost" type="button" id="ccPath" aria-pressed="${map.showPath}">Show its path</button>
      <button class="btn ghost" type="button" id="ccShare">Share</button>
      ${c.key === 'iss' || c.key === 'tiangong' ? `<a class="btn ghost" href="../sky-finder/?find=${c.key}">See it from here</a>` : ''}
    </div>
    <p class="sharemsg" id="ccShareMsg" hidden></p>
    <p class="note">Position: ${c.rec ? `CelesTrak orbital elements of ${esc(c.tle.epoch)} UTC, worked out in your browser (SGP4)` : 'NASA/JPL Horizons'}. Mission facts: ${esc(i.agencies.slice(0, 2).join(' and '))}.</p>`;
  el.hidden = false;
  figs(c);
  el.querySelector('.cc-x').addEventListener('click', unselect);
  $('#ccFollow').addEventListener('click', () => {
    const on = !(map.center && map.center.craft === c.key);
    map.setView(on ? { center: { craft: c.key }, panX: 0, panY: 0 } : { center: VIEWS[view].center, panX: 0, panY: 0 });
    $('#ccFollow').setAttribute('aria-pressed', on);
  });
  $('#ccPath').addEventListener('click', () => { map.showPath = !map.showPath; $('#ccPath').setAttribute('aria-pressed', map.showPath); map.request(); });
  shareButton($('#ccShare'), $('#ccShareMsg'), () => linkWith({ craft: c.key, v: view }), `${i.name}, on the spacecraft map`);
}
function figs(c) {
  const el = $('#ccFig'); if (!el) return;
  el.innerHTML = figures(c).map(([k, v, s]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}${s ? `<span>${esc(s)}</span>` : ''}</dd></div>`).join('');
}

// ---------------------------------------------------------------- the route replay (past missions)
let rp = null;                                   // { c, jd0, jd1, playing, rate (days a second) }
const RATES = [1, 7, 30.44, 365.25];
function startReplay(c) {
  const s = c.route.samples, n = (s.length - 2) / 3, jd0 = s[0], jd1 = s[0] + (n - 1) * s[1];
  let far = 0;
  for (let k = 0; k < n; k++) far = Math.max(far, Math.hypot(s[2 + 3 * k], s[3 + 3 * k], s[4 + 3 * k]));
  const want = (jd1 - jd0) / 40;                  // about 40 seconds for the whole route
  rp = { c, jd0, jd1, playing: true, rate: RATES.reduce((a, b) => (Math.abs(Math.log(b / want)) < Math.abs(Math.log(a / want)) ? b : a)) };
  live = false; speed = 0; marks();
  map.replay = c.key; map.sel = c.key; map.showPath = true; map.jd = jd0;
  if (c.route.parent === 'Sun') { view = 'solar'; map.setView({ center: 'Sun', viewR: Math.min(240, Math.max(1.6, far * 1.15)), panX: 0, panY: 0 }); }
  else { view = 'near'; map.setView({ center: 'Earth', viewR: Math.max(0.003, far * 1.2), panX: 0, panY: 0 }); }
  $$('.views [data-v]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.v === view));
  const tl = (c.info.timeline || []).filter(([d]) => d.length >= 7);
  const mid = tl.length > 2 ? tl[Math.floor(tl.length / 2)] : null;
  const late = jd0 - jdFromMs(Date.parse(c.info.launch)) > 30;   // Horizons has only part of the route (Hayabusa)
  const cut = (s) => (s.length <= 40 ? s : s.slice(0, s.lastIndexOf(' ', 38)) + '…');
  $('#rpMarks').innerHTML = `<span>${late ? `${esc(monthText(msDate(jd0)))} route starts` : `${esc(monthText(c.info.launch.slice(0, 7)))} launch`}</span>${mid ? `<span>${esc(monthText(mid[0].slice(0, 7)))}: ${esc(cut(mid[1].split(';')[0]))}</span>` : ''}<span>${esc(monthText(msDate(jd1)))} ${c.route.parent === 'Sun' && c.info.rest && c.info.rest.site ? 'landing' : 'end'}</span>`;
  $('#scPlay').hidden = false; $('#scCard').hidden = true;   // the whole map for the route; the card comes back after
  rpMarks(); rpText();
  const b = $('#ccReplay'); if (b) b.setAttribute('aria-pressed', 'true');
  if (matchMedia('(max-width: 900px)').matches) $('#scFrame').scrollIntoView({ block: 'start', behavior: 'smooth' });
  map.request();
}
function stopReplay(quiet) {
  if (!rp) return;
  const c = rp.c;
  rp = null; map.replay = null; $('#scPlay').hidden = true;
  if (!quiet && map.sel === c.key) card(c);
  const b = $('#ccReplay'); if (b) b.setAttribute('aria-pressed', 'false');
  live = true; marks();
  if (!quiet) setViewName(view);
  map.request();
}
const msDate = (jd) => new Date(msFromJd(jd)).toISOString().slice(0, 7);
function rpMarks() {
  $('#rpPlay').textContent = rp.playing ? '❚❚' : '▶'; $('#rpPlay').setAttribute('aria-label', rp.playing ? 'Pause' : 'Play');
  $$('[data-rp]').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.rp) === rp.rate));
}
function rpText() {
  const d = new Date(msFromJd(map.jd)), ymd = d.toISOString().slice(0, 10);
  const ev = (rp.c.info.timeline || []).filter(([t]) => t <= ymd).pop();
  $('#rpWhat').innerHTML = `<b>${esc(rp.c.info.name)}</b> · ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}${ev ? ` · ${esc(ev[1])}` : ''}`;
  $('#rpRange').value = Math.round((map.jd - rp.jd0) / (rp.jd1 - rp.jd0) * 1000);
}
$('#rpPlay').addEventListener('click', () => { if (!rp) return; if (map.jd >= rp.jd1) map.jd = rp.jd0; rp.playing = !rp.playing; rpMarks(); });
$('#rpClose').addEventListener('click', () => stopReplay());
$('#rpRange').addEventListener('input', () => { if (!rp) return; rp.playing = false; rpMarks(); map.jd = rp.jd0 + $('#rpRange').value / 1000 * (rp.jd1 - rp.jd0); rpText(); map.request(); });
$$('[data-rp]').forEach((b) => b.addEventListener('click', () => { if (!rp) return; rp.rate = Number(b.dataset.rp); rp.playing = true; rpMarks(); }));

// ---------------------------------------------------------------- time
$('#tNow').addEventListener('click', () => { if (rp) stopReplay(); live = true; speed = 0; marks(); });
$$('[data-speed]').forEach((b) => b.addEventListener('click', () => { if (rp) stopReplay(); const v = Number(b.dataset.speed); if (speed === v) { speed = 0; } else { speed = v; live = false; } marks(); }));
function marks() {
  $('#tNow').setAttribute('aria-pressed', live);
  $$('[data-speed]').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.speed) === speed));
  $('#scLive').hidden = !live;
}
let last = performance.now(), lastSlow = 0;
const MIN_JD = jdFromMs(Date.now()) - 60, MAX_JD = jdFromMs(Date.now()) + 365;
function tick() {
  const t = performance.now(), dt = Math.min(0.25, (t - last) / 1000); last = t;
  let changed = false;
  if (rp) {
    if (rp.playing) {
      map.jd = Math.min(rp.jd1, map.jd + rp.rate * dt); changed = true;
      if (map.jd >= rp.jd1) { rp.playing = false; rpMarks(); }
    }
  } else if (live) {
    const jd = jdFromMs(Date.now());
    // close to Earth, satellites move visibly: redraw every frame; further out, twice a second is plenty
    if (map.viewR < 0.002 || map.center && map.center.craft || t - lastSlow > 500) { map.jd = jd; changed = true; lastSlow = t; }
  } else if (speed) {
    map.jd = Math.min(MAX_JD, Math.max(MIN_JD, map.jd + speed * dt / 86400)); changed = true;
    if (map.jd >= MAX_JD) { speed = 0; marks(); }
  }
  if (changed) {
    map.request();
    if (t - (tick.ui || 0) > 500) {
      tick.ui = t;
      const d = new Date(msFromJd(map.jd));
      $('#scDate').textContent = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
      $('#scCount').textContent = `${counts.active} active spacecraft and stations · ${counts.past} past missions · ${counts.fleet} in the Earth-orbit fleet${updated ? ` · positions updated ${updated}` : ''}`;
      if (rp) rpText();
      const c = map.sel && map.byKey(map.sel); if (c) figs(c);
    }
  }
  requestAnimationFrame(tick);
}
marks();
addEventListener('keydown', (e) => { if (e.key === 'Escape' && map.sel) unselect(); });
addEventListener('keydown', (e) => { if (rp && e.key === ' ' && document.activeElement && document.activeElement.closest('#scPlay')) { e.preventDefault(); $('#rpPlay').click(); } });
load();
export { map, craftPos, parentAt };
