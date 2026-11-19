#!/usr/bin/env python3
# NASA and ESA Data Projects · builds the site search's list · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Writes shared/search.json for the site search (shared/search.js, Nov 19, 2026): every page of the site with its
# heading, description and section headings (h2 with an id), the views listed in the footer (SECTIONS in
# shared/footer.js), and the spacecraft of the spacecraft map (spacecraft/catalogue.json).
# GitHub runs it after every push to main, in the Project Record workflow, and commits the list with the record, so
# pages never need to add themselves. Run it by hand to try the search locally:  python3 dev/build_search.py

import html
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'shared', 'search.json')

GROUPS = {'asteroid-tracker': 'Asteroid Tracker', 'image-explorer': 'Image Explorer', 'mars-data': 'Mars Data',
          'space-watch': 'Space Watch', 'orbit-watch': 'Orbit Watch', 'space-weather': 'Space Weather',
          'exoplanets': 'Exoplanets', 'planet-maps': 'Planetary Maps', 'sky-finder': 'Sky Finder',
          'spacecraft': 'Spacecraft map'}
# the starting list (nothing typed yet), in this order
TOP = ['', 'asteroid-tracker/', 'image-explorer/', 'mars-data/', 'space-watch/', 'orbit-watch/', 'space-weather/',
       'exoplanets/', 'planet-maps/', 'sky-finder/', 'spacecraft/']
SKIP = ('404.html', 'design/', 'control-room/', 'asteroid-tracker/object.html')
# pages whose address (#…) chooses a view: their section headings are not listed (a link to one would open another view)
VIEWS = ('asteroid-tracker/tracker.html', 'image-explorer/explore.html', 'planet-maps/')


def text(s):
    s = re.sub(r'<(script|style)\b.*?</\1>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<button\b.*?</button>', ' ', s, flags=re.S | re.I)
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def page(path):
    src = open(os.path.join(ROOT, path), encoding='utf-8').read()
    url = path[:-len('index.html')] if path.endswith('index.html') else path
    h1 = re.search(r'<h1\b[^>]*>(.*?)</h1>', src, re.S)
    title = text(h1.group(1)) if h1 else ''
    tt = re.search(r'<title>(.*?)</title>', src, re.S)
    full = text(tt.group(1)).split(' · ')[0] if tt else ''
    if not title or title.startswith(('Loading', '…')):
        title = full
    desc = re.search(r'<meta name="description" content="([^"]*)"', src)
    heads = [(text(m.group(2)), m.group(1)) for m in re.finditer(r'<h2\b[^>]*\bid="([^"]+)"[^>]*>(.*?)</h2>', src, re.S)]
    folder = url.split('/')[0] if '/' in url else ''
    k = GROUPS.get(folder, 'NEDAP')
    entry = {'t': title, 'u': url, 'd': html.unescape(desc.group(1)) if desc else '', 'k': k,
             'h': [] if url.startswith(VIEWS) else [[h, i] for h, i in heads if h]}
    if full and full != title:
        entry['a'] = full
    if url in TOP:
        entry['top'] = TOP.index(url) + 1
        if url == '':
            entry['t'] = 'Home'
    return entry


def main():
    files = subprocess.run(['git', 'ls-files', '*.html'], cwd=ROOT, capture_output=True, text=True).stdout.split()
    pages = []
    for f in sorted(files):
        if 'mockup' in f or '/vendor/' in f or f.startswith(('brand/', 'docs/', 'dev/')) or f.startswith(SKIP):
            continue
        pages.append(page(f))
    # the views of a page listed in the footer (tracker.html#risk, explore.html#globe)
    js = open(os.path.join(ROOT, 'shared', 'footer.js'), encoding='utf-8').read()
    sec = js[js.index('const SECTIONS'):js.index('const LEGAL')]
    for label, url in re.findall(r"\['([^']+)', '([\w./-]+#\w+)'", sec):
        base = next((p for p in pages if p['u'] == url.split('#')[0]), None)
        pages.append({'t': label, 'u': url, 'd': base['t'] if base else '', 'k': base['k'] if base else 'NEDAP', 'h': []})
    craft = []
    try:
        cat = json.load(open(os.path.join(ROOT, 'spacecraft', 'catalogue.json'), encoding='utf-8'))
        for c in cat.get('craft', []):
            about = re.split(r'(?<=\.)\s', c.get('about', ''), maxsplit=1)[0]
            name = c.get('full') or c.get('name')
            item = {'t': name, 'u': 'spacecraft/', 'd': about}
            if c.get('name') and c.get('name') != name:
                item['a'] = c['name']
            craft.append(item)
    except (OSError, ValueError):
        pass
    data = {'about': 'The site search list (shared/search.js), built by dev/build_search.py.', 'pages': pages, 'craft': craft}
    new = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    old = open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
    if new != old:
        open(OUT, 'w', encoding='utf-8').write(new)
    print(f'Search list: {len(pages)} pages and views, {len(craft)} spacecraft ({len(new) // 1024} KB).')


if __name__ == '__main__':
    main()
