// NASA and ESA Data Projects · Orbit & Space Watch · the tools' latest figures · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Fills the strip of figures at the top of the Space Watch page (added Nov 19, 2026) from the files the tools' data jobs
// save in the repository, so visitors' browsers contact no other service:
//   Tracked in orbit       orbit-watch/data/heights.json   every object in CelesTrak's satellite catalogue, by kind
//   Solar flares           space-weather/data/latest.json  NASA DONKI's flares of the last 7 days, and the strongest
//   Geomagnetic activity   space-weather/data/latest.json  the latest measured Kp (GFZ), named with NOAA's G scale
//   Planets of other stars exoplanets/data/summary.json    the confirmed planets in the NASA Exoplanet Archive
// A figure that cannot be read keeps its dash and says so; the strip is hidden only when none can be read.

const $ = (id) => document.getElementById(id);
const DAY = 86400e3;
const fmt = (n) => n.toLocaleString('en-CA');
const get = (u) => fetch(new URL(u, import.meta.url), { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
// NOAA's names for the Kp levels (as on the Space Weather page)
const level = (k) => (k >= 9 ? 'G5, extreme storm' : k >= 8 ? 'G4, severe storm' : k >= 7 ? 'G3, strong storm' : k >= 6 ? 'G2, moderate storm'
  : k >= 5 ? 'G1, minor storm' : k >= 4 ? 'active' : 'quiet');
const set = (id, value, note) => { $(id).textContent = value; if (note) $(id + 'N').textContent = note; };
const failed = (id) => { $(id + 'N').textContent = 'could not be read just now'; };

const jobs = [
  get('../orbit-watch/data/heights.json').then((h) => {
    const total = h.total.reduce((a, b) => a + b, 0), working = h.total[h.kinds.indexOf('working satellites')];
    set('fObjects', fmt(total), (working ? fmt(working) + ' of them working satellites' : 'objects in the satellite catalogue') + ' · CelesTrak');
  }).catch(() => failed('fObjects')),
  get('../space-weather/data/latest.json').then((s) => {
    const now = Date.now();
    const week = (s.ev && s.ev.flares || []).filter((f) => f.t > now - 7 * DAY);
    const top = week.slice().sort((a, b) => b.flux - a.flux)[0];
    set('fFlares', fmt(week.length), week.length ? 'in the last 7 days, the strongest ' + top.cls + ' · NASA DONKI' : 'in the last 7 days, a quiet week · NASA DONKI');
    const kp = (s.kp || []).filter((k) => k.kind === 'obs').pop();
    if (kp) set('fKp', 'Kp ' + (Math.round(kp.kp * 10) / 10).toString(), level(kp.kp) + ', measured by GFZ');
    else failed('fKp');
  }).catch(() => { failed('fFlares'); failed('fKp'); }),
  get('../exoplanets/data/summary.json').then((e) => {
    set('fPlanets', fmt(e.total), 'confirmed so far · NASA Exoplanet Archive');
  }).catch(() => failed('fPlanets')),
];
Promise.all(jobs).then(() => {
  if (['fObjects', 'fFlares', 'fKp', 'fPlanets'].every((id) => $(id).textContent === '–')) $('figures').hidden = true;
});
