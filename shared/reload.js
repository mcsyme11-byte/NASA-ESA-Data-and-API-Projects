// NASA and ESA Data Projects · reload buttons · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Fetches a page's data again without reloading the page (docs/DESIGN.md, "Reload buttons"; added Nov 18, 2026).
//
//   <button class="reload" type="button" id="reloadAll">Reload all the readings on this page</button>
//   <button class="reload small" type="button" id="reloadSdo">Reload this picture</button>
//
//   import { reloadPage, reloadPart } from '../shared/reload.js?v=…';
//   reloadPart(document.querySelector('#reloadSdo'), () => loadSdo());     // one panel
//   reloadPage(document.querySelector('#reloadAll'), () => refresh());     // the whole page
//
// The button's text becomes its screen-reader label (and tooltip); the icon and the note are added here. The load
// function returns a promise: it counts as failed if it rejects or resolves to false. While it runs the icon spins and
// the button is disabled; afterwards the note says "Updated hh:mm" (the visitor's own clock, fading after 6 seconds) or
// "Couldn't reload, try again". To spare NASA's, ESA's and NOAA's servers, a button ignores clicks for 30 seconds after
// a reload (10 after a failure). A page reload spins every panel button with it and starts their wait too.
// markUpdated(button) records a reload made some other way (the page's own timer), so the wait starts from it.

const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
  + 'stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 4v5h-5"/></svg>';
const WAIT_OK = 30e3, WAIT_FAIL = 10e3, FADE = 6e3, MIN_SPIN = 600;
const parts = new Set();
const made = new WeakMap();
const hhmm = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

function build(btn) {
  if (made.has(btn)) return made.get(btn);
  const label = btn.textContent.trim() || 'Reload';
  btn.textContent = '';
  btn.insertAdjacentHTML('beforeend', ICON);
  const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = label; btn.append(sr);
  btn.title = label;
  let wrap = btn.parentElement.classList.contains('reloader') ? btn.parentElement : null;
  if (!wrap) { wrap = document.createElement('span'); wrap.className = 'reloader'; btn.replaceWith(wrap); wrap.append(btn); }
  // in a panel header the button stays beside the panel's title, whatever the header's note does
  const ph = wrap.parentElement;
  const h = ph && ph.matches('.panel > .ph') ? ph.querySelector(':scope > h2, :scope > h3') : null;
  if (h) { const t = document.createElement('span'); t.className = 'phtitle'; h.before(t); t.append(h, wrap); }
  const note = document.createElement('span');
  note.className = 'rnote gone'; note.setAttribute('aria-live', 'polite'); wrap.append(note);
  const r = { btn, note, next: 0, timer: 0, ok: true };
  made.set(btn, r);
  return r;
}

function say(r, ok) {
  clearTimeout(r.timer);
  r.ok = ok;
  r.note.textContent = ok ? 'Updated ' + hhmm(new Date(r.at)) : 'Couldn’t reload, try again';
  r.note.className = 'rnote ' + (ok ? 'ok' : 'fail');
  if (ok) r.timer = setTimeout(() => r.note.classList.add('gone'), FADE);
}

// the button pressed shows the note; panel buttons that spun with a page reload only share its result and wait
function done(list, ok) {
  const now = Date.now();
  list.forEach((r, i) => {
    r.btn.disabled = false; r.btn.removeAttribute('aria-busy');
    r.at = now; r.next = now + (ok ? WAIT_OK : WAIT_FAIL);
    if (i === 0) say(r, ok); else { r.ok = ok; clearTimeout(r.timer); r.note.className = 'rnote gone'; }
  });
}

async function run(list, load) {
  for (const r of list) { r.btn.disabled = true; r.btn.setAttribute('aria-busy', 'true'); }
  const spin = new Promise((res) => setTimeout(res, MIN_SPIN));        // long enough to see that something happened
  let ok;
  try { ok = (await load()) !== false; } catch { ok = false; }
  await spin;
  done(list, ok);
}

function click(r, list, load) {
  if (r.btn.disabled) return;
  if (Date.now() < r.next) { if (r.at) say(r, r.ok); return; }      // too soon: show the last result again
  run(list(), load);
}

/** A panel's button: reloads that panel only. */
export function reloadPart(btn, load) {
  if (!btn) return;
  const r = build(btn); parts.add(r);
  btn.addEventListener('click', () => click(r, () => [r], load));
}

/** The page head's button: reloads everything; every panel button spins with it and shares its wait. */
export function reloadPage(btn, load) {
  if (!btn) return;
  const r = build(btn);
  btn.addEventListener('click', () => click(r, () => [r, ...[...parts].filter((p) => !p.btn.disabled)], load));
}

/** Records a reload made some other way (a timer), so the next click waits from it. Shows no note. */
export function markUpdated(btn) {
  const r = btn && made.get(btn);
  if (r) { r.at = Date.now(); r.next = r.at + WAIT_OK; r.ok = true; }
}
