#!/usr/bin/env python3
# NASA and ESA Data Projects · Exoplanets · real measurements for the methods pages · © 2026 Malcolm Syme ·
# mcsyme11@gmail.com
#
# Writes, in exoplanets/data/series/ (built once; rebuilt only when a target is added):
#   <key>.json      one measurement each:
#                   transits      Kepler or TESS light curves of a star, cut around each transit, each transit divided
#                                 by a straight line fitted to the light just before and after it, then folded on the
#                                 planet's period and averaged into bins (the dip measured from those bins)
#                   radial velocity  a star's published velocities, folded on the planet's period, with the wobble's
#                                 size K fitted to them (a sine curve: the orbit taken as circular)
#                   microlensing  a published light curve of a microlensing event, as the observers measured it
#   index.json      what was built, in order, for the pages
#
# Sources (no key):
#   Light curves   MAST (Mikulski Archive for Space Telescopes, STScI, run for NASA), through astroquery:
#                  TESS 2-minute light curves from the SPOC pipeline (PDCSAP flux); Kepler long-cadence light curves
#                  (PDCSAP flux)
#   CHEOPS         ESA's CHEOPS light curves (the CHEOPS Data Reduction Pipeline, default aperture), public data from
#                  DACE, the Data & Analysis Center for Exoplanets of the University of Geneva, through the dace-query
#                  package in public mode (no account or key); approved Nov 19, 2026
#   Ephemerides    NASA Exoplanet Archive TAP service, table pscomppars (period, mid-transit time, duration, depth)
#   Velocities and microlensing curves   NASA Exoplanet Archive time series, listed by its bulk-download scripts
#                  https://exoplanetarchive.ipac.caltech.edu/bulk_data_download/ (wget_RADIAL.bat, wget_MICROLENSING.bat)
# Each target is built on its own: one that fails keeps its previous file and the others go on.
#
# Run by hand:  pip install numpy astropy astroquery dace-query
#               python3 exoplanets/tools/build_series.py            (about 10 to 20 minutes; downloads about 300 MB)
#               python3 exoplanets/tools/build_series.py --only KEY  one target
import argparse
import datetime as dt
import json
import math
import os
import re
import sys
import tempfile
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'series')
TAP = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync'
BULK = 'https://exoplanetarchive.ipac.caltech.edu/bulk_data_download/'
UA = {'User-Agent': 'NASA-and-ESA-Data-Projects/1.0 (exoplanets)'}

# The transit targets, in the order the page offers them. A "group" holds alternatives: the first that builds is used.
TRANSITS = [
    {'key': 'hot-jupiter', 'group': [('HD 209458 b', 'HD 209458', 'TESS'), ('HD 189733 b', 'HD 189733', 'TESS'),
                                     ('WASP-18 b', 'WASP-18', 'TESS')], 'files': 6},
    {'key': 'kepler-10b', 'group': [('Kepler-10 b', 'Kepler-10', 'Kepler')], 'files': 8},
    {'key': 'toi-700d', 'group': [('TOI-700 d', 'TOI-700', 'TESS')], 'files': 30},
    # ESA's CHEOPS: a planet it studied in detail (WASP-189 b, Lendl et al. 2020); "files" counts its visits
    {'key': 'cheops', 'group': [('WASP-189 b', 'WASP-189', 'CHEOPS'), ('KELT-11 b', 'KELT-11', 'CHEOPS'),
                                ('WASP-76 b', 'WASP-76', 'CHEOPS')], 'files': 12},
]
# 51 Peg b: the first planet found around a star like the Sun (Mayor & Queloz 1995). HIP 113357 names its files.
RV = {'key': 'rv-51peg', 'planet': '51 Peg b', 'uid': 'UID_0113357'}
# well-known planetary microlensing events, tried in this order
MICRO = {'key': 'microlensing', 'events': ['OGLE-2005-BLG-390', 'OGLE-2005-BLG-071', 'OGLE-2003-BLG-235',
                                           'MOA-2007-BLG-192', 'OGLE-2006-BLG-109', 'MOA-2009-BLG-266'],
         'max_files': 150}

NOW = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def get(url, timeout=120):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def tap(q):
    return json.loads(get(TAP + '?' + urllib.parse.urlencode({'query': q, 'format': 'json'})).decode('utf-8'))


def ephemeris(planet):
    rows = tap("select pl_name,pl_orbper,pl_tranmid,pl_trandur,pl_trandep,pl_rade,st_rad,pl_rvamp,disc_year,"
               "disc_facility,discoverymethod from pscomppars where pl_name='%s'" % planet.replace("'", "''"))
    if not rows:
        raise ValueError('%s not in the archive' % planet)
    return rows[0]


def save(key, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, key + '.json'), 'w', encoding='utf-8') as fh:
        json.dump(obj, fh, separators=(',', ':'), allow_nan=False, ensure_ascii=False)
        fh.write('\n')
    print('  wrote series/%s.json' % key)


# ---------------------------------------------------------------- transits (MAST and DACE)
SOURCES = {
    'TESS': 'NASA TESS light curves (SPOC 2-minute PDCSAP flux), from MAST at STScI; ephemeris from the NASA '
            'Exoplanet Archive',
    'Kepler': 'NASA Kepler light curves (long-cadence PDCSAP flux), from MAST at STScI; ephemeris from the NASA '
              'Exoplanet Archive',
    'CHEOPS': 'ESA CHEOPS light curves (CHEOPS Data Reduction Pipeline, default aperture), from DACE at the '
              'University of Geneva; ephemeris from the NASA Exoplanet Archive',
}


def mast_curves(star, mission, nfiles):
    """Kepler or TESS light curves from MAST: a list of (file name, times in BJD, flux), good points only."""
    import numpy as np
    from astropy.io import fits
    from astroquery.mast import Observations
    if mission == 'TESS':
        obs = Observations.query_criteria(objectname=star, radius='0.005 deg', obs_collection='TESS',
                                          dataproduct_type='timeseries', provenance_name='SPOC', t_exptime=120)
        sub = ['LC']
    else:
        obs = Observations.query_criteria(objectname=star, radius='0.005 deg', obs_collection='Kepler',
                                          dataproduct_type='timeseries')
        sub = ['LLC']
    if len(obs) == 0:
        raise ValueError('no %s light curves at MAST' % mission)
    prods = Observations.filter_products(Observations.get_product_list(obs), productSubGroupDescription=sub,
                                         extension='fits')
    if len(prods) == 0:
        raise ValueError('no %s light-curve files at MAST' % mission)
    prods.sort('obs_id')
    prods = prods[:nfiles]
    tmp = tempfile.mkdtemp(prefix='lc-')
    man = Observations.download_products(prods, download_dir=tmp, cache=False)
    out = []
    for path in man['Local Path']:
        if not path or not os.path.exists(path):
            continue
        with fits.open(path) as h:
            hd = h[1].header
            ref = hd.get('BJDREFI', 0) + hd.get('BJDREFF', 0)
            d = h[1].data
            t = np.array(d['TIME'], float) + ref
            f = np.array(d['PDCSAP_FLUX'], float)
            q = np.array(d['QUALITY' if 'QUALITY' in h[1].columns.names else 'SAP_QUALITY'], int)
        ok = np.isfinite(t) & np.isfinite(f) & (q == 0)
        out.append((os.path.basename(path), t[ok], f[ok]))
    return out


def cheops_curves(star, nvisits):
    """CHEOPS light curves from DACE (public data, no key): a list of (visit, times in BJD, flux), one per visit,
    good points only. DACE's column names are found by what they contain and printed, so a change shows in the log."""
    import numpy as np
    from dace_query.cheops import Cheops
    raw = Cheops.get_lightcurve(star, aperture='default', output_format='numpy')
    if not raw:
        raise ValueError('no CHEOPS light curves at DACE for %s' % star)
    cols = {k: np.asarray(v) for k, v in raw.items()}
    print('  DACE columns: %s' % ', '.join(sorted(cols)))

    def find(*want, avoid=()):
        for k in sorted(cols):
            low = k.lower()
            if all(w in low for w in want) and not any(a in low for a in avoid):
                return k
        return None
    # DACE's names (checked Nov 19, 2026): obj_date_bjd_vect, photom_flux_vect (the pipeline's corrected flux; not
    # photom_flux_raw_vect), photom_event_vect (every flag together; 0 is a good point), file_key (the visit)
    kt = ('obj_date_bjd_vect' if 'obj_date_bjd_vect' in cols else None) or find('bjd') or find('time', avoid=('exp',))
    kf = ('photom_flux_vect' if 'photom_flux_vect' in cols else None) or \
        find('flux', avoid=('err', 'raw', 'bad', 'bg', 'background', 'contam', 'conta', 'smear'))
    if not (kt and kf):
        raise ValueError('time or flux column not found among DACE columns')
    t = cols[kt].astype(float)
    f = cols[kf].astype(float)
    if np.nanmedian(t) < 2.4e6:                   # a reduced BJD (days since 2,400,000) made whole
        t = t + 2400000.0
    ok = np.isfinite(t) & np.isfinite(f) & (f > 0)
    kflag = 'photom_event_vect' if 'photom_event_vect' in cols else find('status')
    if kflag is not None:                          # the pipeline's flags: 0 is a good point
        ok &= cols[kflag].astype(float) == 0
    print('  using %s, %s, flags %s' % (kt, kf, kflag))
    kv = find('file_key') or find('visit') or find('filekey')
    visits = cols[kv].astype(str) if kv else None
    if visits is None:                             # no visit column: a gap of more than a day starts a new visit
        order = np.argsort(t)
        cut = np.concatenate([[0], np.cumsum(np.diff(t[order]) > 1)])
        visits = np.empty(t.size, dtype=object)
        visits[order] = cut.astype(str)
    out = []
    for v in sorted(set(visits[ok])):
        m = ok & (visits == v)
        o = np.argsort(t[m])
        out.append((str(v), t[m][o], f[m][o]))
    print('  %d CHEOPS visits, %d good points' % (len(out), sum(c[1].size for c in out)))
    return out


def transit(target):
    import numpy as np

    last = None
    for planet, star, mission in target['group']:
        try:
            e = ephemeris(planet)
            P, T0, dur = e['pl_orbper'], e['pl_tranmid'], e['pl_trandur']
            if not (P and T0 and dur):
                raise ValueError('no period, mid-transit time or duration in the archive')
            curves = cheops_curves(star, target['files']) if mission == 'CHEOPS' else \
                mast_curves(star, mission, target['files'])
            win = 1.5 * dur / 24 + 1.5 / 24          # days either side of mid-transit
            half_in = 0.6 * dur / 24                 # treated as "in transit" for the straight-line fit
            # the share of a window that must be measured: CHEOPS's light is cut by the Earth for part of each
            # 99-minute orbit, so less of it is covered than by Kepler or TESS
            cover = 0.4 if mission == 'CHEOPS' else 0.6
            dts, fs, files, epochs, cads = [], [], [], set(), []
            for name, t, f in curves:
                if t.size == 0 or len(files) >= target['files']:
                    continue
                before = len(epochs)
                # how many points make a whole transit depends on how often the telescope measures (TESS: every 2
                # minutes; Kepler's long cadence: every 29.4 minutes; CHEOPS: under a minute)
                cad = float(np.median(np.diff(t))) if t.size > 1 else 0.02
                cads.append(cad)
                need = max(8, int(cover * 2 * win / cad))
                side, inside = max(3, need // 4), max(1, int(0.5 * 2 * half_in / cad))
                n0, n1 = math.ceil((t.min() - T0) / P - 0.5), math.floor((t.max() - T0) / P + 0.5)
                for n in range(n0, n1 + 1):
                    tc = T0 + n * P
                    m = np.abs(t - tc) < win
                    if m.sum() < need:
                        continue
                    x, y = t[m] - tc, f[m]
                    oot = np.abs(x) > half_in
                    if (oot & (x < 0)).sum() < side or (oot & (x > 0)).sum() < side or (~oot).sum() < inside:
                        continue                     # a gap: the transit is not covered on both sides
                    c = np.polyfit(x[oot], y[oot], 1)
                    dts.append(x * 24)
                    fs.append(y / np.polyval(c, x))
                    epochs.add(n)
                if mission != 'CHEOPS' or len(epochs) > before:
                    files.append(name)           # CHEOPS: only the visits that caught a transit are counted
            if len(epochs) < 2:
                raise ValueError('fewer than two whole transits in the light curves')
            x, y = np.concatenate(dts), np.concatenate(fs)
            # clip outliers (cosmic rays, flares) at 5 times the scatter outside the transit
            sd = 1.4826 * np.median(np.abs(y[np.abs(x) > half_in * 24] - 1))
            deep = (e['pl_trandep'] or 2.0) / 100     # the archive's depth, in percent
            keep = (y < 1 + 5 * sd) & (y > 1 - 1.5 * deep - 5 * sd)
            x, y = x[keep], y[keep]
            nb = 64
            edges = np.linspace(-win * 24, win * 24, nb + 1)
            bins = []
            for i in range(nb):
                m = (x >= edges[i]) & (x < edges[i + 1])
                if m.sum() >= 3:
                    bins.append([round(float((edges[i] + edges[i + 1]) / 2), 3), round(float(np.mean(y[m])), 7),
                                 round(float(np.std(y[m]) / math.sqrt(m.sum())), 7)])
            core = [b[1] for b in bins if abs(b[0]) < 0.25 * dur]
            depth = 1 - float(np.median(core)) if core else None
            rng = np.random.default_rng(1)
            pick = rng.choice(x.size, size=min(1500, x.size), replace=False)
            pts = sorted([round(float(x[i]), 3), round(float(y[i]), 6)] for i in pick)
            obj = {'updated': NOW, 'kind': 'transit', 'planet': planet, 'star': star, 'mission': mission,
                   'period_d': P, 't0_bjd': T0, 'duration_h': dur, 'depth_archive_pct': e['pl_trandep'],
                   'radius_earth': e['pl_rade'], 'star_radius_sun': e['st_rad'],
                   'depth_measured': round(depth, 7) if depth is not None else None, 'scatter': round(float(sd), 7),
                   'transits': len(epochs), 'points_total': int(x.size), 'files': len(files),
                   'cadence_min': round(float(np.median(cads)) * 1440, 2),
                   'source': SOURCES[mission],
                   'points': pts, 'bins': bins}
            save(target['key'], obj)
            return {'key': target['key'], 'kind': 'transit', 'planet': planet, 'mission': mission}
        except Exception as ex:  # try the next planet of the group
            last = '%s: %s' % (planet, ex)
            print('  %s' % last)
    raise RuntimeError(last or 'nothing built')


# ---------------------------------------------------------------- IPAC tables (the archive's time series)
def ipac(text):
    """Keywords (\\NAME = value) and rows of an IPAC table, as dicts by lower-case column name."""
    kw, names, rows = {}, None, []
    for line in text.splitlines():
        if line.startswith('\\'):
            m = re.match(r"\\(\w+)\s*=\s*(.*?)\s*$", line)
            if m:
                kw[m.group(1).upper()] = m.group(2).strip().strip('"\'').strip()
        elif line.startswith('|'):
            if names is None:
                names = [c.strip().lower() for c in line.strip().strip('|').split('|')]
        elif line.strip() and names:
            parts = line.split()
            if len(parts) == len(names):
                rows.append(dict(zip(names, parts)))
    return kw, names or [], rows


def bulk_urls(script):
    text = get(BULK + script, timeout=180).decode('utf-8', 'replace')
    return re.findall(r"(https?://[^\s'\"]+\.tbl)", text)


def col(names, *want):
    for w in want:
        for n in names:
            if re.fullmatch(w, n):
                return n
    return None


def num(v):
    try:
        x = float(v)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def radial_velocity():
    e = ephemeris(RV['planet'])
    P = e['pl_orbper']
    urls = [u for u in bulk_urls('wget_RADIAL.bat') if RV['uid'] in u]
    if not urls:
        raise ValueError('no velocity files for %s in wget_RADIAL.bat' % RV['uid'])
    best = None
    for u in urls:
        kw, names, rows = ipac(get(u).decode('utf-8', 'replace'))
        tc = col(names, r'.*jd.*', r'time')
        vc = col(names, r'radial_velocity', r'rv', r'.*velocity')
        ec = col(names, r'radial_velocity_unc.*', r'.*velocity.*unc.*', r'.*err.*', r'.*unc.*')
        if not (tc and vc):
            continue
        data = [(num(r[tc]), num(r[vc]), num(r[ec]) if ec else None) for r in rows]
        data = [d for d in data if d[0] is not None and d[1] is not None]
        if best is None or len(data) > len(best[2]):
            best = (u, kw, data)
    if not best or len(best[2]) < 20:
        raise ValueError('no velocity file with at least 20 points')
    u, kw, data = best
    import numpy as np
    t = np.array([d[0] for d in data])
    v = np.array([d[1] for d in data])
    err = np.array([d[2] if d[2] is not None else np.nan for d in data])
    if np.nanmedian(np.abs(v - np.median(v))) < 1:   # km/s → m/s
        v, err = v * 1000, err * 1000
    w = 2 * math.pi / P
    A = np.column_stack([np.sin(w * t), np.cos(w * t), np.ones_like(t)])
    (a, b, g), *_ = np.linalg.lstsq(A, v, rcond=None)
    K = math.hypot(a, b)
    # phase 0 where the star moves fastest away from us (velocity at its peak): a·sin + b·cos = K·sin(wt + φ)
    phi = math.atan2(b, a)
    t_peak = (math.pi / 2 - phi) / w
    ph = ((t - t_peak) / P) % 1.0
    resid = v - (a * np.sin(w * t) + b * np.cos(w * t) + g)
    pts = sorted([round(float(ph[i]), 4), round(float(v[i] - g), 2), None if not np.isfinite(err[i]) else round(float(err[i]), 2)]
                 for i in range(t.size))
    obj = {'updated': NOW, 'kind': 'rv', 'planet': RV['planet'], 'star': kw.get('STAR_ID') or '51 Peg',
           'reference': kw.get('REFERENCE') or kw.get('REF') or None, 'period_d': P, 'k_fitted': round(K, 2),
           'k_archive': e['pl_rvamp'], 'rms': round(float(np.std(resid)), 2), 'points_total': int(t.size),
           'span_days': round(float(t.max() - t.min()), 1), 'file': u.rsplit('/', 1)[-1],
           'source': 'NASA Exoplanet Archive, published radial-velocity time series', 'points': pts}
    save(RV['key'], obj)
    return {'key': RV['key'], 'kind': 'rv', 'planet': RV['planet']}


def microlensing():
    urls = bulk_urls('wget_MICROLENSING.bat')
    if not urls:
        raise ValueError('no files in wget_MICROLENSING.bat')
    want = [re.sub(r'\W', '', x).upper() for x in MICRO['events']]
    # file names often carry the event name; those are read first
    named = [u for u in urls if any(w in re.sub(r'\W', '', u).upper() for w in want)]
    order = named + [u for u in urls if u not in named]
    found = {}
    for u in order[:MICRO['max_files']]:
        try:
            kw, names, rows = ipac(get(u).decode('utf-8', 'replace'))
        except Exception:
            continue
        sid = re.sub(r'\W', '', (kw.get('STAR_ID') or kw.get('OBJECT') or '') + (kw.get('EVENT') or '')).upper()
        hit = next((i for i, w in enumerate(want) if w in sid or w in re.sub(r'\W', '', u).upper()), None)
        if hit is None:
            continue
        tc = col(names, r'.*jd.*', r'time')
        mc = col(names, r'mag', r'.*mag.*', r'flux', r'.*flux.*')
        ec = col(names, r'.*mag.*err.*', r'.*err.*', r'.*unc.*')
        if not (tc and mc):
            continue
        data = [(num(r[tc]), num(r[mc]), num(r[ec]) if ec else None) for r in rows]
        data = [d for d in data if d[0] is not None and d[1] is not None]
        if len(data) >= 50 and (hit not in found or len(data) > len(found[hit][2])):
            found[hit] = (u, kw, data, 'mag' if 'mag' in mc else 'flux')
        if 0 in found:
            break
    if not found:
        raise ValueError('none of the listed events found in the first %d files' % MICRO['max_files'])
    i = min(found)
    u, kw, data, kind = found[i]
    data.sort()
    peak = min(data, key=lambda d: d[1]) if kind == 'mag' else max(data, key=lambda d: d[1])
    pts = [[round(d[0] - peak[0], 4), round(d[1], 4), None if d[2] is None else round(d[2], 4)] for d in data]
    obj = {'updated': NOW, 'kind': 'microlensing', 'event': MICRO['events'][i], 'star': kw.get('STAR_ID'),
           'observatory': kw.get('OBSERVATORY') or kw.get('TELESCOPE'), 'band': kw.get('BANDPASS') or kw.get('FILTER'),
           'reference': kw.get('REFERENCE') or kw.get('REF'), 'peak_jd': peak[0], 'values': kind,
           'points_total': len(pts), 'file': u.rsplit('/', 1)[-1],
           'source': 'NASA Exoplanet Archive, published microlensing light curve', 'points': pts}
    save(MICRO['key'], obj)
    return {'key': MICRO['key'], 'kind': 'microlensing', 'event': MICRO['events'][i]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', help='build one target (its key)')
    args = ap.parse_args()
    jobs = [(t['key'], (lambda t=t: transit(t))) for t in TRANSITS] + [(RV['key'], radial_velocity),
                                                                       (MICRO['key'], microlensing)]
    try:
        with open(os.path.join(OUT, 'index.json'), encoding='utf-8') as fh:
            prev = {x['key']: x for x in json.load(fh)['series']}
    except (OSError, ValueError, KeyError):
        prev = {}
    built, failed = [], []
    for key, fn in jobs:
        if args.only and key != args.only:
            if key in prev:
                built.append(prev[key])
            continue
        print(key)
        try:
            built.append(fn())
        except Exception as ex:
            failed.append(key)
            print('  %s: not built (%s); its previous file, if any, is kept' % (key, ex))
            if key in prev:
                built.append(prev[key])
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as fh:
        json.dump({'updated': NOW, 'series': built}, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    print('built: %s; failed: %s' % (', '.join(x['key'] for x in built) or 'none', ', '.join(failed) or 'none'))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
