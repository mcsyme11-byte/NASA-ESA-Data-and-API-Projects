#!/usr/bin/env python3
# NASA and ESA Data Projects · Planetary Maps · the rovers' routes · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Writes planet-maps/data/routes.json: for Curiosity and Perseverance, the latest position (sol, latitude, longitude,
# height, distance driven) and the whole route as one thinned line of [longitude, latitude] points.
#
# Source: the files behind NASA/JPL's "Where is the rover?" maps (docs/DATA-SOURCES.md, Planetary Maps), no key:
#   https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json and MSL_waypoints_current.json   (Curiosity)
#   https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json and M20_waypoints_current.json   (Perseverance)
# They are not a published data product and may move. Each rover is a separate source: a rover whose files cannot be
# read, or whose new entry fails a check, keeps its previous entry, and the script prints "not found" or "check
# failed" with the reason. The script exits with an error only when no rover could be read at all.
#
# Checks before an entry is replaced: the sol and the distance driven never decrease; the position lies inside the
# rover's crater area; the route has at least two points.
#
# Run by hand:  python3 planet-maps/fetch_routes.py          (standard library only)
#        test:  python3 planet-maps/fetch_routes.py --test   (sample data, no network; writes nothing)
import datetime as dt
import json
import math
import os
import sys
import time
import urllib.request

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
OUT = os.path.join(DATA, 'routes.json')
BASE = 'https://mars.nasa.gov/mmgis-maps/{m}/Layers/json/{m}_{f}.json'
UA = {'User-Agent': 'NASA-and-ESA-Data-Projects/1.0 (planetary maps)'}
MARS_R = 3396190.0                                  # metres, the sphere of NASA Trek's Mars maps
DEG_M = 2 * math.pi * MARS_R / 360                  # metres in one degree of latitude (59,274 m)
THIN_M = 1.0                                        # route points closer than this to the line are dropped

ROVERS = {
    'curiosity': {'name': 'Curiosity', 'site': 'Gale Crater', 'mission': 'MSL', 'box': (136.0, -7.0, 139.0, -3.0)},
    'perseverance': {'name': 'Perseverance', 'site': 'Jezero Crater', 'mission': 'M20', 'box': (76.5, 17.5, 78.5, 19.5)},
}


def get(url, tries=3):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:                       # network, HTTP or JSON error: try again, then give up
            last = e
            time.sleep(3 * (k + 1))
    raise RuntimeError(f'{url}: {last}')


def line_points(traverse):
    """Every drive's points in file order (the files list drives in the order they were driven), joined into one
    line; repeated points are dropped. LineString and MultiLineString are both read; heights are left out."""
    out = []
    for f in traverse.get('features', []):
        g = f.get('geometry') or {}
        parts = [g['coordinates']] if g.get('type') == 'LineString' else g.get('coordinates', []) if g.get('type') == 'MultiLineString' else []
        for part in parts:
            for c in part:
                p = (float(c[0]), float(c[1]))
                if not out or p != out[-1]:
                    out.append(p)
    return out


def thin(pts, tol_m=THIN_M):
    """Douglas-Peucker on a local flat projection (distances in metres, longitude scaled by cos latitude)."""
    if len(pts) < 3:
        return pts
    lat0 = sum(p[1] for p in pts) / len(pts)
    kx = DEG_M * math.cos(math.radians(lat0))
    xy = [(p[0] * kx, p[1] * DEG_M) for p in pts]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = xy[a], xy[b]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy)
        far, fi = -1.0, -1
        for i in range(a + 1, b):
            px, py = xy[i]
            d = math.hypot(px - ax, py - ay) if L == 0 else abs(dy * (px - ax) - dx * (py - ay)) / L
            if d > far:
                far, fi = d, i
        if far > tol_m:
            keep[fi] = True
            stack += [(a, fi), (fi, b)]
    return [p for p, k in zip(pts, keep) if k]


def entry(key, traverse, current):
    r = ROVERS[key]
    feats = current.get('features') or []
    if not feats:
        raise ValueError('no current position in the waypoints file')
    p = feats[-1].get('properties') or {}
    for f in ('sol', 'lat', 'lon', 'dist_total_m'):
        if p.get(f) is None:
            raise ValueError(f'the current position has no {f}')
    route = [[round(x, 6), round(y, 6)] for x, y in thin(line_points(traverse))]
    now = [round(float(p['lon']), 6), round(float(p['lat']), 6)]
    if route and route[-1] != now:
        route.append(now)                            # the route ends where the rover is
    elev = p.get('elev_geoid')
    return {'name': r['name'], 'site': r['site'], 'sol': int(p['sol']), 'lat': now[1], 'lon': now[0],
            'elev_m': round(float(elev), 1) if elev not in (None, -9999) else None,
            'driven_m': int(round(float(p['dist_total_m']))), 'route': route}


def check(key, new, old):
    w, s, e, n = ROVERS[key]['box']
    if not (w <= new['lon'] <= e and s <= new['lat'] <= n):
        return f'position {new["lat"]}, {new["lon"]} is outside {ROVERS[key]["site"]}'
    if len(new['route']) < 2:
        return 'the route has fewer than two points'
    if old:
        if new['sol'] < old.get('sol', 0):
            return f'sol went back from {old["sol"]} to {new["sol"]}'
        if new['driven_m'] < old.get('driven_m', 0) - 1:
            return f'distance driven went back from {old["driven_m"]} to {new["driven_m"]} m'
    return None


def build(read, previous):
    """read(mission, file) returns parsed JSON; previous is the last routes.json (or None). Returns (data, ok, notes)."""
    rovers, ok, notes = {}, 0, []
    for key, r in ROVERS.items():
        old = (previous or {}).get('rovers', {}).get(key)
        try:
            new = entry(key, read(r['mission'], 'traverse'), read(r['mission'], 'waypoints_current'))
        except Exception as e:
            notes.append(f'{r["name"]}: not found ({e}); previous entry kept')
            if old:
                rovers[key] = old
            continue
        bad = check(key, new, old)
        if bad:
            notes.append(f'{r["name"]}: check failed ({bad}); previous entry kept')
            if old:
                rovers[key] = old
            continue
        rovers[key] = new
        ok += 1
        notes.append(f'{r["name"]}: sol {new["sol"]}, {new["driven_m"]} m driven, {len(new["route"])} route points')
    data = {'updated': dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z'),
            'rovers': rovers, 'source': 'NASA/JPL-Caltech, mars.nasa.gov/mmgis-maps'}
    return data, ok, notes


def sample():
    """Sample files in NASA's layout (made-up positions inside each crater), for --test."""
    def trav(pts):
        return {'type': 'FeatureCollection', 'features': [
            {'type': 'Feature', 'geometry': {'type': 'LineString', 'coordinates': [list(p) + [0] for p in pts[i:i + 3]]}}
            for i in range(0, len(pts) - 1, 2)]}
    def cur(lon, lat, sol, dist):
        return {'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties':
                {'sol': sol, 'lat': lat, 'lon': lon, 'dist_total_m': dist, 'elev_geoid': -1000.0}, 'geometry': {'type': 'Point', 'coordinates': [lon, lat]}}]}
    straight = [(137.40 + i * 1e-6, -4.70) for i in range(50)]                     # a straight drive: thinned to its ends
    files = {('MSL', 'traverse'): trav(straight + [(137.39, -4.75), (137.388886, -4.826023)]),
             ('MSL', 'waypoints_current'): cur(137.388886, -4.826023, 100, 5000.0),
             ('M20', 'traverse'): trav([(77.45, 18.44), (77.40, 18.45), (77.30, 18.46)]),
             ('M20', 'waypoints_current'): cur(10.0, 10.0, 50, 4000.0)}             # outside Jezero: must be refused
    return lambda m, f: files[(m, f)]


def main():
    if '--test' in sys.argv:
        prev = {'rovers': {'perseverance': {'name': 'Perseverance', 'sol': 40, 'driven_m': 3000}}}
        data, ok, notes = build(sample(), prev)
        c = data['rovers']['curiosity']
        assert ok == 1 and c['sol'] == 100 and c['route'][-1] == [137.388886, -4.826023], notes
        assert len(c['route']) == 4, c['route']                                     # 50 straight points thinned to 2
        assert data['rovers']['perseverance']['sol'] == 40, 'a refused rover keeps its previous entry'
        print('\n'.join(notes)); print('test passed')
        return
    try:
        with open(OUT, encoding='utf-8') as f:
            previous = json.load(f)
    except (OSError, ValueError):
        previous = None
    data, ok, notes = build(lambda m, f: get(BASE.format(m=m, f=f)), previous)
    print('\n'.join(notes))
    if not ok:
        print('no rover could be read; the previous file is kept')
        sys.exit(1)
    if previous and previous.get('rovers') == data['rovers']:
        print('no rover has moved; routes.json left as it is')
        return
    os.makedirs(DATA, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, separators=(',', ':'), ensure_ascii=False)
        f.write('\n')
    print(f'routes.json written ({os.path.getsize(OUT):,} bytes)')


if __name__ == '__main__':
    main()
