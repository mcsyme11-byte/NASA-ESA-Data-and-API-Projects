#!/usr/bin/env python3
# NASA and ESA Data Projects · Planetary Maps · every official feature name, for the search box ·
# © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Writes planet-maps/data/names-mars.json and names-moon.json:
#   {"updated": "...", "source": "...", "names": [[name, kind, latitude, longitude], ...]}   (sorted by name)
# Kind is the feature type in plain English (Crater, Mountain, Valley, Plain ...); positions in degrees, north and east
# positive, longitude -180 to 180.
#
# Source: the IAU feature names in NASA's Solar System Treks catalogue (docs/DATA-SOURCES.md, Planetary Maps):
#   https://trek.nasa.gov/<mars|moon>/TrekServices/ws/index/eq/searchItems?start=0&rows=<n>&facetKeys=itemType&facetValues=nomenclature
# (JSON; each item has title, shape "POINT (lon lat)" and the type in productCat2 or keyword, for example
# "Crater, craters"). Checked Nov 17, 2026: 1,783 names for Mars. The USGS Gazetteer of Planetary Nomenclature
# (approved Nov 17, 2026) may be added where Trek's list misses names; its address and format are to be confirmed
# against its own documentation first.
#
# Built once, then four times a year with the Place and map lists job. A body whose list cannot be read, or comes back
# with under half the names of the previous file, keeps its previous file ("check failed").
#
# Run by hand:  python3 planet-maps/tools/build_names.py           (standard library only)
#        test:  python3 planet-maps/tools/build_names.py --test    (sample data, no network; writes nothing)
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.request

DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
URL = 'https://trek.nasa.gov/{b}/TrekServices/ws/index/eq/searchItems?start=0&rows={n}&facetKeys=itemType&facetValues=nomenclature'
UA = {'User-Agent': 'NASA-and-ESA-Data-Projects/1.0 (planetary maps)'}
# IAU descriptor terms (Latin) in plain English; anything else keeps its own word
PLAIN = {'crater': 'Crater', 'mons': 'Mountain', 'montes': 'Mountains', 'vallis': 'Valley', 'planitia': 'Plain',
         'planum': 'Plateau', 'mare': 'Sea (lava plain)', 'oceanus': 'Ocean (lava plain)', 'lacus': 'Lake (lava plain)',
         'sinus': 'Bay (lava plain)', 'palus': 'Marsh (lava plain)', 'rupes': 'Cliff', 'fossa': 'Trough', 'chasma': 'Canyon',
         'dorsum': 'Ridge', 'rima': 'Rille', 'catena': 'Crater chain', 'tholus': 'Small volcano', 'patera': 'Volcanic crater',
         'terra': 'Highlands', 'labyrinthus': 'Canyon maze', 'chaos': 'Broken ground', 'collis': 'Hill', 'mensa': 'Mesa',
         'promontorium': 'Headland', 'scopulus': 'Scarp', 'sulcus': 'Grooved ground', 'undae': 'Dune field', 'vastitas': 'Lowland',
         'landing site name': 'Landing site', 'satellite feature': 'Crater', 'albedo feature': 'Light or dark marking'}


def get(url, tries=3):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            last = e
            time.sleep(5 * (k + 1))
    raise RuntimeError(f'{url}: {last}')


def kind(doc):
    raw = doc.get('productCat2') or (doc.get('keyword') or [''])[0] or ''
    word = raw.split(',')[0].strip().lower()
    return PLAIN.get(word, word.capitalize() or 'Named feature')


def names(response):
    out = {}
    for d in (response.get('response') or {}).get('docs', []):
        if d.get('itemType') != 'nomenclature':
            continue
        m = re.match(r'POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)', d.get('shape') or '')
        name = (d.get('title') or '').strip()
        if not m or not name:
            continue
        lon, lat = float(m.group(1)), float(m.group(2))
        if lon > 180:
            lon -= 360
        if abs(lat) > 90 or abs(lon) > 180:
            continue
        out[name] = [name, kind(d), round(lat, 4), round(lon, 4)]
    return sorted(out.values(), key=lambda n: n[0].lower())


def build(body, read):
    first = read(URL.format(b=body, n=1))
    total = int((first.get('response') or {}).get('numFound') or 0)
    if not total:
        raise ValueError('the catalogue lists no names')
    return names(read(URL.format(b=body, n=total)))


def main():
    if '--test' in sys.argv:
        doc = {'response': {'numFound': 3, 'docs': [
            {'itemType': 'nomenclature', 'title': 'Gale', 'keyword': ['Crater, craters'], 'shape': 'POINT (137.811 -5.3672)'},
            {'itemType': 'nomenclature', 'title': 'Olympus Mons', 'productCat2': 'Mons, montes', 'shape': 'POINT (-133.8025067 18.65275889)'},
            {'itemType': 'product', 'title': 'Not a name', 'shape': 'POINT (0 0)'}]}}
        got = build('mars', lambda url: doc)
        assert got == [['Gale', 'Crater', -5.3672, 137.811], ['Olympus Mons', 'Mountain', 18.6528, -133.8025]], got
        print('test passed')
        return
    bad = 0
    for body in ('mars', 'moon'):
        path = os.path.join(DATA, f'names-{body}.json')
        try:
            with open(path, encoding='utf-8') as f:
                before = len(json.load(f).get('names', []))
        except (OSError, ValueError):
            before = 0
        try:
            got = build(body, get)
        except Exception as e:
            print(f'{body}: not found ({e}); previous file kept'); bad += 1
            continue
        if len(got) < before / 2 or not got:
            print(f'{body}: check failed ({len(got)} names, previously {before}); previous file kept'); bad += 1
            continue
        os.makedirs(DATA, exist_ok=True)
        data = {'updated': dt.date.today().isoformat(), 'names': got,
                'source': 'IAU Working Group for Planetary System Nomenclature, via NASA Solar System Treks'}
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
            f.write('\n')
        print(f'{body}: {len(got):,} names written ({os.path.getsize(path):,} bytes)')
    sys.exit(1 if bad == 2 else 0)


if __name__ == '__main__':
    main()
