#!/usr/bin/env python3
# NASA and ESA Data Projects · Asteroid Tracker · reach and resources (the mining view) · © 2026 Malcolm Syme ·
# mcsyme11@gmail.com
#
# Writes, in asteroid-tracker/data/:
#   reach.json   every near-Earth asteroid NASA/JPL's NHATS study finds reachable for a round trip from Earth orbit
#                (total delta-v at most 12 km/s, at most 450 days, at least 8 days at the asteroid, launch 2020–2045):
#                the cheapest trip and the shortest trip for each, and, for the asteroids most likely to be looked at,
#                the cheapest trip in each five-year launch period still ahead (the launch windows)
#   phys.json    every near-Earth object for which NASA/JPL's Small-Body Database (SBDB) holds a spectral type, a
#                rotation period or an albedo: those fields with density, diameter and dimensions
#
# Sources (no key, no CORS headers, so web pages read these files and never call JPL):
#   NHATS API   https://ssd-api.jpl.nasa.gov/doc/nhats.html       (version 1.3 expected)
#   SBDB Query  https://ssd-api.jpl.nasa.gov/doc/sbdb_query.html  (version 1.0 expected)
# A reply in another version stops that part and keeps its previous file, because the format may have changed.
#
# Run by hand:  python3 asteroid-tracker/fetch_reach.py              (standard library only; about 40 minutes, because
#               the launch windows take four requests per asteroid, sent one a second)
#               python3 asteroid-tracker/fetch_reach.py --raw DIR    builds the files from saved API replies instead:
#               DIR/nhats.json (the NHATS list), DIR/phys.json (the SBDB query) and DIR/windows.json
#               ({designation: {launch period: NHATS reply}})
import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data')
NHATS = 'https://ssd-api.jpl.nasa.gov/nhats.api'
SBDB_QUERY = 'https://ssd-api.jpl.nasa.gov/sbdb_query.api'
UA = {'User-Agent': 'NASA-and-ESA-Data-Projects/1.0 (asteroid tracker, mining view)'}
NHATS_VERSION, SBDB_VERSION = '1.3', '1.0'
# NHATS's own launch periods (2020–2025 is in the past); a period's cheapest trip may fall on its last year, which the
# next period can also return: duplicates are removed by trajectory id
PERIODS = ['2025-2030', '2030-2035', '2035-2040', '2040-2045']
# Which asteroids get launch windows (about 600 on Nov 17, 2026): every numbered one, every one with measured physical
# data, every one at least 300 m across, and every one at least 10 m across with a round trip of 4.5 km/s or less.
# JPL's servers refused this address (HTTP 403) after about 800 quick requests on Nov 17, 2026, so the requests go one
# at a time, one a second, and the first refusal ends this part: asteroids not reached keep their previous windows.
WINDOWS_MIN_SIZE_M = 300
WINDOWS_CHEAP_DV, WINDOWS_CHEAP_MIN_SIZE_M = 4.5, 10
PAUSE_S = 1.0
PHYS_FIELDS = ['spkid', 'pdes', 'spec_B', 'spec_T', 'rot_per', 'albedo', 'density', 'diameter', 'extent']
REACH_FIELDS = ['des', 'name', 'spkid', 'h', 'size_min', 'size_max', 'size', 'dv', 'dur', 'fast_dv', 'fast_dur',
                'n_traj', 'occ']
WINDOW_FIELDS = ['period', 'launch', 'out', 'stay', 'back', 'dv', 'dv_leave_earth', 'dv_arrive', 'dv_depart',
                 'dv_return', 'entry_speed', 'tid']


def get(url, params, tries=3):
    q = urllib.parse.urlencode(params)
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url + ('?' + q if q else ''), headers=UA), timeout=180) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            if k == tries - 1:
                raise
            print('  retrying after: %s' % e)
            time.sleep(5 * (k + 1))


def num(s):
    """NHATS and SBDB send numbers as strings, sometimes in forms such as '3.e3'; None stays None."""
    if s is None or s == '':
        return None
    try:
        return float(s)
    except (TypeError, ValueError):
        return None


def r(x, n):
    return None if x is None else round(x, n)


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
        json.dump(obj, fh, separators=(',', ':'), allow_nan=False)
        fh.write('\n')
    print('  wrote %s' % name)


def spkids():
    """Designation → SBDB spkid, from data/neos.json (written by fetch_map_data.py), for links to the asteroid pages."""
    d = old('neos.json')
    if not d:
        return {}
    f = d['fields']
    i, s = f.index('designation'), f.index('spkid')
    return {str(row[i]): row[s] for row in d['rows']}


def clean_name(full):
    """'       (2000 SG344)' → '2000 SG344'; '101955 Bennu (1999 RQ36)' → '101955 Bennu (1999 RQ36)'."""
    s = (full or '').strip()
    if s.startswith('(') and s.endswith(')'):
        s = s[1:-1]
    return s


def check_version(reply, want, what):
    v = (reply.get('signature') or {}).get('version')
    if v != want:
        raise ValueError('%s answered in version %s, expected %s: the format may have changed' % (what, v, want))


# ---------------------------------------------------------------- the two files
def build_phys(reply):
    check_version(reply, SBDB_VERSION, 'SBDB Query API')
    f = reply['fields']
    if any(k not in f for k in PHYS_FIELDS):
        raise ValueError('SBDB Query API: fields missing from the reply: %s' % [k for k in PHYS_FIELDS if k not in f])
    ix = [f.index(k) for k in PHYS_FIELDS]
    rows = []
    for row in reply.get('data') or []:
        v = [row[i] for i in ix]
        rows.append([int(v[0]), str(v[1]), v[2] or None, v[3] or None, r(num(v[4]), 4), r(num(v[5]), 3),
                     r(num(v[6]), 3), r(num(v[7]), 4), v[8] or None])
    if len(rows) < 1000:                     # 3,040 objects on Nov 17, 2026
        raise ValueError('SBDB Query API: only %d objects with physical data, expected thousands' % len(rows))
    rows.sort(key=lambda x: x[0])
    return {
        'source': 'NASA/JPL Small-Body Database (SBDB Query API, ssd-api.jpl.nasa.gov/sbdb_query.api), sb-group=neo',
        'updated': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
        'count': len(rows),
        'fields': ['spkid', 'des', 'spec_B', 'spec_T', 'rot_per', 'albedo', 'density', 'diameter', 'extent'],
        'units': {'rot_per': 'hours', 'density': 'g/cm3', 'diameter': 'km', 'extent': 'km'},
        'rows': rows,
    }


def build_reach(summary, windows_raw, ids, today):
    check_version(summary, NHATS_VERSION, 'NHATS API')
    rows = []
    for o in summary.get('data') or []:
        mdv, mdur = o.get('min_dv') or {}, o.get('min_dur') or {}
        des = str(o['des']).strip()
        rows.append([des, clean_name(o.get('fullname')), ids.get(des), num(o.get('h')), num(o.get('min_size')),
                     num(o.get('max_size')), num(o.get('size')), num(mdv.get('dv')), mdv.get('dur'),
                     num(mdur.get('dv')), mdur.get('dur'), o.get('n_via_traj'), num(o.get('occ'))])
    rows = [x for x in rows if x[7] is not None]
    if len(rows) < 1000:                     # 7,219 asteroids on Nov 17, 2026
        raise ValueError('NHATS API: only %d asteroids in the list, expected thousands' % len(rows))
    rows.sort(key=lambda x: (x[7], x[0]))

    windows, computed = {}, {}
    for des, per in windows_raw.items():
        seen, out = set(), []
        for period in PERIODS:
            rep = per.get(period)
            if not rep or rep.get('error'):
                continue
            t = rep.get('min_dv_traj') or {}
            if not t.get('launch') or t['launch'] < today or t.get('tid') in seen:
                continue
            seen.add(t.get('tid'))
            out.append([period, t['launch'], t.get('dur_out'), t.get('dur_at'), t.get('dur_ret'), num(t.get('dv_total')),
                        num(t.get('dv_dep_park')), num(t.get('vrel_arr_neo')), num(t.get('vrel_dep_neo')),
                        num(t.get('vrel_arr_earth')), num(t.get('v_arr_earth')), t.get('tid')])
            if rep.get('computed'):
                computed[des] = rep['computed']
        if out:
            windows[des] = sorted(out, key=lambda w: w[1])
    return {
        'source': 'NASA/JPL CNEOS, NHATS (Near-Earth Object Human Space Flight Accessible Targets Study), '
                  'ssd-api.jpl.nasa.gov/nhats.api',
        'updated': dt.datetime.now(dt.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
        'version': NHATS_VERSION,
        'constraints': {'dv_max': 12, 'dur_max': 450, 'stay_min': 8, 'launch': '2020-2045',
                        'departure': 'circular 400 km Earth orbit', 'entry_speed_max': 12},
        'count': len(rows),
        'units': {'size': 'm', 'dv': 'km/s', 'dur': 'days'},
        'fields': REACH_FIELDS,
        'rows': rows,
        'windows_rule': 'numbered asteroids, asteroids with measured physical data, asteroids at least %d m across, '
                        'and asteroids at least %d m across with a round trip of %.1f km/s or less: the cheapest '
                        'trip in each launch period, launches from %s on'
                        % (WINDOWS_MIN_SIZE_M, WINDOWS_CHEAP_MIN_SIZE_M, WINDOWS_CHEAP_DV, today),
        'window_fields': WINDOW_FIELDS,
        'windows': windows,
        'computed': computed,
    }


def wanted_for_windows(summary, phys_des):
    out = []
    for o in summary.get('data') or []:
        des = str(o['des']).strip()
        size, dv = num(o.get('max_size')) or 0, num((o.get('min_dv') or {}).get('dv'))
        if (des.isdigit() or des in phys_des or size >= WINDOWS_MIN_SIZE_M
                or (dv is not None and dv <= WINDOWS_CHEAP_DV and size >= WINDOWS_CHEAP_MIN_SIZE_M)):
            out.append(des)
    return out


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', help='build from saved API replies in this folder instead of asking JPL')
    a = ap.parse_args()
    today = dt.date.today().isoformat()
    failed = []

    print('SBDB physical data')
    try:
        if a.raw:
            with open(os.path.join(a.raw, 'phys.json'), encoding='utf-8') as fh:
                phys_reply = json.load(fh)
        else:
            phys_reply = get(SBDB_QUERY, {
                'sb-group': 'neo', 'fields': ','.join(PHYS_FIELDS),
                'sb-cdata': json.dumps({'OR': ['spec_B|DF', 'spec_T|DF', 'rot_per|DF', 'albedo|DF']}, separators=(',', ':')),
            })
        phys = build_phys(phys_reply)
        write_if_changed('phys.json', phys)
        phys_des = {row[1] for row in phys['rows']}
    except Exception as e:
        print('  FAILED, previous phys.json kept: %s' % e)
        failed.append('phys')
        prev = old('phys.json')
        phys_des = {row[1] for row in prev['rows']} if prev else set()

    print('NHATS list and launch windows')
    try:
        if a.raw:
            with open(os.path.join(a.raw, 'nhats.json'), encoding='utf-8') as fh:
                summary = json.load(fh)
            with open(os.path.join(a.raw, 'windows.json'), encoding='utf-8') as fh:
                windows_raw = json.load(fh)
        else:
            summary = get(NHATS, {})
            check_version(summary, NHATS_VERSION, 'NHATS API')
            want = wanted_for_windows(summary, phys_des)
            print('  launch windows for %d asteroids' % len(want))
            windows_raw, refused = {}, False
            for k, des in enumerate(want):
                per = {}
                for period in PERIODS:
                    try:
                        per[period] = get(NHATS, {'des': des, 'launch': period}, tries=1)
                    except urllib.error.HTTPError as e:
                        if e.code in (403, 429):
                            refused = True
                            break
                        print('  %s %s: %s' % (des, period, e))
                    except Exception as e:
                        print('  %s %s: %s' % (des, period, e))
                    time.sleep(PAUSE_S)
                if refused:
                    print('  JPL refused further requests after %d asteroids; the rest keep their previous windows' % k)
                    break
                windows_raw[des] = per
                if k % 100 == 0:
                    print('  %d of %d' % (k, len(want)))
        reach = build_reach(summary, windows_raw, spkids(), today)
        prev = old('reach.json')
        if prev:                             # asteroids not asked this time keep their previous windows
            for des, w in (prev.get('windows') or {}).items():
                if des not in windows_raw and des not in reach['windows']:
                    w = [x for x in w if x[1] >= today]
                    if w:
                        reach['windows'][des] = w
                        if des in (prev.get('computed') or {}):
                            reach['computed'][des] = prev['computed'][des]
        write_if_changed('reach.json', reach)
        print('  %d asteroids, launch windows for %d' % (reach['count'], len(reach['windows'])))
    except Exception as e:
        print('  FAILED, previous reach.json kept: %s' % e)
        failed.append('reach')

    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
