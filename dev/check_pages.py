#!/usr/bin/env python3
# NASA and ESA Data Projects · the page check · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Opens every page and view of the site in a real browser (Chromium through Playwright) at the widths of
# docs/DESIGN.md and reports what a visitor would see go wrong (added Nov 18, 2026; step 3 of docs/CHECKS.md):
#   PAGE-WIDE  the page is wider than the screen (it scrolls sideways)
#   offscreen  text running off the screen        clip     text cut off inside its box
#   svgclip    chart labels cut off by the chart   overlap  two pieces of text on top of each other
#   tap        a control under 40 px tall on a phone (inline links in text, and .reload, which has a 40 px tap area,
#              are left out)
#   tiny       text under 10.5 px                  nofade   a sideways-scrolling row without the edge fade
#   noname     a control with no name for screen readers; nolabel a field without a label; noalt an image without alt
#   dupid      an id used twice                    h1       not exactly one visible h1
#   errors     script errors                       bad      a file of the site that is missing (404)
#   headings   a heading level skipped (h2 straight to h4)
#   nolabelcell a value in a table shown as cards on a phone without its label (data-l or data-label)
#   plainlink  a link inside running text that is not underlined (told apart by colour alone)
#   scrolled   a sideways row scrolled on arrival although its chosen first item was in view
#   aria       aria-selected outside tabs, options and rows; aria-expanded on a table row; an empty table heading
#   layout-shift  the page jumps as it loads (more than CLS_MAX)     weight  more loaded on arrival than the budget
# Requests to other sites are blocked, so every page is also seen in its "NASA out of reach" state; with
# FAILDATA=404 the site's own data files fail too. Screenshots of every page land in the output folder.
#
#   pip install playwright && python3 -m playwright install chromium     (once)
#   python3 dev/check_pages.py                         every page at 320, 375, 390, 768, 1024, 1280 and 1440 px
#   python3 dev/check_pages.py --widths 320,1280       chosen widths
#   python3 dev/check_pages.py --only orbit-watch      pages whose address contains the text
#   python3 dev/check_pages.py --out /tmp/pages        where the screenshots and report.json go (default /tmp/nedap-pages)
#   python3 dev/check_pages.py --changed               only the pages touched since origin/main (all pages when shared/
#                                                       files changed), at 375 and 1280 px: what the pre-push check runs
# Exit code 1 when anything is found. A missing data file of a job that has not run yet ("bad: 404 …/data/…") is
# reported to the Data updates chat, not fixed in the page.
import asyncio, functools, http.server, json, os, re, subprocess, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHANGED = False
WIDTHS = [320, 375, 390, 768, 1024, 1280, 1440]
# budgets (Nov 18, 2026): layout shift as a page loads (Google's "good" limit is 0.1), and what a page loads on
# arrival; the tools that are big by nature have their own budget, and nothing else may grow past the general one
CLS_MAX = 0.1
WEIGHT_KB = 2500
# (weights are as served by the local server, before GitHub Pages compresses them to about a third)
WEIGHT_OK = {'orbit-watch/tracker.html': 6000, 'asteroid-tracker/map.html': 7000, 'image-explorer/explore.html#globe': 6000,
             'image-explorer/explore.html': 3500, 'spacecraft/': 4000,
             # the year view and the search read the whole asteroid list (data/neos.json, about 43,000 orbits) on purpose
             'asteroid-tracker/tracker.html#year': 6500, 'asteroid-tracker/tracker.html#search': 6500}   # first match wins
# views that are not separate files: a page's tabs reached by address, and one asteroid's own page
EXTRA = ['asteroid-tracker/tracker.html#year', 'asteroid-tracker/tracker.html#search', 'asteroid-tracker/object.html?id=99942']


def pages():
    files = subprocess.run(['git', 'ls-files', '*.html'], cwd=ROOT, capture_output=True, text=True).stdout.split()
    out = []
    for f in sorted(files):
        if 'mockup' in f or '/vendor/' in f or f.startswith(('brand/', 'docs/', 'dev/')):
            continue
        out.append(f[:-len('index.html')] if f.endswith('index.html') else f)
    js = open(os.path.join(ROOT, 'shared/footer.js'), encoding='utf-8').read()
    out += sorted(set(re.findall(r"'([\w./-]+\.html#\w+|[\w./-]+/#\w+)'", js)))      # tab views listed in SECTIONS
    return out + EXTRA


def changed_pages(all_pages):
    """Pages touched by the commits not yet on origin/main (and the working tree): all of them when a shared file changed."""
    diff = subprocess.run(['git', 'diff', '--name-only', 'origin/main'], cwd=ROOT, capture_output=True, text=True).stdout.split()
    if any(f.startswith('shared/') or f == 'dev/check_pages.py' for f in diff):
        return all_pages
    folders = {f.split('/')[0] for f in diff if '/' in f}
    roots = {f for f in diff if '/' not in f and f.endswith('.html')}
    return [p for p in all_pages if p.split('/')[0] in folders or (not p and 'index.html' in roots) or p in roots]


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{srv.server_address[1]}/'


JS = r"""
() => {
  const out = {clip: [], offscreen: [], overlap: [], tap: [], tiny: [], noname: [], noalt: [], dupid: [], nolabel: [], h1: 0};
  const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0 && !e.closest('[hidden],dialog:not([open])') && !(e.closest('details:not([open])') && !e.closest('summary')); };
  const desc = (e) => { let s = e.tagName.toLowerCase(); if (e.id) s += '#' + e.id; if (e.className && typeof e.className === 'string') s += '.' + e.className.trim().split(/\s+/).slice(0,2).join('.');
    const t = (e.innerText || e.getAttribute('aria-label') || e.value || '').trim().replace(/\s+/g,' ').slice(0, 50); return s + (t ? ' "' + t + '"' : ''); };
  const W = innerWidth;
  // text leaves: elements with their own non-empty text nodes
  // text inside a scroll box that is scrolled out of view, and screen-reader-only text (.sr), is not seen on screen
  const scrolledAway = (e) => { const r = e.getBoundingClientRect(); for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
    const cs = getComputedStyle(a); if (/auto|scroll|hidden/.test(cs.overflowX + cs.overflowY)) { const ar = a.getBoundingClientRect();
      if (r.bottom < ar.top || r.top > ar.bottom || r.right < ar.left || r.left > ar.right) return true; } } return false; };
  const leaves = [...document.querySelectorAll('body *')].filter(e => !['SCRIPT','STYLE','SVG','svg','NOSCRIPT','OPTION'].includes(e.tagName) && !e.closest('.sr') && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && vis(e) && !scrolledAway(e));
  const scrollRow = (e) => e.closest('.hscroll,[data-hscroll],.tabs,.popular,.tablewrap,.scroll,pre,table') ;
  for (const e of leaves) {
    // clipped by an ancestor with overflow other than visible
    const r = e.getBoundingClientRect();
    // measure text extent with a range (inline-level elements report their own box)
    const range = document.createRange(); range.selectNodeContents(e); const tr = range.getBoundingClientRect();
    let a = e.parentElement;
    while (a && a !== document.body) {
      const cs = getComputedStyle(a);
      if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
        const ar = a.getBoundingClientRect();
        const scrollable = /auto|scroll/.test(cs.overflowX + cs.overflowY);
        if (e.closest('svg')) { if (!scrollable && (tr.right > ar.right + 1.5 || tr.left < ar.left - 1.5)) out.svgclip = (out.svgclip||[]).concat([desc(e).slice(0,60)]); break; }
        if (!scrollable && (tr.right > ar.right + 1.5 || tr.left < ar.left - 1.5 || tr.bottom > ar.bottom + 1.5)) {
          out.clip.push(desc(e) + ' clipped by ' + desc(a).slice(0,60) + ` (${Math.round(tr.right - ar.right)}px)`); break; }
        break;
      }
      a = a.parentElement;
    }
    if (getComputedStyle(e).textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) out.clip.push(desc(e) + ' ellipsis-truncated');
    if (!scrollRow(e) && (tr.right > W + 1 || tr.left < -1) && getComputedStyle(e).position !== 'fixed') out.offscreen.push(desc(e) + ` (right ${Math.round(tr.right)} / ${W})`);
    const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 10.5) out.tiny.push(desc(e) + ' ' + fs + 'px');
  }
  // overlaps between text leaves that aren't nested, using text-range rects
  const boxes = [];
  // text in a bar held on screen while the page scrolls (sticky or fixed) passes over the page by design
  const held = (e) => { for (let a = e; a && a !== document.body; a = a.parentElement) if (/sticky|fixed/.test(getComputedStyle(a).position)) return true; return false; };
  for (const e of leaves.filter(e => !e.closest('svg,canvas,.ol-viewport,.tip,[role=tooltip]') && !held(e))) {
    for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n);
      for (const r of rg.getClientRects()) if (r.width > 2 && r.height > 2) boxes.push([e, r]); }
  }
  // clipped-away text inside a scroll container isn't visible; keep only boxes inside the viewport of their scroll parent
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const [a, ra] = boxes[i], [b, rb] = boxes[j];
    if (a === b || a.contains(b) || b.contains(a)) continue;
    const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ix > 3 && iy > 3) {
      // ignore when one sits in a scrolled-away part of a scroll container
      const pa = getComputedStyle(a).position, pb = getComputedStyle(b).position;
      out.overlap.push(desc(a).slice(0,70) + '  ×  ' + desc(b).slice(0,70) + ` (${Math.round(ix)}x${Math.round(iy)} @${Math.round(ra.top+scrollY)})`);
      if (out.overlap.length > 25) break;
    }
  }
  const phone = W <= 760;
  for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,summary,[role=button],[role=tab],textarea')) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect();
    const inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.closest('p,li,td,dd,.note,.lede,.srcline,.fnote,figcaption');
    if (phone && !inline && !e.classList.contains('reload') && r.height < 40 && !(e.type === 'checkbox' || e.type === 'radio')) out.tap.push(desc(e) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
    const name = (e.getAttribute('aria-label') || e.innerText || e.value || e.title || (e.labels && e.labels[0] && e.labels[0].innerText) || e.getAttribute('placeholder') || (e.querySelector && e.querySelector('img[alt],svg title') ? 'img' : '') || e.getAttribute('aria-labelledby') || '').trim();
    if (!name) out.noname.push(desc(e));
    if (/INPUT|SELECT|TEXTAREA/.test(e.tagName) && !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.title) out.nolabel.push(desc(e));
  }
  for (const im of document.querySelectorAll('img')) if (vis(im) && !im.hasAttribute('alt')) out.noalt.push(desc(im) + ' ' + (im.getAttribute('src')||'').slice(0,60));
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e)) continue; const cs = getComputedStyle(e);
    if (/auto|scroll/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 2 && e.clientHeight < 120 && !e.classList.contains('hscroll')) out.nofade = (out.nofade||[]).concat([desc(e).slice(0,80)]);
  }
  // (Nov 18, 2026) heading levels: no step down of more than one (h2 straight to h4)
  out.headings = []; let last = 0;
  for (const h of document.querySelectorAll('main h1, main h2, main h3, main h4, main h5, main h6')) {
    if (!vis(h) && !h.classList.contains('sr')) continue; const lv = +h.tagName[1];
    if (last && lv > last + 1) out.headings.push(`h${last} → ${desc(h).slice(0, 60)}`); last = lv; }
  // (Nov 18, 2026) on phones every value of a table shown as cards carries its label
  if (phone) for (const td of document.querySelectorAll('.table.stack td:not(:first-child), table.neo td:not(:first-child)')) {
    if (!vis(td) || td.colSpan > 1 || td.closest('tr.drow, tr.msg') || !td.textContent.trim()) continue;
    if (td.children.length === 1 && td.firstElementChild.matches('.btn, .chip') && td.textContent.trim() === td.firstElementChild.textContent.trim()) continue;
    if (!td.hasAttribute('data-l') && !td.hasAttribute('data-label')) { (out.nolabelcell = out.nolabelcell || []).push(desc(td).slice(0, 60)); } }
  // (Nov 18, 2026) a link inside running text is underlined, not told apart by its colour alone
  for (const a of document.querySelectorAll('main p a[href], main li a[href], main figcaption a[href], main .note a[href], main .caption a[href]')) {
    if (!vis(a) || a.className || a.closest('nav, .footer, .tabs, .card, .btn, button, [role=tab]')) continue;
    const cs = getComputedStyle(a); if (cs.display !== 'inline') continue;
    if (!cs.textDecorationLine.includes('underline') && !parseFloat(cs.borderBottomWidth)) (out.plainlink = out.plainlink || []).push(desc(a).slice(0, 60)); }
  // (Nov 18, 2026) a sideways-scrolling row is not scrolled on arrival when its chosen item is already in view
  for (const r of document.querySelectorAll('.hscroll')) {
    const sel = r.querySelector('[aria-pressed="true"], [aria-selected="true"], [aria-current]');
    if (sel && r.scrollLeft > 2 && sel === r.firstElementChild) (out.scrolled = out.scrolled || []).push(desc(r).slice(0, 60)); }
  // (Nov 18, 2026) aria-selected only on tabs, options and grid rows; buttons that switch a view use aria-pressed
  for (const e of document.querySelectorAll('[aria-selected]')) {
    const role = e.getAttribute('role') || '';
    if (!/^(tab|option|row|gridcell|columnheader|rowheader|treeitem)$/.test(role) && e.tagName !== 'TR' && e.tagName !== 'LI') (out.aria = out.aria || []).push(desc(e).slice(0, 60) + ' aria-selected'); }
  for (const e of document.querySelectorAll('tr[aria-expanded]')) (out.aria = out.aria || []).push(desc(e).slice(0, 40) + ' aria-expanded on a table row');
  for (const th of document.querySelectorAll('th')) if (vis(th) && !th.textContent.trim() && !th.getAttribute('aria-label')) (out.aria = out.aria || []).push('an empty table heading');
  // page weight and layout shift (measured by the page check's start-up script)
  const res = performance.getEntriesByType('resource').concat(performance.getEntriesByType('navigation'));
  out.kb = Math.round(res.reduce((t, r) => t + (r.encodedBodySize || r.transferSize || 0), 0) / 1024);
  out.cls = Math.round((window.__cls || 0) * 1000) / 1000;
  const ids = {}; for (const e of document.querySelectorAll('[id]')) ids[e.id] = (ids[e.id] || 0) + 1;
  out.dupid = Object.entries(ids).filter(([k, v]) => v > 1).map(([k, v]) => k + '×' + v);
  out.h1 = [...document.querySelectorAll('h1')].filter(vis).length;
  out.sw = document.documentElement.scrollWidth; out.W = W;
  out.title = document.title;
  return out;
}
"""


async def run(outdir, widths, only):
    os.makedirs(outdir, exist_ok=True)
    base = serve()
    report = {}
    todo = changed_pages(pages()) if CHANGED else pages()
    if not todo:
        print('Page check: no page changed.')
        return 0
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for w in widths:
            # reduced motion: sections that rise into view when scrolled to would otherwise stay invisible below the first
            # screen, in the screenshots and in every check above (found Nov 18, 2026)
            ctx = await b.new_context(viewport={'width': w, 'height': 900}, service_workers='block', device_scale_factor=1,
                                      reduced_motion='reduce')
            # layout shift as the page loads (Nov 18, 2026: tiles and stats drawn only by script pushed pages down)
            await ctx.add_init_script("window.__cls=0;new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value}).observe({type:'layout-shift',buffered:true});")
            pg = await ctx.new_page()
            errs, bad = [], []
            pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)[:160]))
            pg.on('console', lambda m: m.type == 'error' and errs.append('console: ' + m.text[:160]))
            pg.on('response', lambda r: (r.status >= 400 and r.url.startswith(base)) and bad.append(f'{r.status} {r.url[len(base):]}'))

            async def handler(route):
                u = route.request.url
                if u.startswith(base):
                    if os.environ.get('FAILDATA') and re.search(r'/data/|\.json(\?|$)', u) and not u.endswith('webmanifest'):
                        return await route.fulfill(status=int(os.environ['FAILDATA']), content_type='text/plain', body='down')
                    return await route.continue_()
                return await route.abort()
            await pg.route('**/*', handler)
            for u in todo:
                if only and only not in u:
                    continue
                errs.clear(); bad.clear()
                await pg.goto('about:blank')                 # every page fresh: a change of #view alone does not reload it
                try:
                    await pg.goto(base + u, wait_until='load', timeout=30000)
                except Exception as e:
                    errs.append('goto: ' + str(e)[:120])
                await pg.wait_for_timeout(2500)
                try:
                    res = await pg.evaluate(JS)
                except Exception as e:
                    res = {'evalerror': str(e)[:200]}
                res['errors'] = [e for e in errs if 'ERR_FAILED' not in e and 'Failed to load resource' not in e]
                res['bad'] = list(dict.fromkeys(bad))
                report[f'{w} {u or "/"}'] = res
                name = re.sub(r'[^a-z0-9]+', '_', (u or 'home').lower()).strip('_')
                await pg.screenshot(path=f'{outdir}/{name}__{w}.png', full_page=True)
            await ctx.close()
        await b.close()
    json.dump(report, open(f'{outdir}/report.json', 'w'), indent=1)
    known = json.load(open(os.path.join(ROOT, 'dev/known_issues.json'), encoding='utf-8'))['issues']
    found = 0
    import datetime
    today = datetime.date.today()
    for k, r in report.items():
        issues = {x: r.get(x) for x in ('clip', 'svgclip', 'nofade', 'offscreen', 'overlap', 'tap', 'tiny', 'noname', 'noalt',
                                        'dupid', 'nolabel', 'errors', 'bad') if r.get(x)}
        for x in ('headings', 'nolabelcell', 'plainlink', 'scrolled', 'aria'):
            if r.get(x):
                issues[x] = r[x]
        if r.get('cls', 0) > CLS_MAX:
            issues['layout-shift'] = f"{r['cls']} (more than {CLS_MAX}: something is drawn late and pushes the page; draw placeholders in the HTML)"
        page = k.split(' ', 1)[1]
        budget = next((kb for pat, kb in WEIGHT_OK.items() if pat in page), WEIGHT_KB)
        if r.get('kb', 0) > budget:
            issues['weight'] = f"{r['kb']} kB loaded (budget {budget} kB; load big parts only when they are opened)"
        if r.get('sw', 0) > r.get('W', 0):
            issues['PAGE-WIDE'] = f"{r['sw']}>{r['W']}"
        if r.get('h1') != 1:
            issues['h1'] = r.get('h1')
        if 'evalerror' in r:
            issues['eval'] = r['evalerror']
        page = k.split(' ', 1)[1]
        mark = {}
        for x in list(issues):
            hit = next((i for i in known if i['check'] == x and page.startswith(i['page'])), None)
            if hit:
                age = (today - datetime.date.fromisoformat(hit['since'])).days
                mark[x] = f"known, with the {hit['owner']} chat since {hit['since']}" + (' (OVERDUE: over 14 days)' if age > 14 else '')
        if issues:
            if any(x not in mark for x in issues):
                found += 1
            print('==', k)
            for x, v in issues.items():
                if isinstance(v, list):
                    v = v[:8] + (['…+%d' % (len(v) - 8)] if len(v) > 8 else [])
                print('  ', x, v, ('  [' + mark[x] + ']') if x in mark else '')
    print(f'\nPage check: {len(report)} page views, {found} with something to fix (known issues in dev/known_issues.json are '
          f'shown but do not count). Screenshots: {outdir}')
    return found


if __name__ == '__main__':
    a = sys.argv[1:]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    CHANGED = '--changed' in a
    widths = [int(x) for x in opt('--widths', '375,1280' if CHANGED else ','.join(map(str, WIDTHS))).split(',')]
    sys.exit(1 if asyncio.run(run(opt('--out', '/tmp/nedap-pages'), widths, opt('--only'))) else 0)
