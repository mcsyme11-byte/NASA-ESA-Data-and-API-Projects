#!/usr/bin/env python3
# NASA and ESA Data Projects · Orbit Watch data · © 2026 Malcolm Syme · mcsyme11@gmail.com
#
# Reads CelesTrak (celestrak.org; approved for Orbit Watch on Nov 17, 2026) and writes, into orbit-watch/data/:
#   objects.json  orbital elements (CelesTrak's OMM CSV, which carries 6-digit catalogue numbers) of every object in the
#                 groups below, with its kind from the satellite catalogue, for the SGP4 model run in the browser
#   heights.json  every object in Earth orbit in the satellite catalogue (SATCAT), counted by kind and by height
#   close.json    the closest predicted passes of the next seven days from SOCRATES Plus, by distance and by chance,
#                 each marked "globe" when both objects are in objects.json (the tracker can then replay the pass)
#
# Sources (checked against CelesTrak's documentation on Nov 17, 2026; recorded in docs/DATA-SOURCES.md):
#   GP     https://celestrak.org/NORAD/elements/gp.php?GROUP=<group>&FORMAT=csv
#   SATCAT https://celestrak.org/pub/satcat.csv
#   SOCRATES https://celestrak.org/SOCRATES/sort-minRange.csv
# CelesTrak's usage policy (updated May 22, 2026): stop at the first answer that is not HTTP 200 and report it, never
# retry a 50x straight away, and ask for a large list (the active satellites) at most once in two hours. So each source
# is asked once per run, with no retries; if one fails, its file is left as it was and the run carries on with the rest.
#
# Kinds: w working satellite (operational status +, P, B, S or X), d dead satellite, r rocket body, x debris,
# u unknown. Mega-constellations (Starlink, OneWeb, Kuiper, Qianfan, Guowang) are flagged so the page can hide them.
#
# Run by hand:  python3 orbit-watch/fetch_orbits.py              (standard library only)
#               python3 orbit-watch/fetch_orbits.py --from DIR   (read saved copies instead: DIR/<group>.csv,
#                                                                 DIR/satcat.csv, DIR/sort-minRange.csv)
#               --keep DIR  also keeps each downloaded file in DIR (so another script in the same job can reuse it,
#                           and CelesTrak is asked once); --only gp,satcat,socrates  a part of the run
import argparse
import csv
import datetime as dt
import io
import json
import math
import os
import sys
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
GP = 'https://celestrak.org/NORAD/elements/gp.php?GROUP={}&FORMAT=csv'
SATCAT = 'https://celestrak.org/pub/satcat.csv'
SOCRATES = 'https://celestrak.org/SOCRATES/sort-minRange.csv'
UA = {'User-Agent': 'NASA-and-ESA-Data-Projects/1.0 (Orbit Watch; github.com/mcsyme11-byte/NASA-ESA-Data-and-API-Projects)'}

# The element groups read: the active satellites, and the debris clouds CelesTrak publishes as groups. CelesTrak does not
# publish one file of elements for every catalogued object, so rocket bodies and other debris are counted (heights.json,
# from the catalogue) but are on the globe only when they belong to one of these groups.
GROUPS = [('active', ''), ('fengyun-1c-debris', 'fy'), ('cosmos-2251-debris', 'co'), ('iridium-33-debris', 'ir')]
WORKING = set('+PBSX')
MEGA = ('STARLINK', 'ONEWEB', 'KUIPER', 'QIANFAN', 'GUOWANG')
R_EARTH = 6378.135                           # km, the WGS-72 radius SGP4 uses
MU = 398600.8                                # km^3/s^2, WGS-72
BIN, TOP = 50, 2000                          # height bands in low Earth orbit: 50 km wide, up to 2,000 km
GEO_LO, GEO_HI = 35586, 35986                # the geostationary band: 35,786 km ± 200 km (mean height)
KEEP_CLOSE = 15                              # rows kept in each SOCRATES list


class SourceError(Exception):
    pass


def get(url, name, args):
    """One request; any answer other than HTTP 200 stops this source (CelesTrak's usage policy)."""
    if args.src:
        path = os.path.join(args.src, name)
        if not os.path.exists(path):
            raise SourceError(f'{name}: not found in {args.src}')
        with open(path, encoding='utf-8-sig') as f:
            return f.read()
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
            if r.status != 200:
                raise SourceError(f'{url}: HTTP {r.status}')
            text = r.read().decode('utf-8-sig', 'replace')
    except urllib.error.HTTPError as e:
        raise SourceError(f'{url}: HTTP {e.code}') from None
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise SourceError(f'{url}: {e}') from None
    if args.keep:
        os.makedirs(args.keep, exist_ok=True)
        with open(os.path.join(args.keep, name), 'w', encoding='utf-8') as f:
            f.write(text)
    return text


def rows(text):
    return list(csv.DictReader(io.StringIO(text)))


def num(s, default=None):
    try:
        v = float(s)
        return v if math.isfinite(v) else default
    except (TypeError, ValueError):
        return default


def write(name, doc):
    os.makedirs(DATA, exist_ok=True)
    path = os.path.join(DATA, name)
    with open(path + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(doc, f, separators=(',', ':'), ensure_ascii=False, allow_nan=False)
    os.replace(path + '.tmp', path)
    print(f'  wrote {name} ({os.path.getsize(path) // 1024} KB)')


def kind_of(sc):
    t = (sc.get('OBJECT_TYPE') or '').strip()
    if t == 'PAY':
        return 'w' if (sc.get('OPS_STATUS_CODE') or '').strip() in WORKING else 'd'
    return {'R/B': 'r', 'DEB': 'x'}.get(t, 'u')


def mean_height(sc):
    a, p = num(sc.get('APOGEE')), num(sc.get('PERIGEE'))
    return None if a is None or p is None else (a + p) / 2


# ---------------------------------------------------------------- the satellite catalogue
def read_satcat(args):
    text = get(SATCAT, 'satcat.csv', args)
    cat = {}
    for r in rows(text):
        n = (r.get('NORAD_CAT_ID') or '').strip()
        if n.isdigit():
            cat[int(n)] = r
    if len(cat) < 1000:
        raise SourceError(f'satcat.csv: only {len(cat)} rows, not a whole catalogue')
    print(f'  satellite catalogue: {len(cat):,} objects')
    return cat


def in_orbit(sc):
    return not (sc.get('DECAY_DATE') or '').strip() and (sc.get('ORBIT_CENTER') or 'EA').strip() == 'EA'


def heights(cat, made):
    kinds = 'wdrxu'
    nb = TOP // BIN
    bins = [[0] * 5 for _ in range(nb)]
    regions = {k: [0] * 5 for k in ('low', 'below', 'mid', 'geo', 'high', 'unknown')}
    total = [0] * 5
    for sc in cat.values():
        if not in_orbit(sc):
            continue
        k = kinds.index(kind_of(sc))
        total[k] += 1
        h = mean_height(sc)
        if h is None:
            regions['unknown'][k] += 1
        elif h < 100:
            regions['below'][k] += 1          # coming down: under 100 km on average
        elif h < TOP:
            regions['low'][k] += 1
            bins[min(nb - 1, int(h // BIN))][k] += 1
        elif h < GEO_LO:
            regions['mid'][k] += 1
        elif h <= GEO_HI:
            regions['geo'][k] += 1
        else:
            regions['high'][k] += 1
    return {'source': 'CelesTrak satellite catalogue (SATCAT), celestrak.org', 'made': made,
            'kinds': ['working satellites', 'dead satellites', 'rocket bodies', 'debris', 'unknown'],
            'total': total, 'step': BIN, 'bins': bins, 'regions': regions,
            'note': 'Each object counted once, in the band of its mean height (half-way between its lowest and highest point).'}


# ---------------------------------------------------------------- orbital elements
def epoch_ms(s):
    s = (s or '').strip().rstrip('Z')
    if not s:
        return None
    if '.' in s:
        head, frac = s.split('.', 1)
        s = head + '.' + (frac + '000000')[:6]
    try:
        d = dt.datetime.fromisoformat(s).replace(tzinfo=dt.timezone.utc)
    except ValueError:
        return None
    return round(d.timestamp() * 1000)


def read_elements(args, cat):
    seen, out, counts, failed = set(), [], {}, []
    for group, cloud in GROUPS:
        try:
            text = get(GP.format(group), f'{group}.csv', args)
        except SourceError as e:
            print(f'  not found: elements for {group} ({e})')
            failed.append(group)
            continue
        n = 0
        for r in rows(text):
            cid = (r.get('NORAD_CAT_ID') or '').strip()
            mm, ecc = num(r.get('MEAN_MOTION')), num(r.get('ECCENTRICITY'))
            ep = epoch_ms(r.get('EPOCH'))
            if not cid.isdigit() or not mm or ecc is None or ep is None or int(cid) in seen:
                continue
            cid = int(cid)
            seen.add(cid)
            sc = cat.get(cid, {}) if cat else {}
            name = (r.get('OBJECT_NAME') or sc.get('OBJECT_NAME') or '').strip()
            kind = kind_of(sc) if sc else ('w' if group == 'active' else 'x')
            flags = cloud or ('mega' if name.upper().startswith(MEGA) else '')
            out.append([cid, name, (r.get('OBJECT_ID') or '').strip(), kind, flags, ep,
                        round(mm, 8), round(ecc, 7), round(num(r.get('INCLINATION'), 0), 4),
                        round(num(r.get('RA_OF_ASC_NODE'), 0), 4), round(num(r.get('ARG_OF_PERICENTER'), 0), 4),
                        round(num(r.get('MEAN_ANOMALY'), 0), 4), float(f"{num(r.get('BSTAR'), 0):.4e}"),
                        float(f"{num(r.get('MEAN_MOTION_DOT'), 0):.4e}"), float(f"{num(r.get('MEAN_MOTION_DDOT'), 0):.4e}"),
                        (sc.get('OWNER') or '').strip(), (sc.get('LAUNCH_DATE') or '').strip()[:10]])
            n += 1
        counts[group] = n
        print(f'  elements, {group}: {n:,}')
    return out, counts, failed


# ---------------------------------------------------------------- close approaches
def read_close(args, cat, made, on_globe):
    text = get(SOCRATES, 'sort-minRange.csv', args)
    passes = []
    now = dt.datetime.now(dt.timezone.utc)
    for r in rows(text):
        a, b = (r.get('NORAD_CAT_ID_1') or '').strip(), (r.get('NORAD_CAT_ID_2') or '').strip()
        rng, spd, prob = num(r.get('TCA_RANGE')), num(r.get('TCA_RELATIVE_SPEED')), num(r.get('MAX_PROB'), 0)
        tca = (r.get('TCA') or '').strip()
        if not (a.isdigit() and b.isdigit()) or rng is None or spd is None or not tca:
            continue
        ms = epoch_ms(tca)
        if ms is None or ms < now.timestamp() * 1000 - 3600e3:
            continue                          # already past
        one = lambda c, nm: {'id': int(c), 'name': nm.strip(), 'kind': kind_of(cat[int(c)]) if cat and int(c) in cat else ''}
        passes.append({'a': one(a, r.get('OBJECT_NAME_1') or ''), 'b': one(b, r.get('OBJECT_NAME_2') or ''),
                       'tca': ms, 'km': round(rng, 3), 'kms': round(spd, 3), 'p': prob,
                       'globe': int(a) in on_globe and int(b) in on_globe})
    if not passes:
        raise SourceError('sort-minRange.csv: no passes still to come')
    by_range = sorted(passes, key=lambda p: (p['km'], p['tca']))[:KEEP_CLOSE]
    by_prob = sorted((p for p in passes if p['p'] > 0), key=lambda p: (-p['p'], p['tca']))[:KEEP_CLOSE]
    print(f'  close approaches: {len(passes):,} still to come; kept {len(by_range)} by distance, {len(by_prob)} by chance')
    return {'source': 'CelesTrak SOCRATES Plus, celestrak.org', 'made': made, 'screened': len(passes),
            'byRange': by_range, 'byProb': by_prob,
            'note': 'Predicted closest approaches within 5 km over the next seven days, from published orbital elements.'}


def main():
    ap = argparse.ArgumentParser(description='Orbit Watch data from CelesTrak')
    ap.add_argument('--from', dest='src', help='read saved copies from this folder instead of downloading')
    ap.add_argument('--keep', help='also keep each downloaded file in this folder')
    ap.add_argument('--only', default='gp,satcat,socrates')
    args = ap.parse_args()
    parts = set(args.only.split(','))
    made = dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    bad = []

    cat = None
    if parts & {'satcat', 'gp', 'socrates'}:
        try:
            cat = read_satcat(args)
        except SourceError as e:
            print(f'  not found: the satellite catalogue ({e}); kinds come from the groups, heights.json is kept')
            bad.append('satcat')
    if 'satcat' in parts and cat:
        write('heights.json', heights(cat, made))

    on_globe = set()
    if 'gp' in parts:
        objs, counts, failed = read_elements(args, cat)
        on_globe = {o[0] for o in objs}
        bad += failed
        if objs and 'active' not in failed:
            write('objects.json', {
                'source': 'CelesTrak general perturbations orbital elements (OMM), celestrak.org', 'made': made,
                'groups': counts, 'kinds': cat is not None,
                'f': ['id', 'name', 'intl', 'kind', 'flag', 'epoch', 'mm', 'ecc', 'inc', 'raan', 'argp', 'ma', 'bstar',
                      'mmdot', 'mmddot', 'owner', 'launch'],
                'o': objs})
        else:
            print('  objects.json kept as it was (the active satellites could not be read)')

    if 'socrates' in parts:
        if not on_globe:                      # elements not read in this run: use the saved file's objects
            try:
                with open(os.path.join(DATA, 'objects.json'), encoding='utf-8') as f:
                    on_globe = {o[0] for o in json.load(f)['o']}
            except (OSError, ValueError, KeyError):
                pass
        try:
            write('close.json', read_close(args, cat, made, on_globe))
        except SourceError as e:
            print(f'  not found: close approaches ({e}); close.json kept')
            bad.append('socrates')

    if bad:
        print('Finished with problems: ' + ', '.join(bad))
        sys.exit(1)
    print('Finished.')


if __name__ == '__main__':
    main()
