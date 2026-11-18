#!/usr/bin/env python3
# NASA and ESA Data Projects · Exoplanets · confirmed planets · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Writes, in exoplanets/data/:
#   planets.json   every confirmed planet, one row each, from the NASA Exoplanet Archive's Planetary Systems Composite
#                  Parameters table (pscomppars), with each planet's habitable-zone verdict under two rules
#   summary.json   the counts, the discoveries by year and method, and the points of the "mass against year length"
#                  chart, for the overview page
#
# Source (no key; no CORS headers, so web pages read these files and never call the archive):
#   NASA Exoplanet Archive TAP service  https://exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html
# A reply with fewer than MIN_ROWS planets, or without an expected column, keeps the previous files.
#
# The habitable zone, two rules (decided Nov 17, 2026):
#   1. NASA's rule: the conservative habitable zone of the NASA Exoplanet Exploration Program's target list for the
#      Habitable Worlds Observatory (Mamajek & Stapelfeldt 2023): 0.95 to 1.67 au for a star like the Sun, scaled by
#      the square root of the star's luminosity. In starlight received (Earth = 1): 1/1.67² to 1/0.95², 0.359 to 1.108.
#   2. The star's temperature taken into account: Kopparapu et al. (2013, ApJ 765, 131; 2014, ApJL 787, L29), limits
#      for a planet of one Earth mass, for stars of 2,600 to 7,200 K. Conservative: runaway greenhouse to maximum
#      greenhouse; optimistic: recent Venus to early Mars. Coefficients as in the authors' published calculator.
#
# Run by hand:  python3 exoplanets/fetch_planets.py             (standard library only; under a minute)
#               python3 exoplanets/fetch_planets.py --raw FILE  builds the files from a saved TAP reply (JSON)
import argparse
import datetime as dt
import json
import math
import os
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
TAP = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync'
UA = {'User-Agent': 'NASA-and-ESA-Data-Projects/1.0 (exoplanets)'}
MIN_ROWS = 5000

COLUMNS = ['pl_name', 'hostname', 'discoverymethod', 'disc_year', 'disc_facility', 'pl_orbper', 'pl_orbsmax',
           'pl_rade', 'pl_bmasse', 'pl_bmassprov', 'pl_orbeccen', 'pl_eqt', 'pl_insol', 'pl_trandep', 'pl_rvamp',
           'st_teff', 'st_rad', 'st_mass', 'st_lum', 'sy_dist', 'ra', 'dec', 'sy_pnum', 'sy_vmag']

# discovery methods, as the archive names them, and the codes the pages use
METHODS = {'Transit': 'T', 'Radial Velocity': 'R', 'Microlensing': 'M', 'Imaging': 'I', 'Astrometry': 'A',
           'Transit Timing Variations': 'V', 'Eclipse Timing Variations': 'E', 'Pulsar Timing': 'P',
           'Pulsation Timing Variations': 'U', 'Orbital Brightness Modulation': 'B', 'Disk Kinematics': 'K'}
TIMING = {'V', 'E', 'P', 'U'}

# NASA ExEP: 0.95–1.67 au for a solar twin, scaled by √L  →  starlight from 1/1.67² to 1/0.95²
NASA_S_IN, NASA_S_OUT = 1 / 0.95 ** 2, 1 / 1.67 ** 2
# Kopparapu et al. (2014), one Earth mass: S_eff = S_sun + a·T + b·T² + c·T³ + d·T⁴, T = Teff − 5780 K
HZ = {
    'recent_venus': (1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15),
    'runaway_greenhouse': (1.107, 1.332e-4, 1.580e-8, -8.308e-12, -1.931e-15),
    'maximum_greenhouse': (0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16),
    'early_mars': (0.320, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16),
}
TEFF_MIN, TEFF_MAX = 2600, 7200
# "about Earth's size": a radius of 0.5 to 1.6 Earths, or, for a planet with no measured radius, a mass (or minimum
# mass) of 0.1 to 3 Earths
SMALL_R, SMALL_M = (0.5, 1.6), (0.1, 3.0)


def seff(limit, teff):
    s, a, b, c, d = HZ[limit]
    t = teff - 5780.0
    return s + a * t + b * t ** 2 + c * t ** 3 + d * t ** 4


def starlight(p):
    """Starlight received, Earth = 1: the archive's value, else L / a² from the star's luminosity and the orbit."""
    if p.get('pl_insol') is not None:
        return p['pl_insol'], 'a'
    if p.get('st_lum') is not None and p.get('pl_orbsmax'):
        return 10 ** p['st_lum'] / p['pl_orbsmax'] ** 2, 'c'
    return None, None


def zone(p):
    """(NASA rule: 1 inside, 0 outside, None unknown; temperature rule: 2 conservative, 1 optimistic only, 0 outside,
    None unknown or outside 2,600–7,200 K)."""
    s, _ = starlight(p)
    if s is None:
        return None, None
    nasa = 1 if NASA_S_OUT <= s <= NASA_S_IN else 0
    t = p.get('st_teff')
    if t is None or not TEFF_MIN <= t <= TEFF_MAX:
        return nasa, None
    if seff('maximum_greenhouse', t) <= s <= seff('runaway_greenhouse', t):
        return nasa, 2
    if seff('early_mars', t) <= s <= seff('recent_venus', t):
        return nasa, 1
    return nasa, 0


def small(p):
    r, m = p.get('pl_rade'), p.get('pl_bmasse')
    if r is not None:
        return SMALL_R[0] <= r <= SMALL_R[1]
    return m is not None and SMALL_M[0] <= m <= SMALL_M[1]


def sig(v, n=4):
    """Rounds to n significant figures, to keep the file small."""
    if v is None or v == 0:
        return v
    return round(v, max(0, n - 1 - int(math.floor(math.log10(abs(v))))))


def fetch():
    q = 'select ' + ','.join(COLUMNS) + ' from pscomppars'
    url = TAP + '?' + urllib.parse.urlencode({'query': q, 'format': 'json'})
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode('utf-8'))


def old(name):
    try:
        with open(os.path.join(DATA, name), encoding='utf-8') as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


def write_if_changed(name, obj):
    """Writes the file only when something other than the time stamp changed."""
    prev = old(name)
    if prev is not None and {k: v for k, v in prev.items() if k != 'updated'} == {k: v for k, v in obj.items() if k != 'updated'}:
        print('  %s unchanged' % name)
        return
    with open(os.path.join(DATA, name), 'w', encoding='utf-8') as fh:
        json.dump(obj, fh, separators=(',', ':'), allow_nan=False, ensure_ascii=False)
        fh.write('\n')
    print('  wrote %s' % name)


FIELDS = ['name', 'host', 'method', 'year', 'facility', 'period', 'a', 'radius', 'mass', 'mass_kind', 'ecc', 'teq',
          'light', 'light_from', 'depth', 'k', 'teff', 'srad', 'smass', 'slum', 'dist', 'ra', 'dec', 'npl', 'vmag',
          'hz_nasa', 'hz_temp', 'small']


def build(rows, now, min_rows=MIN_ROWS):
    missing = [c for c in COLUMNS if rows and c not in rows[0]]
    if missing:
        raise ValueError('columns missing from the reply: ' + ', '.join(missing))
    if len(rows) < min_rows:
        raise ValueError('only %d planets in the reply (expected at least %d)' % (len(rows), min_rows))
    out, by_method, years, pts = [], {}, {}, []
    hz = {'nasa': 0, 'nasa_small': 0, 'temp': 0, 'temp_small': 0, 'temp_opt': 0}
    nearest = None
    for p in sorted(rows, key=lambda r: (r['hostname'] or '', r['pl_name'])):
        code = METHODS.get(p['discoverymethod'], 'O')
        light, src = starlight(p)
        hn, ht = zone(p)
        sm = small(p)
        kind = {'Msini': 'msini', 'Mass': 'mass', 'M-R relationship': 'est'}.get(p.get('pl_bmassprov'))
        out.append([p['pl_name'], p['hostname'], code, p['disc_year'], p['disc_facility'], sig(p['pl_orbper'], 6),
                    sig(p['pl_orbsmax']), sig(p['pl_rade']), sig(p['pl_bmasse']), kind, sig(p['pl_orbeccen'], 3),
                    sig(p['pl_eqt']), sig(light), src, sig(p['pl_trandep']), sig(p['pl_rvamp']), sig(p['st_teff']),
                    sig(p['st_rad']), sig(p['st_mass']), sig(p['st_lum']), sig(p['sy_dist'], 5), sig(p['ra'], 7),
                    sig(p['dec'], 7), p['sy_pnum'], sig(p['sy_vmag']), hn, ht, 1 if sm else 0])
        by_method[code] = by_method.get(code, 0) + 1
        y = str(p['disc_year'])
        years.setdefault(y, {})
        years[y][code] = years[y].get(code, 0) + 1
        if hn == 1:
            hz['nasa'] += 1
            hz['nasa_small'] += sm
        if ht == 2:
            hz['temp'] += 1
            hz['temp_small'] += sm
        if ht in (1, 2):
            hz['temp_opt'] += 1
        if p['pl_orbper'] and p['pl_bmasse'] and p['pl_orbper'] > 0 and p['pl_bmasse'] > 0:
            pts.append([code, round(math.log10(p['pl_orbper']), 3), round(math.log10(p['pl_bmasse']), 3)])
        if p['sy_dist'] and (nearest is None or p['sy_dist'] < nearest[1]):
            nearest = (p['pl_name'], p['sy_dist'])
    planets = {'updated': now, 'source': 'NASA Exoplanet Archive, Planetary Systems Composite Parameters (pscomppars)',
               'fields': FIELDS, 'rows': out}
    summary = {'updated': now, 'source': planets['source'], 'total': len(out), 'by_method': by_method,
               'years': years, 'hz': hz, 'nearest': {'name': nearest[0], 'dist_pc': nearest[1]} if nearest else None,
               'points': pts}
    return planets, summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', help='a saved TAP reply (JSON) to build from')
    ap.add_argument('--min-rows', type=int, default=MIN_ROWS, help=argparse.SUPPRESS)
    args = ap.parse_args()
    os.makedirs(DATA, exist_ok=True)
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    try:
        if args.raw:
            with open(args.raw, encoding='utf-8') as fh:
                rows = json.load(fh)
        else:
            rows = fetch()
        planets, summary = build(rows, now, args.min_rows)
    except Exception as e:  # any failure keeps the previous files
        print('planets: not updated (%s); the previous files are kept' % e)
        return 1
    write_if_changed('planets.json', planets)
    write_if_changed('summary.json', summary)
    print('planets: %d confirmed; habitable zone %d (NASA rule), %d (temperature rule)'
          % (summary['total'], summary['hz']['nasa'], summary['hz']['temp']))
    return 0


if __name__ == '__main__':
    sys.exit(main())
