// NASA and ESA Data Projects · Orbit Watch · home page · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// The figures at the top come from facts.json (copied by hand from NASA and ESA, with their dates); the count from
// CelesTrak's copy of the catalogue comes from data/heights.json, when the data job has written it.

import { $, load, fmt, big, day, utc } from './common.js';

const put = (k, html) => { const el = $(`[data-f="${k}"]`); if (el) el.innerHTML = html; };

(async () => {
  const [facts, heights] = await Promise.all([load('facts.json'), load('data/heights.json')]);
  const f = facts.data;
  if (!f) { $('#owStats').hidden = true; return; }
  const b = f.nasa.boxScore, e = f.esa.numbers;
  put('nasaTotal', fmt(b.total));
  put('nasaNote', `NASA box score, ${day(b.date)}`);
  put('esaTracked', `≈ ${fmt(e.tracked)}`);
  put('esaNote', `ESA, ${day(e.date)}`);
  put('esaWorking', `≈ ${fmt(e.working)}`);
  put('esaSmall', big(e.from1to10cm));
  put('esaMass', `${fmt(e.tonnes)} <small>t</small>`);
  let two = `NASA's Orbital Debris Program Office counts the objects in the public United States catalogue: ${fmt(b.total)} on ${day(b.date)}. `
    + `ESA's Space Debris Office counts every object that surveillance networks follow regularly, including some that are not in the public catalogue: about ${fmt(e.tracked)} on ${day(e.date)}.`;
  if (heights.data) {
    const n = heights.data.total.reduce((s, v) => s + v, 0);
    two += ` CelesTrak's copy of the public catalogue, used on the tracker, lists ${fmt(n)} objects in Earth orbit (copied ${utc(Date.parse(heights.data.made))}).`;
  }
  $('#owTwo').textContent = two;
})();
