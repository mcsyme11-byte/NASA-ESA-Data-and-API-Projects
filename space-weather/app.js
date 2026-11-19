// NASA and ESA Data Projects · Space Weather · the page · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Reads the live data (live.js), keeps it fresh while the page is open (solar wind and X-rays every 5 minutes, events
// every 10, Kp every 15, pictures every 15), and draws each section. Words for each reading follow written rules
// (below), so the same numbers always give the same words.
import { readEvents, readWind, readXray, readKp, readSaved, readArchive } from './live.js';
import { timeline, line24, kpBars, monthly, emptyBox, hideTip, utc, fmtKp, gName } from './charts.js';
import { chance } from './aurora.js';
import { currentPlace, locate, searchPlaces, setPlace, forgetPlace } from '../shared/place.js';
import { toast } from '../shared/motion.js?v=2026111907';
import { reloadPage, reloadPart, markUpdated } from '../shared/reload.js?v=2026111907';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = (n, d = 0) => (Number.isFinite(n) ? new Intl.NumberFormat('en-CA', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n) : '–');
const HOUR = 36e5, DAY = 864e5;
const local = (ms) => new Date(ms).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
const localDay = (ms) => new Date(ms).toLocaleString('en-CA', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

const S = { ev: null, wind: null, xray: null, kp: null, from: {}, savedAt: null, days: 30, archive: null };

// ---------------------------------------------------------------- the rules for words
// Flare class from peak X-ray flux (W/m²): the letter is the power of ten, the number the multiplier.
function flareClass(flux) {
  if (!(flux > 0)) return '–';
  const [L, base] = flux >= 1e-4 ? ['X', 1e-4] : flux >= 1e-5 ? ['M', 1e-5] : flux >= 1e-6 ? ['C', 1e-6] : flux >= 1e-7 ? ['B', 1e-7] : ['A', 1e-8];
  return L + (Math.floor(flux / base * 10) / 10).toFixed(1);
}
// NOAA radio blackout level from the flare's peak (R1 at M1, R2 at M5, R3 at X1, R4 at X10, R5 at X20)
const rLevel = (flux) => (flux >= 2e-3 ? 'R5, extreme' : flux >= 1e-3 ? 'R4, severe' : flux >= 1e-4 ? 'R3, strong' : flux >= 5e-5 ? 'R2, moderate' : flux >= 1e-5 ? 'R1, minor' : null);
const speedWords = (v) => (v < 400 ? 'slow and calm; typical is about 400' : v < 500 ? 'typical speed' : v < 800 ? 'fast: a stream from a coronal hole, or a CME' : 'very fast: usually a CME passing');
const densWords = (v) => (v > 20 ? 'dense: often the front of a CME or of a fast stream' : 'protons in each cubic centimetre');
const bzWords = (v) => (v <= -10 ? 'far south: a storm is likely if it stays' : v < -2 ? 'pointing south: the door is slightly open' : v > 2 ? 'pointing north: Earth is shielded' : 'near zero: little gets in');
function headline(w, kpNow, xrMax) {
  if (kpNow !== null && kpNow >= 5) return `A geomagnetic storm: Kp ${fmtKp(kpNow)} (${gName(kpNow)})`;
  if (xrMax >= 5e-5) return `Strong flares today (${flareClass(xrMax)})`;
  if (w.bz !== null && w.bz <= -10) return 'Field far south: watch for the aurora';
  const base = kpNow !== null && kpNow >= 4 ? 'Unsettled' : 'Quiet';
  if (w.speed >= 500) return `${base}, in a fast solar wind`;
  if (w.bz !== null && w.bz < -2) return `${base}, with a southward nudge`;
  return base;
}

// ---------------------------------------------------------------- loading, with the saved copy as stand-in
async function load(part) {
  const jobs = { ev: () => readEvents(60), wind: readWind, xray: readXray, kp: readKp };
  const names = part ? [part] : Object.keys(jobs);
  const res = await Promise.allSettled(names.map((n) => jobs[n]()));
  let saved = null;
  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    if (res[i].status === 'fulfilled') { S[n] = res[i].value; S.from[n] = 'live'; continue; }
    if (S.from[n] === 'live') continue;                 // keep the last good live reading
    saved = saved || await readSaved();
    if (saved && saved[n]) { S[n] = saved[n]; S.from[n] = 'saved'; S.savedAt = saved.updated; } else S.from[n] = 'none';
  }
  if (S.ev) S.ev.flares.sort((a, b) => a.t - b.t);
  return res.every((r) => r.status === 'fulfilled');     // for the reload buttons: true when every part was read live
}

function showNotice() {
  const saved = Object.entries(S.from).filter(([, v]) => v === 'saved').map(([k]) => k);
  const none = Object.entries(S.from).filter(([, v]) => v === 'none').map(([k]) => k);
  const word = { ev: 'the events', wind: 'the solar wind', xray: 'the X-rays', kp: 'the Kp index' };
  const list = (a) => a.map((k) => word[k]).join(', ').replace(/, ([^,]*)$/, ' and $1');
  let html = '';
  if (none.length) html += `<div class="notice error"><span class="t">NASA's live service could not be reached for ${list(none)}. Check the internet connection; it is tried again every few minutes.</span><button class="btn small outline" type="button" data-retry>Try again</button></div>`;
  if (saved.length) html += `<div class="notice warn"><span class="t">NASA's live service could not be reached for ${list(saved)}; showing the saved copy from ${S.savedAt ? utc(Date.parse(S.savedAt)) : 'earlier'}.</span><button class="btn small outline" type="button" data-retry>Try again</button></div>`;
  $('#notice').innerHTML = html;
}
document.addEventListener('click', async (e) => {
  if (!e.target.closest('[data-retry]')) return;
  e.target.disabled = true; await refresh(); updatedNotice(); });
// "Updated 13:20" after each refresh while the page is open; a failure says so instead
// `auto`: from the page's own timer; then only when the page head (whose Reload button shows the time) is off screen
function updatedNotice(auto = false) {
  if (auto && $('#reloadAll') && $('#reloadAll').getBoundingClientRect().bottom > 0) return;
  const ok = S.from.wind === 'live' || S.from.xray === 'live';
  toast(ok ? `Updated ${local(Date.now())}` : 'NASA could not be reached; trying again in 5 minutes', { bad: !ok });
}

// ---------------------------------------------------------------- 1. right now
const last = (a) => (a && a.length ? a[a.length - 1] : null);
function renderNow() {
  const w = S.wind || {}, sp = last(w.speed), de = last(w.dens), bz = last(w.bz);
  const kpObs = (S.kp || []).filter((k) => k.kind === 'obs'), kp = last(kpObs);
  // the strongest flare in 24 hours: GOES live, else NASA's flare list
  let xrMax = 0, xrT = null;
  for (const [t, v] of S.xray || []) if (v > xrMax) { xrMax = v; xrT = t; }
  if (!xrMax && S.ev) for (const f of S.ev.flares) if (f.t > Date.now() - DAY && f.flux > xrMax) { xrMax = f.flux; xrT = f.t; }
  const set = (id, v, unit, note) => { $('#v' + id).innerHTML = v + (unit ? ` <small>${unit}</small>` : ''); $('#n' + id).textContent = note; };
  set('Speed', sp ? fmt(sp[1]) : '–', 'km/s', sp ? speedWords(sp[1]) : 'not available just now');
  set('Dens', de ? fmt(de[1], 1) : '–', 'per cm³', de ? densWords(de[1]) : 'not available just now');
  set('Bz', bz ? (bz[1] < 0 ? '−' : '') + fmt(Math.abs(bz[1]), 1) : '–', 'nT', bz ? bzWords(bz[1]) : 'not available just now');
  set('Kp', kp ? fmtKp(kp.kp) : '–', '', kp ? `${gName(kp.kp)}; a storm starts at 5 (${new Date(kp.t).toISOString().slice(11, 16)} UTC block)` : 'not available just now');
  // the region of the flare: NASA's flare within 30 minutes of the X-ray peak
  const match = xrT && S.ev ? S.ev.flares.find((f) => Math.abs(f.t - xrT) < 30 * 60e3) : null;
  const r = rLevel(xrMax);
  set('Flare', xrMax ? flareClass(xrMax) : '–', '', xrMax ? `${utc(xrT, false)}${match && match.region ? ', region ' + match.region : ''}${r ? ' · ' + r + ' radio blackout' : ''}` : 'not available just now');
  $('#hNow').textContent = !sp && !kp && !xrMax ? 'The live readings could not be loaded'
    : headline({ speed: sp ? sp[1] : 0, bz: bz ? bz[1] : null }, kp ? kp.kp : null, xrMax);
  $('#nowStats').removeAttribute('aria-busy');
  const newest = sp ? sp[0] : kp ? kp.t : null;
  $('#checked').textContent = newest ? `Readings to ${utc(newest)} · checked again every 5 minutes while the page is open` : 'The live readings could not be loaded.';
}

// ---------------------------------------------------------------- 2. pictures of the Sun and the aurora map
const SDO_CAP = {
  HMIIC: 'Visible light, as through a safe solar filter: the dark spots are sunspots.',
  HMIB: 'The magnetic field at the surface: white and black are its two directions; active regions show as pairs.',
  '0171': '171 Å ultraviolet, gas at about 600,000 °C: loops along magnetic field lines above the active regions.',
  '0193': '193 Å ultraviolet, about 1.2 million °C: the corona. Dark patches are coronal holes, where fast solar wind comes from.',
  '0304': '304 Å ultraviolet, about 50,000 °C: the layer above the surface, and prominences of cooler gas at the edge.',
};
const SOHO_CAP = {
  c2: 'LASCO C2: the corona out to about 8.4 million km from the Sun.',
  c3: 'LASCO C3: a wider view, about 32 Sun-widths across; the dots are stars.',
};
const tick = () => Math.floor(Date.now() / (15 * 60e3));     // changes every 15 minutes, so the newest picture is fetched
// resolves true when the picture arrived; `fresh` (a reload button) asks for a new copy within the 15 minutes
// (later calls within those 15 minutes keep the new copy instead of going back to the older saved one)
function picture(img, err, url, fresh) {
  if (fresh) img.dataset.fresh = Date.now();
  const f = Number(img.dataset.fresh || 0);
  const src = url + '?t=' + (Date.now() - f < 15 * 60e3 ? 'r' + f : tick());
  return new Promise((done) => {
    if (img.src === src && img.complete && img.naturalWidth > 0) { done(true); return; }
    // a browser does not ask again for an address that just failed, so a new try gets its own (…&a=n)
    const again = img.src.startsWith(src) && img.complete && !img.naturalWidth;
    const n = again ? Number(img.dataset.tries || 1) + 1 : 1;
    img.dataset.tries = n;
    // the frame's message: "could not be loaded" (written in the page), or "trying again" while the second try waits
    if (!err.dataset.text) err.dataset.text = err.textContent;
    const shown = () => { img.removeAttribute('data-failed'); err.hidden = true; err.textContent = err.dataset.text; done(true); };
    const failed = () => { img.dataset.failed = ''; err.textContent = err.dataset.text; err.hidden = false; done(false); };
    img.removeAttribute('data-failed'); err.hidden = true; err.textContent = err.dataset.text;
    img.onload = shown;
    img.onerror = () => {
      // one more try 20 seconds after a failure (a dropped connection); the broken picture is hidden meanwhile
      if (n === 1 && img.dataset.retried !== src) {
        img.dataset.retried = src;
        img.dataset.failed = '';
        err.textContent = 'The picture could not be loaded just now; trying again in a moment.';
        err.hidden = false;
        setTimeout(() => { img.dataset.tries = 2; img.onload = shown; img.onerror = failed; img.src = src + '&a=2'; }, 20e3);
        return;
      }
      failed();
    };
    img.src = n > 1 ? src + '&a=' + n : src;
  });
}
function sdo(code, fresh) {
  const big = innerWidth > 700 || devicePixelRatio > 1.5;
  $('#sdoCap').textContent = SDO_CAP[code];
  return picture($('#sdoImg'), $('#sdoErr'), `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_${big ? 1024 : 512}_${code}.jpg`, fresh);
}
function soho(code, fresh) {
  $('#sohoCap').textContent = SOHO_CAP[code];
  return picture($('#sohoImg'), $('#sohoErr'), `https://soho.nascom.nasa.gov/data/realtime/${code}/512/latest.jpg`, fresh);
}
function oval(fresh) {
  const p = currentPlace(), side = p && p.lat < 0 ? 'south' : 'north';
  return picture($('#ovalImg'), $('#ovalErr'), `https://services.swpc.noaa.gov/images/animations/ovation/${side}/latest.jpg`, fresh);
}
function wireSeg(seg, fn) {
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || b.hidden) return;
    seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    fn(b);
  });
}
const pressed = (seg) => seg.querySelector('[aria-pressed="true"]');

// ---------------------------------------------------------------- 3. the timeline
function renderMonth() {
  const box = $('#timeline'), key = $('#timelineKey');
  hideTip();
  $('#timelineNote').hidden = true;
  if (S.days === 'all') {
    $('#kMonth').textContent = 'Since 2010';
    $('#hMonth').textContent = 'Strong flares and storms, month by month';
    monthly(box, S.archive && S.archive.months);
    key.innerHTML = '<span><i class="s1"></i>M-class flares (paler before 2014: incomplete)</span><span><i class="s1"></i>X-class flares (brighter, on top)</span><span><i class="s6"></i>Months with storms (bigger: more storms; copper: Kp 7 or more)</span>';
    $('#timelineNote').hidden = false;
    $('#eventList').innerHTML = '<p class="caption">The list shows the 7, 30 or 60 days chosen above.</p>';
    return;
  }
  if (!S.ev) { emptyBox(box, 'NASA\'s space weather database could not be reached just now.', 'state'); key.innerHTML = ''; $('#eventList').innerHTML = ''; return; }
  const now = Date.now(), from = now - S.days * DAY;
  const f = S.ev.flares.filter((x) => x.t >= from), c = S.ev.cmes.filter((x) => x.t >= from), s = S.ev.storms.filter((x) => x.t >= from);
  $('#kMonth').textContent = `The last ${S.days} days`;
  $('#hMonth').textContent = `${f.length} flare${f.length === 1 ? '' : 's'}, ${c.length} cloud${c.length === 1 ? '' : 's'}, ${s.length ? s.length + ' storm' + (s.length === 1 ? '' : 's') : 'no storms'}`;
  timeline(box, S.ev, S.days, now);
  key.innerHTML = '<span><i class="s1"></i>Flare (taller is stronger; each letter is 10 times the last)</span><span><i class="s2"></i>CME (bigger is wider)</span><span><i class="s1"></i>▲ a model run that says a CME reaches Earth</span><span><i class="s6"></i>Storm</span>';
  // the same events as a table, newest first
  const rows = [
    ...f.map((x) => ({ t: x.t, what: 'Flare', size: x.cls, more: x.region ? 'Region ' + x.region + (x.loc ? ', ' + x.loc : '') : '', link: x.link })),
    ...c.map((x) => ({ t: x.t, what: 'CME', size: fmt(x.speed) + ' km/s', more: Number.isFinite(x.half) ? 'Half-width ' + Math.round(x.half) + '°' : '', link: x.link })),
    ...s.map((x) => ({ t: x.t, what: 'Storm', size: 'Kp ' + fmtKp(x.kp), more: gName(x.kp), link: x.link })),
  ].sort((a, b) => b.t - a.t);
  $('#eventList').innerHTML = rows.length ? `<table class="table stack"><thead><tr><th>When (UTC)</th><th>What</th><th>Size</th><th>Details</th></tr></thead><tbody>${rows.map((r) =>
    `<tr><td data-label="When">${utc(r.t)}</td><td data-label="What">${r.what}</td><td data-label="Size">${esc(r.size)}</td><td data-label="Details">${esc(r.more)}${r.link ? ` · <a href="${esc(r.link)}" target="_blank" rel="noopener">DONKI</a>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="state">No events in this period.</p>';
}

// ---------------------------------------------------------------- 4. heading for Earth
function renderEarth() {
  const now = Date.now(), facts = [];
  if (!S.ev) { $('#hEarth').textContent = 'NASA\'s forecasts could not be read just now'; $('#earthText').textContent = ''; $('#earthFacts').innerHTML = ''; return; }
  const coming = S.ev.runs.filter((r) => r.arrival && r.arrival > now - 12 * HOUR);
  const pred = (S.kp || []).filter((k) => k.kind === 'pred' && k.t > now - 3 * HOUR);
  const predMax = pred.length ? pred.reduce((a, k) => (k.kp > a.kp ? k : a)) : null;
  if (!coming.length) {
    $('#hEarth').textContent = 'Nothing heading for Earth';
    $('#earthText').textContent = 'None of NASA\'s model runs of the last 10 days expects a coronal mass ejection to reach Earth. A new eruption can change that within hours; the next arrival would be 1 to 4 days after it leaves the Sun.';
  } else {
    const r = coming[0], due = r.arrival < now ? `was due about ${Math.round((now - r.arrival) / HOUR)} hours ago` : `is expected in about ${Math.max(1, Math.round((r.arrival - now) / HOUR))} hours`;
    $('#hEarth').textContent = `${r.hit ? 'A CME on its way to Earth' : 'A glancing blow'}: ${r.arrival < now ? 'due' : 'expected'} ${utc(r.arrival)}`;
    $('#earthText').textContent = `NASA's model run of ${utc(r.done)} follows a cloud that left the Sun${r.cme ? ' on ' + utc(r.cme) : ''} and expects ${r.hit ? 'it to hit Earth' : 'its edge to brush Earth'}; it ${due}.`
      + (r.kp ? ` It forecasts Kp ${fmtKp(r.kp[0])}${r.kp[1] !== r.kp[0] ? ' to ' + fmtKp(r.kp[1]) : ''}${r.kp[1] >= 5 ? ', a storm' : ', no storm'}.` : '')
      + (coming.length > 1 ? ` ${coming.length - 1} more run${coming.length > 2 ? 's expect' : ' expects'} another cloud to reach Earth.` : '')
      + ' Arrival forecasts are often several hours off.';
    facts.push(['Expected arrival', `${utc(r.arrival)} (NASA WSA–ENLIL model)`]);
    if (r.kp) facts.push(['Expected strength', `Kp ${fmtKp(r.kp[0])}${r.kp[1] !== r.kp[0] ? ' to ' + fmtKp(r.kp[1]) : ''}, ${r.hit ? 'a direct hit' : 'a glancing blow'}`]);
  }
  if (predMax) facts.push(['NOAA\'s forecast', `Highest Kp in the next 3 days: ${fmtKp(predMax.kp)} (${gName(predMax.kp)}), ${utc(predMax.t)}`]);
  const sep = S.ev.seps.filter((x) => x.t > now - 30 * DAY);
  facts.push(['Particle events', sep.length ? `${sep.length} in the last 30 days, the latest ${utc(sep[sep.length - 1].t)}` : 'None in the last 30 days: no radiation risk for astronauts from the Sun']);
  $('#earthFacts').innerHTML = facts.map(([h, p]) => `<div class="f"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('');
}

// ---------------------------------------------------------------- 5. solar wind and Kp
function renderWind() {
  const w = S.wind;
  if (!w) { emptyBox($('#speedChart'), 'NASA\'s IMAP readings could not be loaded just now.'); emptyBox($('#bzChart'), 'NASA\'s IMAP readings could not be loaded just now.'); return; }
  const sp = last(w.speed), bz = last(w.bz);
  $('#aSpeed').textContent = sp ? `now ${fmt(sp[1])} km/s` : '';
  $('#aBz').textContent = bz ? `now ${bz[1] < 0 ? '−' : ''}${fmt(Math.abs(bz[1]), 1)} nT` : '';
  line24($('#speedChart'), w.speed, { label: 'Solar wind speed over the last 24 hours', unit: 'km/s', lo: 300, hi: 500, tick: 100, colour: '#C0A062', fmt: (v) => fmt(v) + ' km/s', empty: 'No speed readings in the last 24 hours.' });
  line24($('#bzChart'), w.bz, { label: 'North–south magnetic field (Bz) over the last 24 hours', unit: 'nT', lo: -10, hi: 10, tick: 5, colour: '#8AA9C9', south: true, fmt: (v) => (v < 0 ? '−' : '') + fmt(Math.abs(v), 1) + ' nT', empty: 'No field readings in the last 24 hours.' });
}
function renderKp() {
  if (!S.kp) emptyBox($('#kpChart'), 'The Kp index could not be read just now.'); else kpBars($('#kpChart'), S.kp);
  const st = S.ev ? S.ev.storms.filter((s) => s.t > Date.now() - 60 * DAY) : [];
  $('#stormList').textContent = !S.ev ? '' : st.length ? `Storms in the last 60 days: ${st.map((s) => `${new Date(s.t).toLocaleDateString('en-CA', { timeZone: 'UTC', month: 'short', day: 'numeric' })} (Kp ${fmtKp(s.kp)})`).join(', ')}` : 'No storms in the last 60 days';
}

// ---------------------------------------------------------------- 6. aurora
function renderAurora() {
  const p = currentPlace();
  $('#placeName').textContent = p ? p.name : 'Not set yet';
  $('#forget').hidden = !p;
  oval();
  const lv = $('#aurLevels');
  if (!p || !S.kp) {
    $('#aurVerdict').textContent = p ? 'The Kp index could not be read just now' : 'Choose a place to see your chance';
    $('#aurText').textContent = 'The aurora\'s reach depends on Kp and on how close the place is to Earth\'s magnetic pole.';
    lv.innerHTML = ''; $('#aurLevelsCap').innerHTML = '&nbsp;'; $('#aurFacts').innerHTML = '';
    return;
  }
  const c = chance(p, S.kp), dir = c.toward, m = Math.abs(c.m);
  const darkTxt = !c.dark ? null : c.dark.now ? `now until ${local(c.dark.to)}` : `${localDay(c.dark.from)} to ${local(c.dark.to)}`;
  if (!c.dark) $('#aurVerdict').textContent = 'No darkness here for the next day and a half';
  else $('#aurVerdict').textContent = c.level === 'overhead' ? 'Good chance tonight, overhead' : c.level === 'horizon' ? `Possible tonight, low in the ${dir}` : 'Not likely tonight';
  let txt;
  if (c.needs.overhead === 0) txt = `This place is under the aurora's usual ring (${fmt(m)}° geomagnetic latitude): on any clear, dark night it can be overhead.`;
  else if (c.needs.horizon === null) txt = `This place is at ${fmt(m)}° geomagnetic latitude, too far from the magnetic pole: even at Kp 9 the aurora's edge reaches only about 48°, and it shows on the horizon down to about 44°.`;
  else txt = `At Kp ${fmtKp(c.kpNight)} the aurora's edge reaches about ${fmt(Math.max(48, 66 - 2 * c.kpNight))}° geomagnetic latitude. This place is at ${fmt(m)}°, so it needs Kp ${fmtKp(c.needs.horizon)} for the aurora to show low in the ${dir}, and Kp ${c.needs.overhead === null ? 'above 9' : fmtKp(c.needs.overhead)} for it to be overhead.`;
  if (!c.dark) txt += ' The sky stays too bright to see it.';
  $('#aurText').textContent = txt;
  // the level scale: filled to tonight's Kp, the needed steps outlined
  const fill = c.kpNight ?? 0, mark = [c.needs.horizon, c.needs.overhead].filter((x) => x !== null && x > 0).map((x) => Math.ceil(x - 1e-9));
  lv.innerHTML = Array.from({ length: 10 }, (_, i) => {
    const on = i <= Math.floor(fill + 1e-9) && (i > 0 || fill >= 0);
    return `<span class="${[on ? 'on' : '', on && i >= 5 ? 'high' : on && i === 4 ? 'mid' : '', mark.includes(i) ? 'mark' : ''].filter(Boolean).join(' ')}">${i}</span>`;
  }).join('');
  lv.setAttribute('aria-label', `Kp tonight about ${fmtKp(fill)}. This place needs Kp ${c.needs.horizon === null ? 'above 9' : fmtKp(c.needs.horizon)} on the horizon and ${c.needs.overhead === null ? 'above 9' : fmtKp(c.needs.overhead)} overhead.`);
  $('#aurLevelsCap').textContent = 'Filled to tonight\'s Kp; outlined at the Kp this place needs (on the horizon, then overhead).';
  const facts = [
    ['Kp now', c.kpNow === null ? 'not available' : `${fmtKp(c.kpNow)}, ${gName(c.kpNow)}`],
    ['Tonight', c.kpNight === null ? 'no forecast' : `up to Kp ${fmtKp(c.kpNight)} in the dark hours (measured and NOAA's forecast)`],
    ['This place', `${fmt(m)}° geomagnetic latitude (${fmt(Math.abs(p.lat), 1)}° ${p.lat >= 0 ? 'N' : 'S'} on the map)`],
    ['Dark enough', darkTxt ? `${darkTxt}, this device's time` : 'not in the next 36 hours'],
    ['The Moon', `${Math.round(c.moon * 100)}% lit${c.moon > 0.6 ? ': its light hides a faint aurora' : ''}`],
    ['Also needed', 'Clear skies, and a view toward the pole away from city lights'],
  ];
  $('#aurFacts').innerHTML = facts.map(([h, v]) => `<div class="f"><h3>${esc(h)}</h3><p>${esc(v)}</p></div>`).join('');
}
function wirePlace() {
  const say = (msg) => { $('#placeMsg').textContent = msg || 'Kept on this device only and never sent anywhere; the same place as Sky Finder.'; };
  $('#locate').addEventListener('click', async () => {
    const b = $('#locate'); b.disabled = true; b.textContent = 'Finding you…'; say('');
    try { await locate(); } catch (e) { say(e.message); }
    b.disabled = false; b.textContent = 'Use my location';
  });
  $('#forget').addEventListener('click', () => { forgetPlace(); say('This place has been forgotten on this device.'); });
  let hits = [], t = null;
  const show = () => {
    const box = $('#placeHits');
    box.hidden = !hits.length;
    box.innerHTML = '<span class="barlbl">Pick one</span>' + hits.map((h, i) => `<button class="chip" type="button" data-i="${i}">${esc(h.name)}</button>`).join('');
  };
  $('#placeQ').addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      try { hits = await searchPlaces($('#placeQ').value, 6); show(); } catch { say('The list of towns could not be loaded. Try "Use my location", or try again later.'); }
    }, 120);
  });
  $('#placeQ').addEventListener('keydown', (e) => { if (e.key === 'Enter' && hits.length) { pick(0); e.preventDefault(); } });
  $('#placeHits').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) pick(Number(b.dataset.i)); });
  const pick = (i) => { const h = hits[i]; if (!h) return; setPlace({ ...h, how: 'search' }); hits = []; show(); $('#placeQ').value = ''; say(''); };
  addEventListener('skyplace', renderAurora);
}

// ---------------------------------------------------------------- start and refresh
// the reload buttons (shared/reload.js): the page head's reloads everything, each panel's only its own part
function wireReload() {
  const sdoNow = (f) => sdo(pressed($('#sdoSeg')).dataset.code, f), sohoNow = (f) => soho(pressed($('#sohoSeg')).dataset.code, f);
  const part = (name, ...draw) => async () => { const ok = await load(name); draw.forEach((d) => d()); showNotice(); return ok; };
  reloadPart($('#reloadSdo'), () => sdoNow(true));
  reloadPart($('#reloadSoho'), () => sohoNow(true));
  reloadPart($('#reloadOval'), () => oval(true));
  reloadPart($('#reloadEv'), part('ev', renderMonth, renderEarth));
  reloadPart($('#reloadSpeed'), part('wind', renderNow, renderWind));
  reloadPart($('#reloadBz'), part('wind', renderNow, renderWind));
  reloadPart($('#reloadKp'), part('kp', renderNow, renderKp, renderAurora));
  reloadPage($('#reloadAll'), async () => {
    const [data, ...pics] = await Promise.all([load(), sdoNow(true), sohoNow(true), oval(true)]);
    lastFull = Date.now(); renderAll();
    return data && pics.every(Boolean);
  });
}

// The "On this page" bar is marked by shared/footer.js (data-spy); on phones, where the bar scrolls sideways, the
// link it marks is kept in view
function followJump() {
  const bar = document.getElementById('jump');
  if (!bar) return;
  new MutationObserver(() => {
    const cur = bar.querySelector('[aria-current="location"]');
    if (!cur || bar.scrollWidth <= bar.clientWidth) return;
    const r = bar.getBoundingClientRect(), q = cur.getBoundingClientRect();
    if (q.left < r.left + 8 || q.right > r.right - 8) bar.scrollTo({ left: q.left - r.left + bar.scrollLeft - (bar.clientWidth - q.width) / 2, behavior: 'smooth' });
  }).observe(bar, { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
}

function renderAll() { renderNow(); renderMonth(); renderEarth(); renderWind(); renderKp(); renderAurora(); showNotice(); }
let lastFull = 0;
async function refresh() {
  await load();
  lastFull = Date.now();
  renderAll();
}
async function start() {
  wireSeg($('#sdoSeg'), (b) => sdo(b.dataset.code));
  wireSeg($('#sohoSeg'), (b) => soho(b.dataset.code));
  wireSeg($('#periodSeg'), (b) => { S.days = b.dataset.days === 'all' ? 'all' : Number(b.dataset.days); renderMonth(); });
  sdo(pressed($('#sdoSeg')).dataset.code);
  soho(pressed($('#sohoSeg')).dataset.code);
  wirePlace();
  followJump();
  readArchive().then((a) => { if (a && a.months && a.months.length) { S.archive = a; $('#allBtn').hidden = false; } });
  await refresh();
  wireReload();
  // keep fresh while the page is open and showing
  setInterval(async () => {
    if (document.hidden) return;
    await Promise.all([load('wind'), load('xray')]);
    if (Date.now() - lastFull > 10 * 60e3) { await Promise.all([load('ev'), load('kp')]); lastFull = Date.now(); }
    renderAll();
    markUpdated($('#reloadAll'));
    updatedNotice(true);
  }, 5 * 60e3);
  setInterval(() => { if (!document.hidden) { sdo(pressed($('#sdoSeg')).dataset.code); soho(pressed($('#sohoSeg')).dataset.code); oval(); } }, 15 * 60e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastFull > 5 * 60e3) refresh(); });
  let rt = null;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { renderMonth(); renderWind(); renderKp(); }, 200); });
}
start();
