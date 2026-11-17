"""NEDAP mission patch: writes the patch and its two small marks as SVG files with no live text.

The ring lettering is converted to outlines from Gelasio (SIL Open Font License; the same letter widths as Georgia,
the font the patch was first drawn in), so the files look the same on every device and in print. The stars are drawn
shapes. The centre symbol is original artwork drawn for this patch (an irregular asteroid with three craters).

Usage:  python3 brand/patch/build_patch.py <path to Gelasio[wght].ttf>
Writes: brand/patch/nedap-patch.svg, nedap-mark.svg, nedap-mark-small.svg (next to this script), and the site's copies:
        shared/emblem.svg (the top-bar mark, as a symbol pages reuse with <use href="…/shared/emblem.svg#e">),
        shared/icons/favicon.svg (the browser-tab icon) and shared/icons/icon.svg (the home-screen icon's source).
The PNG files are renders of these SVG files (see brand/patch/README.md).

NEDAP mission patch · © 2026 Malcolm Syme · mcsyme11@gmail.com
"""
import math
import pathlib
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

HERE = pathlib.Path(__file__).resolve().parent
CREDIT = 'NEDAP (NASA and ESA Data and API Projects) mission patch · © 2026 Malcolm Syme · mcsyme11@gmail.com'

NAVY_DEEP, BRASS, BRASS_DIM, BRASS_BRIGHT = '#0C1119', '#C0A062', '#7E6A45', '#E2C88E'
GREEN, CREAM, MUTED = '#8FB996', '#EDE6D3', '#98A0AB'
GRADIENT = ('<radialGradient id="nedap-g" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="#26324A"/>'
            '<stop offset="1" stop-color="#0E1520"/></radialGradient>')

# The centre symbol, on a 24-unit grid: an irregular asteroid with two large craters and one small one.
SYMBOL = ('M5.2 8.1C6.6 4.6 10.4 3 14 3.6c3.8.6 6.6 3.4 6.6 7.3 0 2.9-1.3 5.4-3.4 7.4-2.3 2.2-5.4 3.1-8.3 2.4'
          'C5.6 19.9 3.3 17.2 3.3 13.6c0-2.1.8-3.8 1.9-5.5z'
          'M14.6 7.6c1.4.1 2.3 1.2 2.1 2.5-.2 1.2-1.4 1.9-2.6 1.6-1.1-.3-1.7-1.4-1.3-2.5.3-1 .9-1.6 1.8-1.6z'
          'M8.6 13.8c1 0 1.8.8 1.7 1.8 0 .9-.9 1.6-1.9 1.5-.9-.1-1.5-.9-1.4-1.8.1-.9.8-1.5 1.6-1.5z'
          'M15.6 16.1h.01')


def symbol(x, y, scale, width):
    return (f'<g transform="translate({x} {y}) scale({scale})" fill="none" stroke="{CREAM}" stroke-width="{width}" '
            f'stroke-linecap="round" stroke-linejoin="round"><path d="{SYMBOL}"/></g>')


def star(cx, cy, r, rot):
    pts = []
    for i in range(10):
        a = rot + i * math.pi / 5
        rr = r if i % 2 == 0 else r * 0.42
        pts.append(f'{cx + rr * math.cos(a):.3f},{cy + rr * math.sin(a):.3f}')
    return f'<polygon points="{" ".join(pts)}" fill="{MUTED}"/>'


class Ring:
    """Lays text along a circle the way SVG textPath does, as outlines."""

    def __init__(self, font):
        self.font = font
        self.glyphs = font.getGlyphSet()
        self.cmap = font.getBestCmap()
        self.upm = font['head'].unitsPerEm

    def advance(self, ch, size):
        return self.font['hmtx'][self.cmap[ord(ch)]][0] * size / self.upm

    def text(self, s, size, spacing, r, cx, cy, top, fill, gap=None):
        """Centred on the top (top=True, letters outward) or bottom (letters reading upright inside the circle).
        gap: a function giving extra items (such as stars) to lay out; returns (paths, placements)."""
        adv = [self.advance(c, size) if c != ' ' else self.advance(' ', size) for c in s]
        total = sum(adv) + spacing * (len(s) - 1)
        out = []
        pos = -total / 2
        for ch, a in zip(s, adv):
            mid = pos + a / 2
            ang = mid / r                                      # angle from the top or bottom point, in radians
            if top:
                phi = -math.pi / 2 + ang                       # screen angle of the point on the circle
                rot = phi + math.pi / 2
            else:
                phi = math.pi / 2 - ang
                rot = phi - math.pi / 2
            px, py = cx + r * math.cos(phi), cy + r * math.sin(phi)
            if ch.strip():
                pen = SVGPathPen(self.glyphs)
                k = size / self.upm
                c, sn = math.cos(rot), math.sin(rot)
                # glyph units (y up) -> centred on its advance, scaled, flipped, rotated, moved onto the circle
                ax = -self.font['hmtx'][self.cmap[ord(ch)]][0] / 2
                tp = TransformPen(pen, (k * c, k * sn, k * sn, -k * c, px + k * c * ax, py + k * sn * ax))
                self.glyphs[self.cmap[ord(ch)]].draw(tp)
                d = pen.getCommands()
                if d:
                    out.append(f'<path d="{d}" fill="{fill}"/>')
            pos += a + spacing
        return out, total


def svg(body, label):
    return (f'<!-- {CREDIT} -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" '
            f'aria-label="{label}"><defs>{GRADIENT}</defs>{body}</svg>\n')


def patch(ring):
    parts = [f'<circle cx="50" cy="50" r="48" fill="{NAVY_DEEP}" stroke="{BRASS}" stroke-width="2.2"/>',
             f'<circle cx="50" cy="50" r="44.5" fill="none" stroke="{BRASS_DIM}" stroke-width=".8" stroke-dasharray="1.6 1.6"/>',
             f'<circle cx="50" cy="50" r="28" fill="url(#nedap-g)" stroke="{GREEN}" stroke-opacity=".7" stroke-width="1.2"/>']
    top, _ = ring.text('NEDAP · DATA PROJECTS', 6.0, 1.05, 36, 50, 50, True, BRASS_BRIGHT)
    year, width = ring.text('2026', 6.5, 2.0, 36, 50, 50, False, MUTED)
    parts += top + year
    # a star either side of the year, on the same circle, centred where the letters' middle sits
    for side in (-1, 1):
        ang = side * (width / 2 + 8.5) / 36
        phi = math.pi / 2 - ang
        rr = 36 - 2.4
        parts.append(star(50 + rr * math.cos(phi), 50 + rr * math.sin(phi), 2.9, -math.pi / 2 + (phi - math.pi / 2)))
    parts.append(symbol(36, 36, 1.17, 1.5))
    return svg(''.join(parts), 'NEDAP mission patch')


def mark():
    """For about 32 to 64 px: the brass ring, the green inner ring and the symbol; no lettering."""
    return svg(f'<circle cx="50" cy="50" r="47" fill="{NAVY_DEEP}" stroke="{BRASS}" stroke-width="5"/>'
               f'<circle cx="50" cy="50" r="35" fill="url(#nedap-g)" stroke="{GREEN}" stroke-opacity=".75" stroke-width="2.6"/>'
               + symbol(26, 26, 2, 1.7), 'NEDAP')


def mark_small():
    """For 16 to 24 px (browser tabs, the footer): the brass ring and the asteroid as a solid shape with two dark
    craters, since outlines this thin turn to a blur at 16 px."""
    body = SYMBOL.split('M14.6')[0]
    return svg(f'<circle cx="50" cy="50" r="45" fill="url(#nedap-g)" stroke="{BRASS}" stroke-width="10"/>'
               f'<g transform="translate(19 18.5) scale(2.6)"><path d="{body}" fill="{CREAM}"/>'
               f'<circle cx="14.4" cy="9.7" r="2.3" fill="#1A2333"/><circle cx="8.6" cy="15.4" r="1.9" fill="#1A2333"/></g>',
               'NEDAP')


def emblem():
    """The top-bar mark as a symbol for <use>: the same drawing as nedap-mark.svg, with a solid inner disc (a
    gradient inside a symbol used from another file does not show in every browser)."""
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n'
            f'  <!-- {CREDIT}. The top-bar mark (the small version of the patch). Pages use it with '
            f'<use href="…/shared/emblem.svg#e"/>; written by brand/patch/build_patch.py. -->\n'
            f'  <symbol id="e" viewBox="0 0 100 100">'
            f'<circle cx="50" cy="50" r="47" fill="{NAVY_DEEP}" stroke="{BRASS}" stroke-width="5"/>'
            f'<circle cx="50" cy="50" r="35" fill="#1C273A" stroke="{GREEN}" stroke-opacity=".75" stroke-width="2.6"/>'
            + symbol(26, 26, 2, 1.7) + '</symbol>\n  <use href="#e"/>\n</svg>\n')


def tile():
    """The home-screen icon: the mark on the night-sky tile Sky Finder's icon also uses (512 px; iOS and Android
    round the corners themselves on the square PNG copies)."""
    inner = mark().split('<defs>', 1)[1].split('</defs>', 1)[1].rsplit('</svg>', 1)[0]
    return (f'<!-- {CREDIT}. The NEDAP home-screen icon; written by brand/patch/build_patch.py. -->\n'
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>'
            '<radialGradient id="t" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#22304A"/>'
            f'<stop offset="1" stop-color="#0F1520"/></radialGradient>{GRADIENT}</defs>'
            '<rect width="512" height="512" rx="112" fill="url(#t)"/>'
            f'<svg x="76" y="76" width="360" height="360" viewBox="0 0 100 100">{inner}</svg></svg>\n')


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    ring = Ring(TTFont(sys.argv[1]))
    (HERE / 'nedap-patch.svg').write_text(patch(ring))
    (HERE / 'nedap-mark.svg').write_text(mark())
    (HERE / 'nedap-mark-small.svg').write_text(mark_small())
    shared = HERE.parent.parent / 'shared'
    (shared / 'emblem.svg').write_text(emblem())
    (shared / 'icons' / 'favicon.svg').write_text(mark_small())
    (shared / 'icons' / 'icon.svg').write_text(tile())
    print('Wrote the patch, the two marks, shared/emblem.svg, shared/icons/favicon.svg and shared/icons/icon.svg')


if __name__ == '__main__':
    main()
