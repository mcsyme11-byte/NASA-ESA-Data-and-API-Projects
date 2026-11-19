#!/usr/bin/env python3
# NASA and ESA Data Projects · Exoplanets · pictures copied to the site · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Copies the pictures shown on the Exoplanets pages into exoplanets/art/, so pages load nothing from other sites.
# Each picture keeps its exact credit line (in PICTURES and on the page).
#
#   hr8799-webb.jpg   HR 8799's four planets, NASA/ESA/CSA James Webb Space Telescope, NIRCam, released Mar 17, 2025
#                     (ESA/Webb weic2504a, https://esawebb.org/images/weic2504a/; 718 × 718 px). ESA/Webb images are
#                     released under CC BY 4.0 (https://esawebb.org/copyright/). Credit: NASA, ESA, CSA, STScI,
#                     W. Balmer (JHU), L. Pueyo (STScI), M. Perrin (STScI).
#
# Run by hand:  python3 exoplanets/tools/get_pictures.py   (standard library only)
import os
import sys
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'art')
UA = {'User-Agent': 'NASA-and-ESA-Data-Projects/1.0 (exoplanets)'}
PICTURES = [
    ('hr8799-webb.jpg', ['https://cdn.esawebb.org/archives/images/screen/weic2504a.jpg',
                         'https://cdn.esawebb.org/archives/images/large/weic2504a.jpg']),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    bad = 0
    for name, urls in PICTURES:
        for u in urls:
            try:
                with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r:
                    data = r.read()
                if not data.startswith(b'\xff\xd8') or len(data) < 5000:
                    raise ValueError('not a JPEG picture')
                with open(os.path.join(OUT, name), 'wb') as fh:
                    fh.write(data)
                print('wrote art/%s (%d bytes) from %s' % (name, len(data), u))
                break
            except Exception as e:
                print('%s: %s' % (u, e))
        else:
            bad += 1
            print('%s: not copied; the previous file, if any, is kept' % name)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
