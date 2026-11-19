#!/usr/bin/env python3
# NASA and ESA Data Projects · preview cards for shared links · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# When a page of the site is shared (in a message, on social media), the app shows a preview card: a picture, the
# page's title and its description. Added Nov 19, 2026. This script keeps them in place:
#   python3 dev/build_social.py            writes the card's tags (Open Graph and Twitter) into the <head> of every page,
#                                          between "<!-- preview card" and "<!-- /preview card -->"; the title and
#                                          description come from the page's own <title> and description
#   python3 dev/build_social.py --check    lists pages whose tags are missing or out of date (dev/check_docs.py runs it)
#   python3 dev/build_social.py --images   also draws the pictures, shared/og/<part>.png (1200 x 630, in the NEDAP look;
#                                          needs Pillow and the Gelasio font, the twin of Georgia)
# A new page gets its tags by running the script once; a new part of the site gets its own picture in CARDS below.

import html
import os
import random
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://mcsyme11-byte.github.io/NASA-ESA-Data-and-API-Projects/'
NAME = 'NASA and ESA Data Projects'

# the picture of each part of the site: kicker, title, line under it
CARDS = {
    'home': ('Learning and exploring with open data', NAME,
             'Asteroids, Mars weather, the Earth from orbit, satellites, the Sun and other worlds'),
    'asteroid-tracker': ('Project 1', 'Asteroid Tracker', 'Near-Earth asteroids by size and distance, impact risk and the solar system map'),
    'image-explorer': ('Project 2', 'Image Explorer', 'The Earth and space by date, place and mission'),
    'mars-data': ('Project 3', 'Mars Data', 'The weather measured on Mars by Curiosity and Perseverance'),
    'space-watch': ('Tools', 'Orbit & Space Watch', 'Satellites and space junk, the Sun, planets around other stars, and maps of the Moon and Mars'),
    'orbit-watch': ('Orbit & Space Watch', 'Orbit Watch', 'Satellites and space junk around the Earth, on a live globe'),
    'space-weather': ('Orbit & Space Watch', 'Space Weather', 'The Sun now: flares, storms and the aurora'),
    'exoplanets': ('Orbit & Space Watch', 'Exoplanets', 'How planets around other stars are found, and every confirmed one'),
    'planet-maps': ('Orbit & Space Watch', 'Planetary Maps', 'Zoomable maps of the Moon and Mars, with landing sites and rover routes'),
    'sky-finder': ('Phone app', 'Sky Finder', 'Hold your phone up to the sky to find tonight’s passing asteroid'),
    'spacecraft': ('Map', 'Spacecraft, right now', 'Where the active spacecraft of NASA, ESA and others are'),
}
SKIP = ('404.html',)


def pages():
    files = subprocess.run(['git', 'ls-files', '*.html'], cwd=ROOT, capture_output=True, text=True).stdout.split()
    return [f for f in sorted(files) if 'mockup' not in f and '/vendor/' not in f
            and not f.startswith(('brand/', 'docs/', 'dev/')) and not f.startswith(SKIP)]


def block(path, src):
    url = path[:-len('index.html')] if path.endswith('index.html') else path
    part = url.split('/')[0] if '/' in url else ''
    key = part if part in CARDS else 'home'
    tt = re.search(r'<title>(.*?)</title>', src, re.S)
    title = re.sub(r'\s+', ' ', tt.group(1)).strip() if tt else NAME
    if title.endswith(' · ' + NAME):
        title = title[:-len(' · ' + NAME)]
    d = re.search(r'<meta name="description" content="([^"]*)"', src)
    desc = d.group(1) if d else html.escape(CARDS[key][2], quote=True)
    alt = html.escape(f'{CARDS[key][1]}: {CARDS[key][2]}', quote=True)
    ind = re.search(r'\n([ \t]*)<title>', src)
    ind = ind.group(1) if ind else '  '
    lines = ['<!-- preview card for shared links (dev/build_social.py) -->',
             '<meta property="og:type" content="website">',
             f'<meta property="og:site_name" content="{NAME}">',
             f'<meta property="og:title" content="{title}">',
             f'<meta property="og:description" content="{desc}">',
             f'<meta property="og:url" content="{SITE}{url}">',
             f'<meta property="og:image" content="{SITE}shared/og/{key}.png">',
             '<meta property="og:image:width" content="1200">',
             '<meta property="og:image:height" content="630">',
             f'<meta property="og:image:alt" content="{alt}">',
             '<meta name="twitter:card" content="summary_large_image">',
             '<!-- /preview card -->']
    return '\n'.join(ind + x for x in lines)


RX = re.compile(r'[ \t]*<!-- preview card for shared links.*?<!-- /preview card -->', re.S)


def apply(path, check):
    full = os.path.join(ROOT, path)
    src = open(full, encoding='utf-8').read()
    want = block(path, src)
    m = RX.search(src)
    if m and m.group(0) == want:
        return False
    if check:
        return True
    if m:
        new = src[:m.start()] + want + src[m.end():]
    else:
        anchor = re.search(r'<meta name="description"[^>]*>\n', src) or re.search(r'<title>.*?</title>\n', src, re.S)
        new = src[:anchor.end()] + want + '\n' + src[anchor.end():]
    open(full, 'w', encoding='utf-8').write(new)
    return True


def images():
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    fonts = ['/root/.fonts/Gelasio[wght].ttf', os.path.expanduser('~/.fonts/Gelasio[wght].ttf'),
             '/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf']
    italic = ['/root/.fonts/Gelasio-Italic[wght].ttf', os.path.expanduser('~/.fonts/Gelasio-Italic[wght].ttf'),
              '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf']
    reg = next(f for f in fonts if os.path.exists(f))
    ita = next(f for f in italic if os.path.exists(f))
    navy, deep, brass, ink, ink2, muted = (20, 27, 38), (12, 17, 25), (192, 160, 98), (237, 230, 211), (180, 175, 162), (152, 160, 171)
    patch = Image.open(os.path.join(ROOT, 'brand', 'patch', 'nedap-patch-512.png')).convert('RGBA').resize((300, 300), Image.LANCZOS)
    os.makedirs(os.path.join(ROOT, 'shared', 'og'), exist_ok=True)
    for key, (kicker, title, line) in CARDS.items():
        W, H = 1200, 630
        img = Image.new('RGB', (W, H), navy)
        # a soft darker edge and a few stars, the same on every card
        glow = Image.new('L', (W, H), 0)
        ImageDraw.Draw(glow).ellipse((-300, -350, W + 300, H + 350), fill=255)
        img = Image.composite(img, Image.new('RGB', (W, H), deep), glow.filter(ImageFilter.GaussianBlur(120)))
        dr = ImageDraw.Draw(img)
        rnd = random.Random(7)
        for _ in range(140):
            x, y, r = rnd.randrange(W), rnd.randrange(H), rnd.choice([0.6, 0.8, 1, 1.2, 1.6])
            if 430 < x < 1150 and 150 < y < 585:   # none behind the words
                continue
            a = rnd.randint(60, 190)
            dr.ellipse((x - r, y - r, x + r, y + r), fill=tuple(int(c * a / 255 + n * (1 - a / 255)) for c, n in zip(ink, navy)))
        dr.rectangle((28, 28, W - 29, H - 29), outline=brass, width=1)
        img.paste(patch, (90, (H - 300) // 2), patch)
        x0, maxw = 450, W - 450 - 80
        fk = ImageFont.truetype(reg, 22)
        k = kicker.upper()
        cx = x0
        for ch in k:   # letter-spaced, like the site's kickers
            dr.text((cx, 170), ch, font=fk, fill=brass)
            cx += dr.textlength(ch, font=fk) + 4
        size = 74
        while True:
            ft = ImageFont.truetype(reg, size)
            words, rows, row = title.split(), [], ''
            for w in words:
                t = (row + ' ' + w).strip()
                if dr.textlength(t, font=ft) <= maxw: row = t
                else: rows.append(row); row = w
            rows.append(row)
            if len(rows) <= 2 or size <= 52: break
            size -= 4
        y = 214
        for r in rows:
            dr.text((x0, y), r, font=ft, fill=ink)
            y += int(size * 1.12)
        dr.line((x0, y + 18, x0 + 90, y + 18), fill=brass, width=2)
        fl = ImageFont.truetype(ita, 30)
        words, rows, row = line.split(), [], ''
        for w in words:
            t = (row + ' ' + w).strip()
            if dr.textlength(t, font=fl) <= maxw: row = t
            else: rows.append(row); row = w
        rows.append(row)
        y += 44
        for r in rows[:3]:
            dr.text((x0, y), r, font=fl, fill=ink2)
            y += 40
        fs = ImageFont.truetype(reg, 20)
        foot = 'NEDAP  ·  ' + SITE.replace('https://', '').rstrip('/') if key != 'home' else SITE.replace('https://', '').rstrip('/')
        dr.text((x0, H - 82), foot, font=fs, fill=muted)
        img.save(os.path.join(ROOT, 'shared', 'og', key + '.png'), optimize=True)
    print(f'Pictures: {len(CARDS)} in shared/og/.')


def main():
    check = '--check' in sys.argv
    if '--images' in sys.argv:
        images()
    out = [p for p in pages() if apply(p, check)]
    if check:
        if out:
            print('Preview cards missing or out of date (run python3 dev/build_social.py):\n  ' + '\n  '.join(out))
            sys.exit(1)
        print('Preview cards: every page has its tags.')
    else:
        print(f'Preview cards: {len(out)} pages updated.')


if __name__ == '__main__':
    main()
