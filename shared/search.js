// NASA and ESA Data Projects · the site search · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// A panel over the page (added Nov 19, 2026), opened by the search button in the top bar, "Search the site" in the
// footer, or the keys / and Ctrl+K (Cmd+K on a Mac); shared/footer.js loads this file only when it is first needed.
// It searches shared/search.json: every page with its description and section headings, the views listed in the
// footer, and the spacecraft of the spacecraft map. The list is rebuilt by dev/build_search.py, which GitHub runs after
// every push (in the Project Record workflow), so pages never need to add themselves.
// Everything happens in the browser: what is typed is never sent anywhere.
// Keys in the panel: ↑ and ↓ choose a result, Enter opens it, Esc closes the panel.

const root = new URL('../', import.meta.url.split('?')[0]);
const VER = new URL(import.meta.url).search;
let dlg, input, list, foot, items = null, hits = [], cur = -1;

const fold = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, '');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// the words of the query marked in a piece of text
function mark(text, words) {
  let out = esc(text);
  for (const w of words) {
    if (w.length < 2) continue;
    const rx = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    out = out.replace(/(^|>)([^<]*)/g, (m, a, b) => a + b.replace(rx, '<mark>$1</mark>'));
  }
  return out;
}

async function load() {
  if (items) return;
  try {
    const d = await (await fetch(new URL('search.json' + VER, import.meta.url), { cache: 'no-cache' })).json();
    items = [];
    for (const p of d.pages) {
      items.push({ t: p.t, u: p.u, d: p.d, k: p.k, hay: fold([p.t, p.d, p.k, p.a || ''].join(' ')), page: true, top: p.top || 0 });
      for (const [h, id] of p.h || []) items.push({ t: h, u: p.u + '#' + id, d: p.t, k: p.k, hay: fold(h + ' ' + p.t), sub: true });
    }
    for (const c of d.craft || []) items.push({ t: c.t, u: c.u, d: c.d, k: 'Spacecraft', hay: fold([c.t, c.a || '', c.d].join(' ')) });
  } catch { items = []; }
}

function score(it, words, q) {
  const t = fold(it.t);
  let s = 0;
  for (const w of words) {
    if (!it.hay.includes(w)) return 0;
    s += t.startsWith(w) ? 30 : t.includes(w) ? 18 : 4;
  }
  if (t === q) s += 60; else if (t.startsWith(q)) s += 25;
  if (it.page) s += 8;
  if (it.sub) s -= 3;
  return s;
}

function render() {
  const q = fold(input.value.trim());
  const words = q.split(/\s+/).filter(Boolean);
  if (!words.length) {
    hits = (items || []).filter((x) => x.top).sort((a, b) => a.top - b.top);   // with nothing typed: the projects and tools, in the menu's order
  } else {
    hits = (items || []).map((x) => [score(x, words, q), x]).filter(([s]) => s > 0).sort((a, b) => b[0] - a[0]).slice(0, 14).map(([, x]) => x);
  }
  cur = hits.length ? 0 : -1;
  list.innerHTML = hits.map((x, i) => `<li><a class="hit" href="${esc(new URL(x.u, root).href)}" id="sh-${i}"${i === cur ? ' aria-selected="true"' : ''}>`
    + `<span class="ht"><span class="hk">${esc(x.k)}</span>${mark(x.t, words)}</span>`
    + (x.d ? `<span class="hs">${mark(x.d, words)}</span>` : '') + '</a></li>').join('');
  const asteroid = words.length ? `<li><a class="hit" href="${esc(new URL('asteroid-tracker/tracker.html#search', root).href)}">`
    + `<span class="ht"><span class="hk">Asteroids</span>Look for an asteroid by name or code</span>`
    + `<span class="hs">The Asteroid Tracker's search, with every near-Earth object NASA lists</span></a></li>` : '';
  list.insertAdjacentHTML('beforeend', asteroid);
  if (words.length && !hits.length) list.insertAdjacentHTML('afterbegin', `<li class="none">Nothing on the site matches “${esc(input.value.trim())}”.</li>`);
  foot.querySelector('.count').textContent = !items ? 'Loading the list of pages…'
    : words.length ? (hits.length ? hits.length + (hits.length === 1 ? ' result' : ' results') : 'No results') : 'Where to start';
}

function move(d) {
  const as = [...list.querySelectorAll('a')];
  if (!as.length) return;
  cur = (cur + d + as.length) % as.length;
  as.forEach((a, i) => (i === cur ? a.setAttribute('aria-selected', 'true') : a.removeAttribute('aria-selected')));
  as[cur].scrollIntoView({ block: 'nearest' });
  input.setAttribute('aria-activedescendant', as[cur].id || '');
}

function build() {
  if (dlg) return;
  dlg = document.createElement('dialog');
  dlg.className = 'dlg';
  dlg.setAttribute('aria-label', 'Search the site');
  dlg.innerHTML = '<div class="shead2"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    + '<input type="search" placeholder="Search the site" aria-label="Search the site" autocomplete="off" spellcheck="false" aria-controls="shits">'
    + '<button type="button" class="close" aria-label="Close the search">×</button></div>'
    + '<div class="sbody"><ul class="hits" id="shits"></ul></div>'
    + '<div class="sfoot"><span class="count" aria-live="polite"></span><span class="keyhint"><kbd>↑</kbd> <kbd>↓</kbd> to choose · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close</span></div>';
  document.body.append(dlg);
  input = dlg.querySelector('input');
  list = dlg.querySelector('.hits');
  foot = dlg.querySelector('.sfoot');
  dlg.querySelector('.close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });   // a click on the dimmed page
  input.addEventListener('input', render);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); dlg.close(); }   // closes at once (a search box would first clear itself)
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      const a = list.querySelectorAll('a')[Math.max(cur, 0)];
      if (a) { e.preventDefault(); a.click(); }
    }
  });
  // a result on this same page: close the panel and go there
  list.addEventListener('click', (e) => { if (e.target.closest('a')) setTimeout(() => dlg.close(), 0); });
}

export async function openSearch(q = '') {
  build();
  if (!dlg.open) dlg.showModal();
  input.value = q;
  input.focus();
  render();
  await load();
  render();
}
