// NASA and ESA Data Projects · the site-map footer on every page · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Builds the footer of every page from one list (decided Nov 17, 2026): the NEDAP mark and name with the live data
// status on the left, a column for each part of the site listing its pages, then the copyright with the legal links
// opposite, and the credit line. Each page loads it with
//   <script type="module" src="<path to>/shared/footer.js"></script>
// and has this footer (each page's detailed data credits sit above it, in <p class="srcline"> lines):
//   <footer class="footer">
//     <div class="ftop"><p class="copy">© 2026 <strong>Malcolm Syme</strong> · <a href="mailto:…">…</a></p></div>
//     <p class="fnote">Data courtesy of NASA and ESA. An independent project, not endorsed by NASA or ESA.</p>
//   </footer>
// The copyright line and the credit line stay in the page itself (they read without this script); everything else is
// added here, once. A page is listed by adding it to SECTIONS below; a page that is not live yet is left out with
// `soon: true` until it is published.
// It also loads shared/motion.js (reading progress, back to top, gliding tabs, rising sections), sets up the "‹ Back" button on pages that have one (see wireBack below), the soft edge fade on rows that
// scroll sideways (wireScrollRows), and the live data status (addLiveStatus, since Nov 14, 2026): a light and one line
// saying whether the site's data is up to date, updating now, late or failed, linked to the data-collection page.
// Since Nov 19, 2026 it also adds the site tools (siteTools below): the search button in the top bar and "Search the
// site" in the footer (shared/search.js), the keyboard shortcuts (shared/keys.js lists them with `?`), "Copy link to this
// section" after each section heading, the menu's dots for new tools, and the highlight of the section being read in an
// "On this page" bar (`nav.tabs[data-spy]`).
// Links are worked out from this file's own address, so they are right at any folder depth.

const REPO = 'https://github.com/mcsyme11-byte/NASA-ESA-Data-and-API-Projects';
const root = new URL("../", import.meta.url.split("?")[0]);

// the page's own footer: the last <footer class="footer"> (a page may show a footer's parts as an example above it)
const pageFooter = () => [...document.querySelectorAll('footer.footer')].pop() || null;

// [label, address from the site's top folder, options]; `soon: true` keeps a page out until it is live
const SECTIONS = [
  ['Asteroid Tracker', [['Overview', 'asteroid-tracker/'], ['This week', 'asteroid-tracker/tracker.html'],
    ['Impact risk', 'asteroid-tracker/tracker.html#risk'], ['Visible from here', 'asteroid-tracker/tracker.html#visible'],
    ['Within reach', 'asteroid-tracker/mining.html', { added: '2026-11-17' }], ['Solar system map', 'asteroid-tracker/map.html']]],
  ['Image Explorer', [['Overview', 'image-explorer/'], ['Earth map', 'image-explorer/explore.html#earth'],
    ['Globe', 'image-explorer/explore.html#globe'], ['Picture library', 'image-explorer/explore.html#library']]],
  ['Mars Data', [['Overview', 'mars-data/'], ['Charts', 'mars-data/charts/'], ['How the data is made', 'mars-data/method/']]],
  ['Space Watch', [['Overview', 'space-watch/', { added: '2026-11-17' }], ['Orbit Watch', 'orbit-watch/', { added: '2026-11-17' }],
    ['Space Weather', 'space-weather/', { added: '2026-11-17' }], ['Exoplanets', 'exoplanets/', { added: '2026-11-17' }],
    ['Planetary Maps', 'planet-maps/', { added: '2026-11-17' }]]],
  ['More', [['Sky Finder', 'sky-finder/'], ['Spacecraft map', 'spacecraft/'], ['How the data is collected', 'data-collection/'],
    ['About', 'about/'], ['Contact', 'contact/']]],
];
// `added` (YYYY-MM-DD): the day a page was published; the menu marks its part of the site with a small dot for visitors
// who were last here before that day (newDots below). Give each new page its date when it is published.
const LEGAL = [['Legal', 'legal/'], ['Privacy', 'privacy/'], ['Terms', 'terms/'], ['Credits', 'credits/'],
  ['MIT licence', REPO + '/blob/main/LICENSE.md', { external: true }], ['Source code', REPO, { external: true }]];
// the site's version, from this file's version tag (?v=YYYYMMDDNN, raised with every change of the shared files), linked
// to the repository's history of changes (Nov 19, 2026): "Version 2026.11.19.01"
const TAG = new URL(import.meta.url).searchParams.get('v') || '';
if (/^\d{10}$/.test(TAG)) LEGAL.push([`Version ${TAG.slice(0, 4)}.${TAG.slice(4, 6)}.${TAG.slice(6, 8)}.${TAG.slice(8)}`,
  REPO + '/commits/main', { external: true }]);

// the same page whether written as folder/ or folder/index.html
const norm = (p) => p.replace(/index\.html$/, '');

// the footer's links to views of the page that is open (#globe, #risk): the mark moves with the view. Pages change
// the address with history.replaceState, which tells nobody, so it is wrapped here (Nov 18, 2026: the footer kept
// marking "Picture library" after a switch to the Globe).
const views = [];
function markViews() {
  for (const a of views) {
    const on = a.dataset.view === location.hash || (a.dataset.view === '#earth' && !location.hash);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}
for (const k of ['replaceState', 'pushState']) {
  const was = history[k];
  history[k] = function (...args) { const r = was.apply(this, args); markViews(); return r; };
}
addEventListener('hashchange', markViews);
addEventListener('popstate', markViews);

function link(label, href, opt = {}) {
  const a = document.createElement('a');
  a.textContent = label;
  if (opt.external) {
    a.href = href; a.target = '_blank'; a.rel = 'noopener';
    a.append(Object.assign(document.createElement('span'), { className: 'ext', textContent: ' ↗' }));
    a.setAttribute('aria-label', label + ' (on GitHub, opens in a new tab)');
    return a;
  }
  const u = new URL(href, root);
  a.href = u.href;
  const samePath = norm(u.pathname) === norm(location.pathname);
  // the page, or the view of it that is showing (#risk), is marked; the Earth map is the explorer's first view
  if (samePath) { a.dataset.view = u.hash; views.push(a); }
  if (samePath && (u.hash === location.hash || (u.hash === '#earth' && !location.hash))) a.setAttribute('aria-current', 'page');
  // a view of the page already open: follow the address change, then reload if the page does not switch by itself
  if (samePath && u.hash) a.addEventListener('click', () => setTimeout(() => {
    if (location.hash !== u.hash) location.reload();
  }, 50));
  return a;
}

function buildFooter() {
  const footer = pageFooter();
  if (!footer || footer.querySelector('.fmap')) return;

  const brand = Object.assign(document.createElement('div'), { className: 'fbrand' });
  const home = Object.assign(document.createElement('a'), { className: 'fhome', href: root.href });
  home.append(Object.assign(document.createElement('img'), {
    src: new URL('brand/patch/nedap-mark.svg', root).href, alt: '', width: 52, height: 52 }));
  home.insertAdjacentHTML('beforeend', '<span class="fname">NASA and ESA Data Projects<small>NEDAP</small></span>');
  brand.append(home, Object.assign(document.createElement('p'), {
    className: 'ftag', textContent: 'Learning and exploring with open data from NASA and ESA.' }));

  // each section is a <details>: open on wider screens; on phones folded, except the one holding this page
  const cols = Object.assign(document.createElement('nav'), { className: 'fcols' });
  cols.setAttribute('aria-label', 'Site map');
  for (const [title, items] of SECTIONS) {
    const live = items.filter(([, , o]) => !(o && o.soon));
    const col = Object.assign(document.createElement('details'), { className: 'fcol' });
    col.append(Object.assign(document.createElement('summary'), { className: 'fhead', textContent: title }));
    const ul = document.createElement('ul');
    for (const [label, href, o] of live) { const li = document.createElement('li'); li.append(link(label, href, o)); ul.append(li); }
    col.append(ul);
    cols.append(col);
  }
  const wide = matchMedia('(min-width: 761px)');
  const fold = () => cols.querySelectorAll('details').forEach((d) => { d.open = wide.matches || !!d.querySelector('[aria-current]'); });
  fold();
  wide.addEventListener('change', fold);

  const map = Object.assign(document.createElement('div'), { className: 'fmap' });
  map.append(brand, cols);

  // the page's copyright line moves to the bottom row, with the legal links opposite; the credit line stays last
  const legal = Object.assign(document.createElement('div'), { className: 'flegal' });
  const copy = footer.querySelector('.copy');
  const lnav = Object.assign(document.createElement('nav'), { className: 'flinks' });
  lnav.setAttribute('aria-label', 'Legal');
  for (const [label, href, o] of LEGAL) lnav.append(link(label, href, o));
  if (copy) {
    // the " · email" part stays together, so a narrow screen never leaves the dot alone at the end of a line
    const mail = copy.querySelector('a[href^="mailto:"]'), sep = mail && mail.previousSibling;
    if (sep && sep.nodeType === 3 && /·\s*$/.test(sep.textContent)) {
      sep.textContent = sep.textContent.replace(/\s*·\s*$/, ' ');
      const keep = document.createElement('span'); keep.className = 'nowrap';
      mail.before(keep); keep.append('· ', mail);
    }
    legal.append(copy);
  }
  legal.append(lnav);

  const top = footer.querySelector('.ftop');
  if (top) top.replaceWith(map); else footer.prepend(map);
  map.after(legal);
}

// A "‹ Back" button (<a class="backlink" id="back" href="<home>">Home</a>; the arrow is drawn by shared/theme.css) above
// the heading. When the previous page in this tab is a page of this site, it is named for that page and uses the browser's own Back, so that page returns
// where it was left; otherwise it keeps its fallback, the home page.
const NAMES = [
  [/\/asteroid-tracker\/map\.html$/, 'the map'], [/\/asteroid-tracker\/mining\.html$/, 'Within reach'], [/\/asteroid-tracker\/object\.html$/, 'the asteroid'],
  [/\/asteroid-tracker\/tracker\.html$/, 'the Asteroid Tracker'], [/\/asteroid-tracker\/(index\.html)?$/, 'the Asteroid Tracker home page'], [/\/image-explorer\/explore\.html$/, 'the Image Explorer'],
  [/\/image-explorer\/(index\.html)?$/, 'the Image Explorer home page'], [/\/mars-data\/charts\//, 'the Mars charts'],
  [/\/mars-data\/method\//, 'How the data is made'], [/\/mars-data\//, 'Mars Data'], [/\/about\//, 'About'], [/\/privacy\//, 'Privacy'], [/\/terms\//, 'Terms'],
  [/\/credits\//, 'Credits'], [/\/data-collection\//, 'How the data is collected'], [/\/control-room\//, 'the control room'], [/\/contact\//, 'Contact'], [/\/legal\//, 'Legal'], [/\/sky-finder\/how-to\.html$/, 'How to use Sky Finder'], [/\/sky-finder\//, 'Sky Finder'], [/\/spacecraft\//, 'the spacecraft map'], [/\/exoplanets\/methods\.html$/, 'How planets are found'], [/\/exoplanets\/explorer\.html$/, 'Every planet'], [/\/exoplanets\//, 'Exoplanets'], [/\/space-weather\//, 'Space Weather'], [/\/space-watch\//, 'Space Watch'], [/\/orbit-watch\/tracker\.html$/, 'What\'s in orbit'], [/\/orbit-watch\/collisions\.html$/, 'Close calls and collisions'], [/\/orbit-watch\/cleanup\.html$/, 'Cleaning up'], [/\/orbit-watch\//, 'Orbit Watch'], [/\/planet-maps\//, 'Planetary Maps'], [/\/design\//, 'Components'],
];
function wireBack() {
  const el = document.getElementById('back');
  if (!el || !el.classList.contains('backlink')) return;
  let ref = null;
  try { ref = new URL(document.referrer); } catch { /* no referrer */ }
  if (!ref || ref.origin !== location.origin || ref.pathname === location.pathname) return;
  const p = ref.pathname;
  const hit = NAMES.find(([rx]) => rx.test(p));
  const name = hit ? hit[1] : (p === root.pathname || p === root.pathname + 'index.html' ? 'the home page' : null);
  el.textContent = name ? 'Back to ' + name : 'Back';   // the arrow is drawn by the style sheet
  el.href = ref.href;
  el.addEventListener('click', (e) => {
    if (history.length > 1 && !e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) { e.preventDefault(); history.back(); }
  });
}

// Rows that scroll sideways (segmented controls and chip rows that don't fit a small screen): a soft fade on the side
// where there is more, and the chosen button scrolled into view, so nothing looks cut off. Decided Nov 12, 2026; since
// Nov 13, 2026 (version 2 of the look) tab bars wrap instead and every segmented control (.seg) gets the fade.
const HSCROLL = '.seg, .popular, .tabs.bar, [data-hscroll]';
function fades(el) {
  const more = el.scrollWidth - el.clientWidth;
  el.classList.toggle('hs-l', more > 2 && el.scrollLeft > 2);
  el.classList.toggle('hs-r', more > 2 && el.scrollLeft < more - 2);
}
function wireScrollRows() {
  const ro = 'ResizeObserver' in window ? new ResizeObserver((es) => es.forEach((e) => fades(e.target))) : null;
  const init = (el) => {
    if (el.dataset.hs) return;
    el.dataset.hs = '1';
    el.classList.add('hscroll');
    el.addEventListener('scroll', () => fades(el), { passive: true });
    if (ro) ro.observe(el);
    const sel = el.querySelector('[aria-current="page"], [aria-selected="true"], [aria-pressed="true"]');
    // the selected item is scrolled into the middle only when it is not already fully in view (measured against the
    // row itself: offsetLeft counts from the nearest positioned parent, which scrolled rows whose first item was chosen)
    if (sel && el.scrollWidth > el.clientWidth) {
      const r = el.getBoundingClientRect(), q = sel.getBoundingClientRect(), x = q.left - r.left + el.scrollLeft;
      if (q.left < r.left || q.right > r.right) el.scrollLeft = Math.max(0, x - (el.clientWidth - q.width) / 2);
    }
    fades(el);
  };
  const scan = () => document.querySelectorAll(HSCROLL).forEach(init);
  const all = () => document.querySelectorAll('.hscroll').forEach(fades);
  scan();
  addEventListener('resize', all, { passive: true });
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('.hscroll')) requestAnimationFrame(all); });
  // rows the pages add later (search chips, a view's controls): picked up as they appear
  let queued = false;
  new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; scan(); all(); }); } })
    .observe(document.body, { childList: true, subtree: true });
}

// The live data status (shared/datastatus.js, rules in docs/DATA-UPDATES.md): a light and one line at the foot of the
// footer, on the credit line's row, refreshed every 3 minutes while the page is open; the times in it are kept current every 30 seconds.
async function addLiveStatus() {
  const footer = pageFooter();
  if (!footer || footer.querySelector('.livestatus')) return;
  const v = new URL(import.meta.url).search;
  let ds;
  try { ds = await import(new URL('datastatus.js' + v, import.meta.url).href); } catch { return; }
  const a = document.createElement('a');
  a.className = 'livestatus';
  a.href = new URL('data-collection/', root).href;
  if (location.pathname.includes('/data-collection/')) a.setAttribute('aria-current', 'page');
  a.dataset.state = 'unknown';
  a.innerHTML = '<span class="light" data-state="unknown" aria-hidden="true"></span><span class="ls-t">Checking the data…</span>'
    + '<span class="ls-s" hidden></span>';
  // under the NEDAP name in the site map (a page without it gets the line at the end)
  const brandBlock = footer.querySelector('.fbrand');
  if (brandBlock) brandBlock.append(a); else footer.append(a);
  const [t, sub, light] = [a.querySelector('.ls-t'), a.querySelector('.ls-s'), a.querySelector('.light')];
  let last = null;
  const paint = () => {
    if (!last) return;
    const now = Date.now();
    a.dataset.state = light.dataset.state = last.state;
    t.textContent = last.headline;
    const l = last.latest;
    sub.textContent = { ok: l ? 'updated ' + ds.ago(l.changed, now) : '', updating: '', late: 'latest data shown',
      partial: 'previous data kept', failed: 'previous data kept', unknown: '' }[last.state];
    sub.hidden = !sub.textContent;
    a.setAttribute('aria-label', 'Live data status: ' + last.headline + (sub.textContent ? ', ' + sub.textContent : '') + '. How the data is collected.');
  };
  const refresh = async (fresh) => { last = await ds.load({ fresh }); paint(); };
  await refresh(false);
  setInterval(paint, 30000);
  setInterval(() => { if (!document.hidden) refresh(false); }, ds.REFRESH_MS);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(false); });
}

// Reading progress, back to top, gliding tabs and rising sections (shared/motion.js, since Nov 18, 2026)
async function addMotion() {
  try { (await import(new URL('motion.js' + new URL(import.meta.url).search, import.meta.url).href)).startMotion(); } catch { /* the page works without it */ }
  // the small surprises (shared/eggs.js), once the page is idle
  const later = window.requestIdleCallback || ((f) => setTimeout(f, 1500));
  later(() => import(new URL('eggs.js' + new URL(import.meta.url).search, import.meta.url).href).catch(() => {}));
}

// a picture that cannot be loaded, from a page with no error handling of its own (no onerror), is hidden with its
// frame and caption instead of showing its description as a block of text (Nov 18, 2026)
document.addEventListener('error', (e) => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || img.onerror || img.hasAttribute('data-keep')) return;
  img.classList.add('img-failed');
}, true);
// pictures that had already failed before this script ran
const failedEarly = () => { for (const img of document.images) if (img.complete && img.currentSrc && !img.naturalWidth && !img.onerror && !img.hasAttribute('data-keep')) img.classList.add('img-failed'); };


// ============================================================== site tools (Nov 19, 2026)
const VER = new URL(import.meta.url).search;
const shared = (f) => new URL(f + VER, import.meta.url).href;
const ICON_SEARCH = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const ICON_LINK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5l3-3M7 4.5l1.2-1.2a2.8 2.8 0 014 4L11 8.5M9 11.5l-1.2 1.2a2.8 2.8 0 01-4-4L5 7.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
export const openSearch = async (q = '') => (await import(shared('search.js'))).openSearch(q);
const openKeys = async () => (await import(shared('keys.js'))).openKeys();

// typing in a box, or a control that uses the keys itself, keeps them
function typing(e) {
  const t = e.target;
  return e.defaultPrevented || e.altKey || (t && t.closest && t.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], dialog, [role="slider"], [role="application"], .mapframe, .frame'));
}
function shortcuts() {
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
    if (e.ctrlKey || e.metaKey || typing(e)) return;
    if (e.key === '/') { e.preventDefault(); openSearch(); return; }
    if (e.key === '?') { e.preventDefault(); openKeys(); return; }
    // 1 to 9: the project's tabs (the project tab bar)
    if (/^[1-9]$/.test(e.key)) {
      const tabs = [...document.querySelectorAll('nav.tabs.bar:not(.sub):not([data-spy]) a[href]')];
      const a = tabs[+e.key - 1];
      if (a) { e.preventDefault(); a.click(); }
      return;
    }
    // ← and →: the previous and next period, on tools that mark their buttons with data-key="prev" / "next"
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const b = [...document.querySelectorAll(`[data-key="${e.key === 'ArrowLeft' ? 'prev' : 'next'}"]`)]
        .find((x) => !x.disabled && x.offsetParent !== null);
      if (b) { e.preventDefault(); b.click(); }
    }
  });
}

// the search button in the top bar (from 761 px) and "Search the site" in the footer (every width)
function searchButtons() {
  const wrap = document.querySelector('.topbar .wrap');
  if (wrap && !wrap.querySelector('.navsearch') && !document.body.hasAttribute('data-nosearch')) {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'navsearch' });
    b.innerHTML = ICON_SEARCH + '<span class="t">Search</span><kbd>/</kbd>';
    b.setAttribute('aria-label', 'Search the site');
    b.addEventListener('click', () => openSearch());
    wrap.append(b);
  }
  const brandBlock = document.querySelector('footer.footer .fbrand');
  if (brandBlock && !brandBlock.querySelector('.fsearch')) {
    const f = Object.assign(document.createElement('button'), { type: 'button', className: 'fsearch' });
    f.innerHTML = ICON_SEARCH + 'Search the site';
    f.addEventListener('click', () => openSearch());
    brandBlock.querySelector('.ftag').after(f);
  }
}

// "Copy link to this section" after each section heading with an id; left out of pages whose address (#…) chooses a
// view, where a link to a section would open another view
const NOLINKS = [/\/asteroid-tracker\/(index\.html|tracker\.html)?$/, /\/image-explorer\/explore\.html$/, /\/planet-maps\//,
  /\/sky-finder\//, /\/design\//];
function sectionLinks() {
  if (NOLINKS.some((rx) => rx.test(location.pathname))) return;
  for (const h of document.querySelectorAll('main .section-head h2[id]')) {
    if (h.querySelector('.hlink')) continue;
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'hlink' });
    b.innerHTML = ICON_LINK;
    b.setAttribute('aria-label', 'Copy link to this section');
    b.title = 'Copy link to this section';
    b.addEventListener('click', async () => {
      const url = location.origin + location.pathname + location.search + '#' + h.id;
      let ok = true;
      try { await navigator.clipboard.writeText(url); } catch { ok = false; }
      try { (await import(shared('motion.js'))).toast(ok ? 'Link to “' + h.textContent.trim() + '” copied' : 'Couldn’t copy the link', { bad: !ok }); } catch { /* no notice */ }
    });
    h.append(' ', b);
  }
}

// a dot in the menu beside each part of the site with a page published since the visitor's last visit (the date of the
// last visit is kept in this browser only, never sent; Privacy page); nothing on a first visit
function newDots() {
  let prev;
  try {
    prev = sessionStorage.getItem('nedap-prev');
    if (prev === null) { prev = localStorage.getItem('nedap-last') || ''; sessionStorage.setItem('nedap-prev', prev); }
    localStorage.setItem('nedap-last', new Date().toISOString().slice(0, 10));
  } catch { return; }
  if (!prev) return;
  const folderOf = (href) => new URL(href, root).pathname.slice(root.pathname.length).split('/')[0];
  const fresh = new Set();
  for (const [, items] of SECTIONS) {
    const newer = items.some(([, , o]) => o && o.added && o.added > prev && !o.soon);
    if (newer) fresh.add(folderOf(items[0][1]));
  }
  for (const a of document.querySelectorAll('.topbar .nav a')) {
    if (!fresh.has(folderOf(a.getAttribute('href'))) || a.querySelector('.newdot')) continue;
    a.insertAdjacentHTML('beforeend', '<span class="newdot" aria-hidden="true"></span><span class="sr"> (new since your last visit)</span>');
  }
}

// "On this page" bars (nav.tabs[data-spy] with links to #sections): the section being read is marked
function spy() {
  for (const bar of document.querySelectorAll('nav.tabs[data-spy]')) {
    const links = new Map([...bar.querySelectorAll('a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a]));
    const seen = new Map();
    const io = new IntersectionObserver((es) => {
      for (const x of es) seen.set(x.target.id, x.isIntersecting ? x.intersectionRatio : 0);
      const best = [...seen].filter(([, r]) => r > 0).sort((a, b) => b[1] - a[1])[0];
      for (const [id, a] of links) if (best && id === best[0]) a.setAttribute('aria-current', 'location'); else if (best) a.removeAttribute('aria-current');
    }, { rootMargin: '-120px 0px -45% 0px', threshold: [0, .1, .3, .6] });
    for (const id of links.keys()) { const t = document.getElementById(id); if (t) io.observe(t); }
  }
}

function siteTools() {
  try { searchButtons(); shortcuts(); sectionLinks(); newDots(); spy(); } catch { /* the page works without them */ }
}

function start() { buildFooter(); wireBack(); wireScrollRows(); addLiveStatus(); addMotion(); failedEarly(); siteTools(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
