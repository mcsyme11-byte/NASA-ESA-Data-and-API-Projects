#!/usr/bin/env python3
# NASA and ESA Data Projects · Spacecraft map data · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Reads spacecraft/catalogue.json and writes, into spacecraft/data/:
#   positions.json  positions from NASA/JPL Horizons (ssd.jpl.nasa.gov/api/horizons.api), each relative to its "parent":
#                     Sun    deep-space craft: every few days (Parker Solar Probe every 6 hours), back to launch or a
#                            few years, and a year ahead
#                     Earth  craft near the Lagrange points L1 and L2: every 6 hours, 60 days back and 120 ahead
#                     Moon, Mars  orbiters and rovers: every 5 minutes (rovers 30), half a day back and 1.5 days ahead
#                   ecliptic J2000 frame (Horizons REF_PLANE=ECLIPTIC, ICRF), whole kilometres.
#   tle.json        the latest orbital elements of the craft in Earth orbit, from CelesTrak (celestrak.org), as OMM
#                   fields ("omm"; two-line sets too for five-digit catalogue numbers), for the SGP4 model run in
#                   the browser.
#   routes.json     past missions (past.json, added Nov 14, 2026): each one's whole route from launch to its end (or
#                   landing), 600 equal steps from Horizons, relative to its "parent"; worked out once and kept while
#                   the mission's entry in past.json is unchanged ("sig"). For past craft still drifting around the
#                   Sun ("rest": "drift"), "now" holds their positions around today, renewed on every run, when
#                   Horizons still follows them.
#   links.json      the catalogue's links that are gone (HTTP 404 or 410), which the page leaves out, and those that
#                   could not be checked this time (refused, timed out, or a site turning the robot away), kept on the page.
# A craft that cannot be found is left out of the files and named in the log; the page shows only what was found.
# Run by hand:  python3 spacecraft/fetch_spacecraft.py [--from DIR]   (standard library only; --from: see CelesTrak below)
import argparse
import csv
import datetime as dt
import io
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
HORIZONS = 'https://ssd.jpl.nasa.gov/api/horizons.api'
CELESTRAK = 'https://celestrak.org/NORAD/elements/gp.php'
UA = {'User-Agent': 'NASA-and-ESA-Data-Projects/1.0 (spacecraft map; github.com/mcsyme11-byte/NASA-ESA-Data-and-API-Projects)'}
CENTER = {'Sun': '500@10', 'Earth': '500@399', 'Moon': '500@301', 'Mars': '500@499'}
GROUPS = ['stations', 'science', 'weather', 'resource', 'noaa', 'goes', 'military', 'geodetic', 'active']


def fetch(url, params=None, as_json=True, tries=3, timeout=120):
    full = url + ('?' + urllib.parse.urlencode(params, safe="'@%;=") if params else '')
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(full, headers=UA), timeout=timeout) as r:
                body = r.read()
                return json.loads(body) if as_json else body.decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code in (400, 403, 404):
                raise
            err = e
        except Exception as e:      # network: try again
            err = e
        if k < tries - 1:
            time.sleep(4 * (k + 1))
    raise err


def write(name, doc):
    path = os.path.join(DATA, name)
    text = json.dumps(doc, separators=(',', ':'), ensure_ascii=False, allow_nan=False)
    try:
        with open(path) as fh:
            old = json.load(fh)
        if {k: v for k, v in old.items() if k != 'updated'} == {k: v for k, v in doc.items() if k != 'updated'}:
            print('%s: unchanged' % name)
            return
    except (OSError, ValueError):
        pass
    with open(path, 'w') as fh:
        fh.write(text)
    print('%s: written (%d KB)' % (name, len(text) // 1024))


# ---------------------------------------------------------------- Horizons
def resolve(names):
    """A Horizons spacecraft id (a negative number) for the first of the names Horizons recognises."""
    today = dt.date.today()
    for n in names:
        try:
            res = fetch(HORIZONS, {'format': 'json', 'COMMAND': "'%s'" % n.replace(' ', '%20'), 'EPHEM_TYPE': 'VECTORS', 'CENTER': "'500@10'",
                                   'START_TIME': "'%s'" % today, 'STOP_TIME': "'%s'" % (today + dt.timedelta(days=1)), 'STEP_SIZE': "'1%20d'", 'OBJ_DATA': 'NO'})
        except Exception as e:
            print('    lookup %r failed: %s' % (n, e))
            continue
        text = res.get('result', '') + res.get('error', '')
        # one match: "Target body name: Psyche (spacecraft) (-255)"; several: a table, one "  -255  Psyche ..." per line
        m = re.search(r'Target body name:.*?\((-\d+)\)', text)
        if m:
            return m.group(1)
        ids = re.findall(r'^\s*(-\d+)\s+(.+?)\s*$', text, re.M)
        for hid, nm in ids:
            if n.lower().replace('-', ' ') in nm.lower().replace('-', ' '):
                print('    %r: %s chosen from %d matches (%s)' % (n, hid, len(ids), nm.strip()[:40]))
                return hid
        time.sleep(1)
    return None


def vectors(hid, center, start, stop, step):
    res = fetch(HORIZONS, {
        'format': 'json', 'COMMAND': "'%s'" % hid, 'EPHEM_TYPE': 'VECTORS', 'CENTER': "'%s'" % CENTER[center],
        'START_TIME': "'%s'" % start.replace(' ', '%20'), 'STOP_TIME': "'%s'" % stop.replace(' ', '%20'), 'STEP_SIZE': "'%s'" % step.replace(' ', '%20'),
        'OUT_UNITS': 'KM-S', 'REF_PLANE': 'ECLIPTIC', 'REF_SYSTEM': 'ICRF', 'VEC_TABLE': '1', 'CSV_FORMAT': 'YES', 'OBJ_DATA': 'NO'})
    return res.get('result', '') + res.get('error', '')


def table(hid, center, rng, step):
    """Horizons vectors over rng (a two-item list, changed in place to the dates Horizons covers): (lines, text)."""
    text = ''
    for _ in range(3):
        text = vectors(hid, center, rng[0], rng[1], step)
        if '$$SOE' in text:
            break
        m1 = re.search(r'(?:prior to|before)\s+A\.D\.\s+(\d{4}-[A-Z]{3}-\d{2})(?:\s+(\d{2}:\d{2}))?', text)
        m2 = re.search(r'after\s+A\.D\.\s+(\d{4}-[A-Z]{3}-\d{2})(?:\s+(\d{2}:\d{2}))?', text)
        fix = lambda d, t: dt.datetime.strptime(d.title() + ' ' + (t or '00:00'), '%Y-%b-%d %H:%M')
        if m1:
            rng[0] = (fix(m1.group(1), m1.group(2)) + dt.timedelta(hours=2)).strftime('%Y-%m-%d %H:%M')
        if m2:
            rng[1] = (fix(m2.group(1), m2.group(2)) - dt.timedelta(hours=1)).strftime('%Y-%m-%d %H:%M')
        if not (m1 or m2) or rng[0] >= rng[1]:
            break
        time.sleep(1)
    if '$$SOE' not in text:
        return None, text
    rows = []
    for line in text.split('$$SOE', 1)[1].split('$$EOE', 1)[0].strip().splitlines():
        p = [v.strip() for v in line.split(',')]
        if len(p) >= 5:
            rows.append((float(p[0]), round(float(p[2])), round(float(p[3])), round(float(p[4]))))
    return rows, text


def route_for(p, now):
    """A past mission's whole route: 600 equal steps from launch to its end (or route.to), relative to route.center."""
    r = p['route']
    start = dt.datetime.fromisoformat(r.get('from', p['launch'])) + dt.timedelta(hours=12)
    stop = min(dt.datetime.fromisoformat(r.get('to', p['ended'])) + dt.timedelta(hours=12), now)
    rng = [start.strftime('%Y-%m-%d %H:%M'), stop.strftime('%Y-%m-%d %H:%M')]
    rows, text = table(r['horizons'], r['center'], rng, '600')
    if not rows or len(rows) < 3:
        print('  %-28s %s: no route (%s)' % (p['name'], r['horizons'], text.strip()[:160].replace('\n', ' ')))
        return None
    xyz = [v for row in rows for v in row[1:]]
    step = (rows[-1][0] - rows[0][0]) / (len(rows) - 1)
    print('  %-28s %s: route of %d points around %s, %s to %s' % (p['name'], r['horizons'], len(rows), r['center'], rng[0][:10], rng[1][:10]))
    return {'horizons': r['horizons'], 'parent': r['center'], 'jd0': rows[0][0], 'step': step, 'xyz': xyz}


def drift_now(p, now):
    """A drifting past craft around today, around the Sun, every 5 days, when Horizons still follows it."""
    rng = [(now - dt.timedelta(days=60)).strftime('%Y-%m-%d %H:%M'), (now + dt.timedelta(days=365)).strftime('%Y-%m-%d %H:%M')]
    rows, _ = table(p['route']['horizons'], 'Sun', rng, '5 d')
    if not rows or len(rows) < 3 or not (rows[0][0] <= 2440587.5 + now.timestamp() / 86400 + 0.01 <= rows[-1][0]):
        return None
    return {'parent': 'Sun', 'jd0': rows[0][0], 'step': (rows[-1][0] - rows[0][0]) / (len(rows) - 1), 'xyz': [v for row in rows for v in row[1:]]}


def samples_for(c, now):
    src = c['src']
    hid = src.get('horizons') or resolve(src.get('horizons_name', []))
    if not hid:
        print('  %-28s not found in Horizons (%s)' % (c['name'], ', '.join(src.get('horizons_name', []))))
        return None
    center = src['center']
    if center == 'Sun':
        step_d = src.get('step', 4)
        back = src.get('years_back', 3)
        start = max(dt.datetime.fromisoformat(c['launch']) + dt.timedelta(days=2), now - dt.timedelta(days=365.25 * back))
        stop = now + dt.timedelta(days=365)
        step = '%d h' % round(step_d * 24) if step_d < 1 else '%d d' % step_d
        step_days = step_d
    elif center == 'Earth':
        start, stop, step, step_days = now - dt.timedelta(days=60), now + dt.timedelta(days=120), '6 h', 0.25
        start = max(start, dt.datetime.fromisoformat(c['launch']) + dt.timedelta(days=1))
    else:
        mins = src.get('step_min', 5)
        start, stop, step, step_days = now - dt.timedelta(hours=12), now + dt.timedelta(hours=36), '%d m' % mins, mins / 1440
    rng = [start.strftime('%Y-%m-%d %H:%M'), stop.strftime('%Y-%m-%d %H:%M')]
    text = ''
    for _ in range(3):
        text = vectors(hid, center, rng[0], rng[1], step)
        if '$$SOE' in text:
            break
        # the trajectory does not cover the whole range: Horizons names the dates it does cover
        m1 = re.search(r'(?:prior to|before)\s+A\.D\.\s+(\d{4}-[A-Z]{3}-\d{2})(?:\s+(\d{2}:\d{2}))?', text)
        m2 = re.search(r'after\s+A\.D\.\s+(\d{4}-[A-Z]{3}-\d{2})(?:\s+(\d{2}:\d{2}))?', text)
        fix = lambda d, t: dt.datetime.strptime(d.title() + ' ' + (t or '00:00'), '%Y-%b-%d %H:%M')
        if m1:
            rng[0] = (fix(m1.group(1), m1.group(2)) + dt.timedelta(days=1)).strftime('%Y-%m-%d %H:%M')
        if m2:
            rng[1] = (fix(m2.group(1), m2.group(2)) - dt.timedelta(hours=1)).strftime('%Y-%m-%d %H:%M')
        if not (m1 or m2):
            break
        time.sleep(1)
    if '$$SOE' not in text:
        print('  %-28s %s: no positions (%s)' % (c['name'], hid, text.strip()[:160].replace('\n', ' ')))
        return None
    xyz, jd0 = [], None
    for line in text.split('$$SOE', 1)[1].split('$$EOE', 1)[0].strip().splitlines():
        p = [v.strip() for v in line.split(',')]
        if len(p) < 5:
            continue
        jd0 = float(p[0]) if jd0 is None else jd0
        xyz += [round(float(p[2])), round(float(p[3])), round(float(p[4]))]
    print('  %-28s %s: %d positions around %s, from %s' % (c['name'], hid, len(xyz) // 3, center, rng[0]))
    return {'horizons': hid, 'parent': center, 'jd0': jd0, 'step': step_days, 'xyz': xyz}


# ---------------------------------------------------------------- CelesTrak
# Decided Nov 19, 2026 (hand-off from the Data updates chat, Nov 18, 2026):
#  - CSV (OMM) instead of two-line sets: CelesTrak ran out of five-digit catalogue numbers on Jul 11, 2026, and objects
#    catalogued since then are missing from two-line downloads. The page builds its SGP4 record from the OMM fields
#    (satellite.js json2satrec, shared/sats.js); two-line sets are still written for five-digit numbers, for copies of
#    shared/sats.js saved in a browser before the change.
#  - One request each, no retry: the first answer other than HTTP 200, or a timeout, stops every further CelesTrak
#    request in the run (CelesTrak's usage policy, May 22, 2026), and tle.json keeps its previous copy.
#  - --from DIR reads DIR/active.csv, the active list Orbit Watch's job has just downloaded
#    (orbit-watch/fetch_orbits.py --keep DIR), so CelesTrak is asked for the active list once (at most once in two hours).
OMM_TEXT = ('OBJECT_NAME', 'OBJECT_ID', 'EPOCH', 'CLASSIFICATION_TYPE')
OMM_NUM = ('MEAN_MOTION', 'ECCENTRICITY', 'INCLINATION', 'RA_OF_ASC_NODE', 'ARG_OF_PERICENTER', 'MEAN_ANOMALY',
           'EPHEMERIS_TYPE', 'NORAD_CAT_ID', 'ELEMENT_SET_NO', 'REV_AT_EPOCH', 'BSTAR', 'MEAN_MOTION_DOT', 'MEAN_MOTION_DDOT')


class CelesTrakDown(Exception):
    pass


def celestrak(params):
    """One request; anything but HTTP 200 (or no answer) raises CelesTrakDown."""
    full = CELESTRAK + '?' + urllib.parse.urlencode(params)
    try:
        with urllib.request.urlopen(urllib.request.Request(full, headers=UA), timeout=60) as r:
            if r.status != 200:
                raise CelesTrakDown('HTTP %d' % r.status)
            return r.read().decode('utf-8-sig', 'replace')
    except urllib.error.HTTPError as e:
        raise CelesTrakDown('HTTP %d' % e.code) from None
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise CelesTrakDown(str(e)) from None


def omm_rows(text):
    """The OMM rows of a CelesTrak CSV answer, with numbers as numbers ("No GP data found" gives none)."""
    out = []
    for r in csv.DictReader(io.StringIO(text.lstrip('\ufeff'))):
        try:
            o = {k: (r.get(k) or '').strip() for k in OMM_TEXT}
            for k in OMM_NUM:
                v = float(r[k])
                o[k] = int(v) if k in ('EPHEMERIS_TYPE', 'NORAD_CAT_ID', 'ELEMENT_SET_NO', 'REV_AT_EPOCH') else v
        except (KeyError, TypeError, ValueError):
            continue
        if o['OBJECT_NAME'] and o['EPOCH'] and o['MEAN_MOTION'] > 0:
            out.append(o)
    return out


def epoch_of(o):
    s = o['EPOCH'].rstrip('Z')
    if '.' in s:
        head, frac = s.split('.', 1)
        s = head + '.' + (frac + '000000')[:6]
    return dt.datetime.fromisoformat(s)


def _exp(v):
    """A TLE number with an assumed leading decimal point and a power of ten: 0.00017748 -> ' 17748-3'."""
    if v == 0:
        return ' 00000+0'
    sign, v = ('-' if v < 0 else ' '), abs(v)
    e = math.floor(math.log10(v)) + 1
    m = round(v / 10 ** e * 1e5)
    if m >= 100000:
        m, e = m // 10, e + 1
    return '%s%05d%s%d' % (sign, m, '-' if e < 0 else '+', abs(e))


def _check(line):
    return line + str(sum(int(c) if c.isdigit() else c == '-' for c in line) % 10)


def two_line(o):
    """The two-line set of an OMM row with a catalogue number below 100,000; None for six-digit numbers."""
    n = o['NORAD_CAT_ID']
    if n >= 100000:
        return None
    ep = epoch_of(o)
    day = (ep - dt.datetime(ep.year, 1, 1)).total_seconds() / 86400 + 1
    intl = re.sub(r'^\d\d(\d\d)-(\d{3})(\w*)$', r'\1\2\3', o['OBJECT_ID'])[:8]
    nd = '%.8f' % o['MEAN_MOTION_DOT']
    nd = ('-' if nd.startswith('-') else ' ') + nd.lstrip('-')[1:]
    l1 = '1 %05d%s %-8s %02d%012.8f %s %s %s %d %4d' % (n, o['CLASSIFICATION_TYPE'] or 'U', intl, ep.year % 100, day, nd,
                                                       _exp(o['MEAN_MOTION_DDOT']), _exp(o['BSTAR']), o['EPHEMERIS_TYPE'], o['ELEMENT_SET_NO'] % 10000)
    l2 = '2 %05d %8.4f %8.4f %s %8.4f %8.4f %11.8f%5d' % (n, o['INCLINATION'], o['RA_OF_ASC_NODE'], ('%.7f' % o['ECCENTRICITY'])[2:],
                                                          o['ARG_OF_PERICENTER'], o['MEAN_ANOMALY'], o['MEAN_MOTION'], o['REV_AT_EPOCH'] % 100000)
    return _check(l1), _check(l2)


def tles(wanted, src=None):
    """{catalogue key: {name, norad, epoch, omm, line1, line2}} for each craft, by its exact CelesTrak name or its
    catalogue number ("#43435"). None when CelesTrak stopped answering: tle.json then keeps its previous copy."""
    by_name, by_id, found = {}, {}, {}

    def add(rows):
        for o in rows:
            by_name.setdefault(o['OBJECT_NAME'].upper(), o)
            by_id.setdefault(o['NORAD_CAT_ID'], o)
        for key, names in wanted.items():
            if key not in found:
                for n in names:
                    o = by_id.get(int(n[1:])) if n.startswith('#') else by_name.get(n.upper())
                    if o:
                        found[key] = o
                        break

    groups = GROUPS
    if src:
        path = os.path.join(src, 'active.csv')
        if os.path.exists(path):
            with open(path, encoding='utf-8-sig') as fh:
                add(omm_rows(fh.read()))
            print('  active list read from %s' % path)
            groups = []                                    # the smaller groups are parts of the active list
        else:
            print('  %s not found: asking CelesTrak for the smaller groups' % path)
            groups = [g for g in GROUPS if g != 'active']  # the active list is never asked for twice in one run
    try:
        for g in groups:
            if all(k in found for k in wanted):
                break
            add(omm_rows(celestrak({'GROUP': g, 'FORMAT': 'csv'})))
            time.sleep(2)
        for key, names in wanted.items():                  # not in any group: ask by name or by catalogue number
            for n in names:
                if key in found:
                    break
                q = {'CATNR': n[1:]} if n.startswith('#') else {'NAME': n}
                rows = omm_rows(celestrak({**q, 'FORMAT': 'csv'}))
                exact = [o for o in rows if n.startswith('#') or o['OBJECT_NAME'].upper() == n.upper()]
                if exact or len(rows) == 1:
                    found[key] = (exact or rows)[0]
                time.sleep(2)
    except CelesTrakDown as e:
        print('  not found: CelesTrak stopped answering (%s); no further CelesTrak request this run, tle.json kept as it was' % e)
        return None
    out = {}
    for key, o in found.items():
        rec = {'name': o['OBJECT_NAME'], 'norad': o['NORAD_CAT_ID'], 'epoch': epoch_of(o).strftime('%Y-%m-%d %H:%M'), 'omm': o}
        tl = two_line(o)
        if tl:
            rec['line1'], rec['line2'] = tl
        out[key] = rec
    for key in wanted:
        print('  %-28s %s' % (key, ('%s (%d), elements of %s' % (out[key]['name'], out[key]['norad'], out[key]['epoch'])) if key in out else 'not found at CelesTrak'))
    return out


# ---------------------------------------------------------------- links
def check_links(cat):
    """Return (broken, not_checked). A link is broken only when its page answers GET with 404 or 410. An answer that
    says nothing about the page (403, 429, a server error, a timeout) leaves it not checked. Decided Nov 19, 2026:
    when one site answers 404 for at least five links in a run and for at least a third of its links, it is taken to
    be turning the robot away (seen on esa.int, whose mission pages load in a browser), and those links are not
    checked either; a single moved page on a site that answers normally is still found."""
    codes = {}
    for c in cat:
        for l in c.get('links', []):
            u = l['url']
            if u in codes:
                continue
            code = None
            for method in ('HEAD', 'GET'):
                try:
                    req = urllib.request.Request(u, headers=UA, method=method)
                    with urllib.request.urlopen(req, timeout=30) as r:
                        code = r.status
                    break
                except urllib.error.HTTPError as e:
                    code = e.code
                    # Decided Nov 15, 2026: any refusal of HEAD is tried again with GET, because some sites answer
                    # HEAD with 404 for pages that load (seen on esa.int); only a GET decides that a link is gone.
                    if method == 'GET' or e.code not in (403, 404, 405, 410, 429, 501):
                        break
                except Exception as e:
                    code = str(e)[:60]
                    break
            codes[u] = code
            print('  %s %s' % (code, u))
            time.sleep(0.5)
    by_site = {}
    for u, code in codes.items():
        by_site.setdefault(urllib.parse.urlsplit(u).netloc, []).append(code)
    refusing = {h for h, cs in by_site.items()
                if sum(c in (404, 410) for c in cs) >= 5 and sum(c in (404, 410) for c in cs) * 3 >= len(cs)}
    for h in sorted(refusing):
        print('  %s answered 404 for %d of its %d links: taken as turning the robot away; those links not checked'
              % (h, sum(c in (404, 410) for c in by_site[h]), len(by_site[h])))
    broken, unchecked = [], []
    for u, code in codes.items():
        if code in (404, 410) and urllib.parse.urlsplit(u).netloc not in refusing:
            broken.append(u)
        elif not (isinstance(code, int) and 200 <= code < 400):
            unchecked.append(u)
    return broken, unchecked


def links_due(now):
    if os.environ.get('GITHUB_EVENT_NAME') == 'push':
        return True
    try:
        with open(os.path.join(DATA, 'links.json')) as fh:
            last = dt.datetime.strptime(json.load(fh)['updated'], '%Y-%m-%d %H:%M UTC')
    except (OSError, ValueError, KeyError):
        return True
    return (now - last).total_seconds() >= 20 * 3600


def main():
    ap = argparse.ArgumentParser(description='Spacecraft map data')
    ap.add_argument('--from', dest='src', help="read CelesTrak's active list from DIR/active.csv (saved by orbit-watch/fetch_orbits.py --keep DIR)")
    args = ap.parse_args()
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(HERE, 'catalogue.json')) as fh:
        cat = json.load(fh)['craft']
    now = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None, second=0, microsecond=0)
    stamp = now.strftime('%Y-%m-%d %H:%M UTC')
    ok = True

    print('Horizons:')
    pos = {}
    for c in cat:
        if 'horizons' in c['src'] or 'horizons_name' in c['src']:
            try:
                s = samples_for(c, now)
            except Exception as e:
                print('  %-28s failed: %s' % (c['name'], e))
                s, ok = None, False
            if s:
                pos[c['key']] = s
            time.sleep(1)
    if pos:
        write('positions.json', {'source': 'NASA/JPL Horizons (ssd.jpl.nasa.gov/api/horizons.api)', 'frame': 'ecliptic J2000 (ICRF), km, relative to "parent"',
                                 'updated': stamp, 'craft': pos})

    print('CelesTrak:')
    wanted = {c['key']: c['src']['tle'] for c in cat if 'tle' in c['src']}
    try:
        t = tles(wanted, args.src)
        if t:
            write('tle.json', {'source': 'CelesTrak (celestrak.org), general perturbations orbital elements', 'updated': stamp,
                               'sats': [{'key': k, **v} for k, v in sorted(t.items())]})
    except Exception as e:
        print('  failed: %s' % e)
        ok = False

    print('Past missions:')
    try:
        with open(os.path.join(HERE, 'past.json')) as fh:
            past = json.load(fh)['craft']
    except (OSError, ValueError, KeyError) as e:
        print('  past.json could not be read: %s' % e)
        past = []
    try:
        with open(os.path.join(DATA, 'routes.json')) as fh:
            old = json.load(fh).get('craft', {})
    except (OSError, ValueError):
        old = {}
    routes, drift = {}, {}
    for p in past:
        if 'route' not in p:                              # Horizons has no route for it (Chandrayaan-1: only since 2016)
            continue
        sig = json.dumps([p['route'], p['launch'], p['ended']], sort_keys=True)
        if old.get(p['key'], {}).get('sig') == sig:
            routes[p['key']] = old[p['key']]
        else:
            try:
                r = route_for(p, now)
            except Exception as e:
                print('  %-28s failed: %s' % (p['name'], e))
                r = None
            if r:
                routes[p['key']] = {**r, 'sig': sig}
            elif p['key'] in old:
                routes[p['key']] = old[p['key']]          # keep the earlier route rather than lose it
            time.sleep(1)
        if p.get('rest') == 'drift' and 'route' in p:
            try:
                d = drift_now(p, now)
            except Exception as e:
                print('  %-28s now: failed: %s' % (p['name'], e))
                d = None
            print('  %-28s now: %s' % (p['name'], 'followed' if d else 'no longer followed by Horizons'))
            if d:
                drift[p['key']] = d
            time.sleep(1)
    if routes:
        write('routes.json', {'source': 'NASA/JPL Horizons (ssd.jpl.nasa.gov/api/horizons.api)', 'frame': 'ecliptic J2000 (ICRF), km, relative to "parent"',
                              'updated': stamp, 'craft': routes, 'now': drift})

    # links once a day is plenty: when the last check is 20 hours old or more, when there is no file yet, or when the
    # catalogue has just changed (a push run). Decided Nov 14, 2026: by age, not by the hour of the run, because GitHub
    # often starts the morning run hours late, after midday, and the check was then skipped every day.
    if links_due(now):
        print('Links:')
        broken, unchecked = check_links(cat + past)
        write('links.json', {'updated': stamp, 'broken': broken, 'not_checked': unchecked})
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
