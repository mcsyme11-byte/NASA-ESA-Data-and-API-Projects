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
// It also sets up the "‹ Back" button on pages that have one (see wireBack below), the soft edge fade on rows that
// scroll sideways (wireScrollRows), and the live data status (addLiveStatus, since Nov 14, 2026): a light and one line
// saying whether the site's data is up to date, updating now, late or failed, linked to the data-collection page.
// Links are worked out from this file's own address, so they are right at any folder depth.

const REPO = 'https://github.com/mcsyme11-byte/NASA-ESA-Data-and-API-Projects';
const root = new URL("../", import.meta.url.split("?")[0]);

// the page's own footer: the last <footer class="footer"> (a page may show a footer's parts as an example above it)
const pageFooter = () => [...document.querySelectorAll('footer.footer')].pop() || null;

// [label, address from the site's top folder, options]; `soon: true` keeps a page out until it is live
const SECTIONS = [
  ['Asteroid Tracker', [['Overview', 'asteroid-tracker/'], ['This week', 'asteroid-tracker/tracker.html'],
    ['Impact risk', 'asteroid-tracker/tracker.html#risk'], ['Visible from here', 'asteroid-tracker/tracker.html#visible'],
    ['Within reach', 'asteroid-tracker/mining.html'], ['Solar system map', 'asteroid-tracker/map.html']]],
  ['Image Explorer', [['Overview', 'image-explorer/'], ['Earth map', 'image-explorer/explore.html#earth'],
    ['Globe', 'image-explorer/explore.html#globe'], ['Picture library', 'image-explorer/explore.html#library']]],
  ['Mars Data', [['Overview', 'mars-data/'], ['Charts', 'mars-data/charts/'], ['How the data is made', 'mars-data/method/']]],
  ['Space Watch', [['Overview', 'space-watch/'], ['Orbit Watch', 'orbit-watch/', { soon: true }],
    ['Space Weather', 'space-weather/', { soon: true }], ['Exoplanets', 'exoplanets/', { soon: true }],
    ['Planetary Maps', 'planet-maps/']]],
  ['More', [['Sky Finder', 'sky-finder/'], ['Spacecraft map', 'spacecraft/'], ['How the data is collected', 'data-collection/'],
    ['About', 'about/'], ['Contact', 'contact/']]],
];
const LEGAL = [['Legal', 'legal/'], ['Privacy', 'privacy/'], ['Terms', 'terms/'], ['Credits', 'credits/'],
  ['MIT licence', REPO + '/blob/main/LICENSE.md', { external: true }], ['Source code', REPO, { external: true }]];

// the same page whether written as folder/ or folder/index.html
const norm = (p) => p.replace(/index\.html$/, '');

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
  if (copy) legal.append(copy);
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
  [/\/credits\//, 'Credits'], [/\/data-collection\//, 'How the data is collected'], [/\/contact\//, 'Contact'], [/\/legal\//, 'Legal'], [/\/sky-finder\/how-to\.html$/, 'How to use Sky Finder'], [/\/sky-finder\//, 'Sky Finder'], [/\/spacecraft\//, 'the spacecraft map'], [/\/space-watch\//, 'Space Watch'], [/\/planet-maps\//, 'Planetary Maps'], [/\/design\//, 'Components'],
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
const HSCROLL = '.seg, .popular, [data-hscroll]';
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
    if (sel && el.scrollWidth > el.clientWidth) el.scrollLeft = Math.max(0, sel.offsetLeft - (el.clientWidth - sel.offsetWidth) / 2);
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

function start() { buildFooter(); wireBack(); wireScrollRows(); addLiveStatus(); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
