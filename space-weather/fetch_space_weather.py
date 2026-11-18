#!/usr/bin/env python3
# NASA and ESA Data Projects · Space Weather · the saved copy and the record since 2010 · © 2026 Malcolm Syme ·
# mcsyme11@gmail.com
#
# The Space Weather page reads everything live in the visitor's browser (decided Nov 17, 2026). This script writes the
# two files that back it up, in space-weather/data/:
#
#   latest.json   a fallback copy of what the page reads live, in the page's own shape (see space-weather/live.js):
#                 { updated, ev: { flares, cmes, storms, seps, runs }, wind: { speed, dens, bz, bt }, xray, kp }
#                 The page uses a part of it only when that part cannot be read live, and says so.
#   archive.json  the record since 2010, month by month, for the page's "Since 2010" view:
#                 { updated, months: [{ m: "2010-04", C, M, X, cmes, fast, storms, maxKp }] }
#
# Sources (no key; checked Nov 17, 2026; recorded in docs/DATA-SOURCES.md):
#   NASA CCMC DONKI   https://ccmc.gsfc.nasa.gov/DONKI-API/get/<type>?startDate=…&endDate=…  (60 days at most per request)
#   NASA CCMC iSWA    https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/data?id=…  (HAPI 2.0, CSV)
#
# Each part keeps its previous file when its source cannot be read, and the script exits with status 1 for that part,
# so the data job's step for it shows the failure:
#   python3 space-weather/fetch_space_weather.py latest     (the fallback copy; minutes)
#   python3 space-weather/fetch_space_weather.py archive    (the monthly record: the whole record on the first run,
#                                                             about 70 DONKI requests a type; then the last 3 months)
# Standard library only.
import datetime as dt
import json
import math
import os
import re
import sys
import time
import urllib.parse
import urllib.request

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
DONKI = 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/'
HAPI = 'https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/'
UA = {'User-Agent': 'NASA-and-ESA-Data-Projects/1.0 (space weather)'}
START = dt.date(2010, 4, 1)          # the record starts with SDO's science operations; DONKI's coverage of the first years is checked on the first run
UTC = dt.timezone.utc


def get(url, tries=3):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read().decode('utf-8')
        except Exception as e:  # network or server trouble: wait and try again
            if k == tries - 1:
                raise RuntimeError(f'{url}: {e}')
            time.sleep(5 * (k + 1))


def ms(s):
    """DONKI and HAPI times ('2026-11-05T18:33Z', '2026-11-18T01:05:25Z') to milliseconds since 1970, or None."""
    if not s:
        return None
    s = str(s).rstrip('Z')
    for f in ('%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M'):
        try:
            return int(dt.datetime.strptime(s, f).replace(tzinfo=UTC).timestamp() * 1000)
        except ValueError:
            pass
    return None


def num(v):
    try:
        x = float(v)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------- DONKI
def donki(kind, start, end, extra=''):
    """One request; DONKI refuses more than 60 days, counting both ends."""
    assert (end - start).days <= 59
    body = get(f'{DONKI}{kind}?startDate={start.isoformat()}&endDate={end.isoformat()}{extra}')
    body = body.strip()
    if not body:
        return []
    if not body.startswith('['):
        raise RuntimeError(f'DONKI {kind}: unexpected answer: {body[:120]}')
    return json.loads(body)


FLUX = {'A': 1e-8, 'B': 1e-7, 'C': 1e-6, 'M': 1e-5, 'X': 1e-4}


def flux(cls):
    m = re.match(r'^([ABCMX])(\d+(?:\.\d+)?)', cls or '')
    return FLUX[m.group(1)] * float(m.group(2)) if m else None


def kp_max(g):
    v = [num(k.get('kpIndex')) for k in g.get('allKpIndex') or []]
    v = [x for x in v if x is not None]
    return max(v) if v else 0


def events(days=60):
    end = dt.datetime.now(UTC).date()
    start = end - dt.timedelta(days=days - 1)
    flr = donki('FLR', start, end)
    cme = donki('CMEAnalysis', start, end, '&mostAccurateOnly=true&catalog=ALL')
    gst = donki('GST', start, end)
    sep = donki('SEP', start, end)
    wsa = donki('WSAEnlilSimulations', end - dt.timedelta(days=9), end)
    flares = [{'t': ms(f.get('peakTime') or f.get('beginTime')), 'cls': f.get('classType'), 'flux': flux(f.get('classType')),
               'region': f.get('activeRegionNum'), 'loc': f.get('sourceLocation') or '', 'link': f.get('link')} for f in flr]
    cmes = [{'t': ms(c.get('time21_5')), 'speed': num(c.get('speed')), 'half': num(c.get('halfAngle')), 'lon': num(c.get('longitude')),
             'lat': num(c.get('latitude')), 'type': c.get('type') or '', 'link': c.get('link')} for c in cme]
    storms = [{'t': ms(g.get('startTime')), 'kp': kp_max(g), 'link': g.get('link')} for g in gst]
    seps = [{'t': ms(s.get('eventTime')), 'link': s.get('link')} for s in sep]
    runs = {}
    for w in wsa:
        if not (w.get('isEarthGB') or w.get('isEarthMinorImpact')):
            continue
        inp = (w.get('cmeInputs') or [{}])[0]
        key = inp.get('cmeStartTime') or inp.get('cmeid') or w.get('simulationID')
        kp = [num(w.get(k)) for k in ('kp_18', 'kp_90', 'kp_135', 'kp_180')]
        kp = [x for x in kp if x is not None]
        run = {'done': ms(w.get('modelCompletionTime')), 'arrival': ms(w.get('estimatedShockArrivalTime')),
               'hit': bool(w.get('isEarthGB')), 'glancing': not w.get('isEarthGB') and bool(w.get('isEarthMinorImpact')),
               'cme': ms(inp.get('cmeStartTime')), 'kp': [min(kp), max(kp)] if kp else None, 'link': w.get('link')}
        if key not in runs or (run['done'] or 0) > (runs[key]['done'] or 0):
            runs[key] = run
    return {
        'flares': sorted([f for f in flares if f['t'] and f['flux']], key=lambda f: f['t']),
        'cmes': [c for c in cmes if c['t'] and (c['speed'] or 0) > 0],
        'storms': [g for g in storms if g['t']],
        'seps': [s for s in seps if s['t']],
        'runs': sorted(runs.values(), key=lambda r: r['arrival'] or r['done'] or 0),
    }


# ---------------------------------------------------------------- iSWA (HAPI)
def hapi(ident, start, stop, params):
    q = urllib.parse.urlencode({'id': ident, 'time.min': start.strftime('%Y-%m-%dT%H:%M:%SZ'),
                                'time.max': stop.strftime('%Y-%m-%dT%H:%M:%SZ'), 'include': 'header',
                                'parameters': ','.join(params)})
    text = get(f'{HAPI}data?{q}')
    head, rows = [], []
    for line in text.split('\n'):
        if line.startswith('#'):
            head.append(line[1:])
        elif line.strip():
            rows.append(line.split(','))
    if not head:
        j = json.loads(text)
        if j.get('status', {}).get('code') == 1406:          # no data in this time range
            return [], []
        raise RuntimeError(f'iSWA {ident}: unexpected answer')
    h = json.loads('\n'.join(head))
    code = h.get('status', {}).get('code')
    if code == 1406:
        return [], []
    if code != 1200:
        raise RuntimeError(f'iSWA {ident}: {h.get("status")}')
    return [p['name'] for p in h['parameters']], rows


def bins(names, rows, name, ok, how='mean', step=600000):
    """Means (or peaks) per 10 minutes, as [time at the middle, value], like the page's live.js."""
    if name not in names:
        return []
    i, b = names.index(name), {}
    for r in rows:
        t, v = ms(r[0]), num(r[i] if i < len(r) else None)
        if t is None or v is None or not ok(v):
            continue
        k = t // step * step
        s = b.setdefault(k, [0.0, 0, -math.inf])
        s[0] += v; s[1] += 1; s[2] = max(s[2], v)
    return [[k + step // 2, round(s[2] if how == 'max' else s[0] / s[1], 9 if how == 'max' else 3)] for k, s in sorted(b.items())]


def live_series():
    now = dt.datetime.now(UTC).replace(microsecond=0)
    day = now - dt.timedelta(hours=24)
    n, r = hapi('imap_swapi', day, now, ['sw_proton_density', 'sw_proton_speed'])
    wind = {'speed': bins(n, r, 'sw_proton_speed', lambda v: 150 < v < 3000),
            'dens': bins(n, r, 'sw_proton_density', lambda v: 0 < v < 300)}
    n, r = hapi('imap_mag', day, now, ['bz_gsm', 'b_magnitude'])
    wind['bz'] = bins(n, r, 'bz_gsm', lambda v: abs(v) < 300)
    wind['bt'] = bins(n, r, 'b_magnitude', lambda v: 0 <= v < 300)
    n, r = hapi('goesp_xray_flux_P1M', day, now, ['Long_Wave'])
    xray = bins(n, r, 'Long_Wave', lambda v: 1e-9 < v < 1e-1, 'max')
    n, r = hapi('GFZ_Indices_P3H', now - dt.timedelta(days=8), now, ['Kp_observed'])
    kp = [{'t': ms(x[0]), 'kp': num(x[n.index('Kp_observed')]), 'kind': 'obs'} for x in r] if 'Kp_observed' in n else []
    kp = [k for k in kp if k['t'] and k['kp'] is not None and k['kp'] >= 0]
    try:
        info = json.loads(get(f'{HAPI}info?id=NOAA_KP_P3H'))
        stop = min(dt.datetime.fromtimestamp(ms(info['stopDate']) / 1000, UTC), now + dt.timedelta(days=4))
        n, r = hapi('NOAA_KP_P3H', now - dt.timedelta(days=1), stop, ['Kp_predicted'])
        last = kp[-1]['t'] if kp else 0
        for x in r:
            t, v = ms(x[0]), num(x[n.index('Kp_predicted')])
            if t and t > last and v is not None and v >= 0:
                kp.append({'t': t, 'kp': v, 'kind': 'pred'})
    except Exception as e:
        print(f'NOAA Kp forecast not read: {e}')
    return wind, xray, sorted(kp, key=lambda k: k['t'])


# ---------------------------------------------------------------- writing
def load(name):
    try:
        with open(os.path.join(DATA, name), encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def save(name, obj):
    os.makedirs(DATA, exist_ok=True)
    tmp = os.path.join(DATA, name + '.tmp')
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(obj, f, separators=(',', ':'))
    os.replace(tmp, os.path.join(DATA, name))


def run_latest():
    """Each part is kept from the previous file when its source fails; exit 1 if any part failed."""
    old = load('latest.json') or {}
    out, failed = dict(old), []
    try:
        out['ev'] = events()
    except Exception as e:
        failed.append('DONKI'); print(f'DONKI not read, previous copy kept: {e}')
    try:
        out['wind'], out['xray'], out['kp'] = live_series()
    except Exception as e:
        failed.append('iSWA'); print(f'iSWA not read, previous copy kept: {e}')
    if len(failed) == 2:
        return 1
    out['updated'] = dt.datetime.now(UTC).strftime('%Y-%m-%dT%H:%M:%SZ')
    save('latest.json', out)
    print(f'latest.json written ({len(out.get("ev", {}).get("flares", []))} flares, '
          f'{len(out.get("wind", {}).get("speed", []))} solar wind points)')
    return 1 if failed else 0


def month_key(ms_):
    return dt.datetime.fromtimestamp(ms_ / 1000, UTC).strftime('%Y-%m')


def run_archive():
    old = load('archive.json')
    today = dt.datetime.now(UTC).date()
    if old and old.get('months'):
        # the last three months again (late additions to DONKI), the rest kept
        first = (today.replace(day=1) - dt.timedelta(days=62)).replace(day=1)
        months = {m['m']: m for m in old['months'] if m['m'] < first.strftime('%Y-%m')}
    else:
        first, months = START, {}
    d = first
    while d <= today:
        m = d.strftime('%Y-%m')
        months.setdefault(m, {'m': m, 'C': 0, 'M': 0, 'X': 0, 'cmes': 0, 'fast': 0, 'storms': 0, 'maxKp': 0})
        d = (d.replace(day=28) + dt.timedelta(days=4)).replace(day=1)
    start = first
    try:
        while start <= today:
            end = min(start + dt.timedelta(days=59), today)
            for f in donki('FLR', start, end):
                t, c = ms(f.get('peakTime') or f.get('beginTime')), (f.get('classType') or ' ')[0]
                if t and c in ('C', 'M', 'X') and month_key(t) in months:
                    months[month_key(t)][c] += 1
            for c in donki('CMEAnalysis', start, end, '&mostAccurateOnly=true&catalog=ALL'):
                t, v = ms(c.get('time21_5')), num(c.get('speed'))
                if t and month_key(t) in months:
                    months[month_key(t)]['cmes'] += 1
                    months[month_key(t)]['fast'] += 1 if (v or 0) >= 1000 else 0
            for g in donki('GST', start, end):
                t = ms(g.get('startTime'))
                if t and month_key(t) in months:
                    mm = months[month_key(t)]
                    mm['storms'] += 1; mm['maxKp'] = max(mm['maxKp'], kp_max(g))
            start = end + dt.timedelta(days=1)
            time.sleep(1)                                   # gentle on NASA's server
    except Exception as e:
        print(f'DONKI not read, previous archive kept: {e}')
        return 1
    save('archive.json', {'updated': dt.datetime.now(UTC).strftime('%Y-%m-%dT%H:%M:%SZ'),
                          'months': [months[k] for k in sorted(months)]})
    print(f'archive.json written ({len(months)} months from {min(months)})')
    return 0


if __name__ == '__main__':
    part = sys.argv[1] if len(sys.argv) > 1 else 'latest'
    sys.exit(run_latest() if part == 'latest' else run_archive() if part == 'archive' else 2)
