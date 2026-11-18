// NASA and ESA Data Projects · reading progress and motion on every page · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Loaded by shared/footer.js on every page (added Nov 18, 2026), so no page needs its own code:
//   1. The reading progress line: a thin brass line along the foot of the top bar, filling as the page is read.
//   2. Back to top: a round button that appears once the visitor has scrolled a screen and a half down, with a ring
//      that fills with the same progress.
//   3. Gliding tabs: on every row of tabs (`.tabs`), one brass underline glides to the current tab instead of jumping.
//   4. Sections that rise into view: each `.section` below the first screen fades up gently the first time it shows.
//   5. Numbers that count up: the number in each stat tile (`.stat .value`, `.tile .value`) counts up from zero the
//      first time it shows with a number in it; later changes (live updates) are shown as they are, without counting.
//   6. The pointer's glow: on a computer, a soft brass glow follows the pointer over cards and panels.
//   7. toast(text): a small notice at the bottom left ("Updated 13:20"), for pages whose live data refreshes. A page
//      imports it: import { toast } from '../shared/motion.js'.
// The loading shimmer (`.loading`) is pure CSS, in shared/theme.css.
// 1, 2, 4, 5 and 6 are left out of the legal, professional and technical pages (SKIP below), of Sky Finder (a phone app
// with its own controls), and of any page with <body data-nomotion>. Pages that do not scroll (the full-screen maps)
// never show 1 and 2. Visitors who ask their device for less motion get the progress line and the button without
// any animation, and no rising sections.

const SKIP = ['/legal/', '/privacy/', '/terms/', '/credits/', '/contact/', '/about/', '/data-collection/', '/design/',
  '/control-room/', '/mars-data/method/', '/sky-finder/'];
const path = location.pathname;
const skipped = SKIP.some((p) => path.includes(p)) || document.body.hasAttribute('data-nomotion');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

function progress() {
  const bar = document.querySelector('.topbar');
  if (!bar) return;
  const line = document.createElement('div');
  line.className = 'readbar';
  line.setAttribute('aria-hidden', 'true');
  line.innerHTML = '<i></i>';
  bar.appendChild(line);
  const fill = line.firstChild;

  const top = document.createElement('button');
  top.type = 'button';
  top.className = 'totop';
  top.setAttribute('aria-label', 'Back to the top');
  top.innerHTML = '<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="20"/><circle class="done" cx="22" cy="22" r="20" pathLength="100"/></svg>'
    + '<svg class="arrow" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  top.addEventListener('click', () => {
    scrollTo({ top: 0, behavior: still ? 'auto' : 'smooth' });
    (document.querySelector('main h1') || document.querySelector('main'))?.focus?.({ preventScroll: true });
  });
  document.body.appendChild(top);
  const ring = top.querySelector('.done');

  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const long = max > innerHeight * 0.5;               // only pages with something to read past the first screen
    const p = long ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    line.hidden = !long;
    fill.style.transform = `scaleX(${p})`;
    ring.style.strokeDashoffset = String(100 - p * 100);
    top.classList.toggle('on', long && scrollY > innerHeight * 1.5);
  };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask);
  new ResizeObserver(ask).observe(document.body);         // pages that grow as their data arrives
  update();
}

// one underline per row of tabs, gliding to the current tab
function glideTabs(row) {
  if (row.dataset.glide) return;
  row.dataset.glide = '1';
  row.classList.add('glides');
  const g = document.createElement('span');
  g.className = 'glide';
  g.setAttribute('aria-hidden', 'true');
  row.appendChild(g);
  const place = () => {
    const cur = row.querySelector('[aria-selected="true"], [aria-current]');
    if (!cur || !cur.offsetWidth) { g.style.opacity = '0'; return; }
    g.style.opacity = '1';
    g.style.width = cur.offsetWidth + 'px';
    g.style.transform = `translate(${cur.offsetLeft}px, ${cur.offsetTop + cur.offsetHeight - g.offsetTop - 2}px)`;
  };
  new MutationObserver(place).observe(row, { subtree: true, attributes: true, attributeFilter: ['aria-selected', 'aria-current'] });
  new ResizeObserver(place).observe(row);
  place();
}
function tabs() {
  document.querySelectorAll('.tabs').forEach(glideTabs);
  // rows of tabs a page adds later
  new MutationObserver(() => document.querySelectorAll('.tabs:not([data-glide])').forEach(glideTabs))
    .observe(document.body, { childList: true, subtree: true });
}

// sections below the first screen rise into view once
function reveal() {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('shown');
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('main .section').forEach((s) => {
    if (s.getBoundingClientRect().top < innerHeight) return;   // already on screen: left as it is
    s.classList.add('reveal');
    io.observe(s);
  });
}

// numbers that count up, once per tile, the first time each shows with a number in it
const NUM = /^([−-]?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?$/;
function countUp() {
  const fmt = (v, dp) => new Intl.NumberFormat('en-CA', { minimumFractionDigits: dp, maximumFractionDigits: dp, useGrouping: true }).format(v);
  const run = (el) => {
    if (el.dataset.counted) return;
    const node = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    const m = node && NUM.exec(node.textContent.trim());
    if (!m) return;                                     // not a plain number (a class like M1.7, a dash): left as it is
    el.dataset.counted = '1';
    const lead = node.textContent.match(/^\s*/)[0], tail = node.textContent.match(/\s*$/)[0];
    const target = Number(m[2].replace(/,/g, '') + (m[3] ? '.' + m[3] : '')), dp = m[3] ? m[3].length : 0;
    const grouped = m[2].includes(',') || target >= 10000, sign = m[1];
    if (target === 0) return;
    const t0 = performance.now(), dur = 900;
    let wrote = null;
    const step = () => {
      if (wrote !== null && node.textContent !== wrote) return;   // the page changed it meanwhile: stop
      const k = Math.min(1, Math.max(0, (performance.now() - t0) / dur)), e = 1 - Math.pow(1 - k, 3);
      const v = target * e, txt = grouped ? fmt(v, dp) : v.toFixed(dp);
      wrote = lead + sign + txt + tail;
      node.textContent = wrote;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((es) => es.forEach((e) => { e.target.dataset.seen = e.isIntersecting ? '1' : ''; if (e.isIntersecting) run(e.target); }));
  const watch = (el) => {
    if (el.dataset.cu) return;
    el.dataset.cu = '1';
    io.observe(el);
    // a page that fills its tiles after loading: count when the number arrives, if the tile is on screen
    new MutationObserver(() => { if (el.dataset.seen) run(el); }).observe(el, { childList: true, characterData: true, subtree: true });
  };
  const all = () => document.querySelectorAll('.stat .value, .tile .value').forEach(watch);
  all();
  new MutationObserver(all).observe(document.body, { childList: true, subtree: true });
}

// the soft brass glow under the pointer on cards and panels (computers only)
function glow() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let cur = null;
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest && e.target.closest('.card, .panel');
    if (!el) return;
    if (el !== cur) { cur = el; el.classList.add('glow'); }
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    el.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
}

// "Updated 13:20": a small notice at the bottom left for a few seconds; `bad` for a failure
export function toast(text, { bad = false, ms = 3200 } = {}) {
  let box = document.getElementById('toasts');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toasts';
    box.className = 'toasts';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = text;
  box.appendChild(t);
  while (box.children.length > 2) box.firstChild.remove();
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('on')));
  setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 400); }, ms);
}

export function startMotion() {
  tabs();
  if (skipped) return;
  progress();
  glow();
  if (!still && 'IntersectionObserver' in window) { reveal(); countUp(); }
}
