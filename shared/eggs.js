// NASA and ESA Data Projects · small surprises · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Three hidden touches (added Nov 18, 2026), loaded by shared/footer.js once the page is idle, so they cost nothing
// while the page loads (about 1.5 kB). They change no data, store nothing and send nothing; with reduced motion
// turned on they show only their note.
//   1. The NEDAP patch at the top of the home and Contact pages, pressed five times: it turns once, "Ad astra, per data."
//   2. The Konami code (↑ ↑ ↓ ↓ ← → ← → B A), or typing "liftoff" anywhere outside a field: a comet crosses the
//      screen, "Liftoff. Go for orbit."
//   3. A note in the browser's console for anyone who opens it, with the link to the source code.
// docs/DESIGN.md ("Small surprises") lists them; a new one is added here and there, never on its own in a page.

import { toast } from './motion.js?v=2026111903';

const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 1. the patch
let n = 0, timer = 0;
document.addEventListener('click', (e) => {
  const mark = e.target.closest && e.target.closest('img.medal');
  if (!mark) return;
  clearTimeout(timer); timer = setTimeout(() => { n = 0; }, 1500);
  if (++n < 5) return;
  n = 0;
  if (!still) { mark.classList.remove('egg-turn'); void mark.offsetWidth; mark.classList.add('egg-turn'); }
  toast('Ad astra, per data.');
});

// 2. the comet
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let keys = [], typed = '';
addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
  keys = [...keys, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length);
  typed = (typed + (e.key.length === 1 ? e.key.toLowerCase() : ' ')).slice(-7);
  if (keys.join() === KONAMI.join() || typed === 'liftoff') { keys = []; typed = ''; comet(); }
});
function comet() {
  toast('Liftoff. Go for orbit.');
  if (still) return;
  const c = Object.assign(document.createElement('div'), { className: 'egg-comet' });
  c.setAttribute('aria-hidden', 'true');
  document.body.append(c);
  c.addEventListener('animationend', () => c.remove());
}

// 3. the console
console.info('%cNEDAP%c  NASA and ESA Data Projects, by Malcolm Syme.\nEvery number here comes from open NASA and ESA data. '
  + 'The code is open too: https://github.com/mcsyme11-byte/NASA-ESA-Data-and-API-Projects',
  'font: 600 13px Georgia, serif; color: #C0A062; letter-spacing: .2em', 'font: 12px Georgia, serif; color: #9AA6B8');
