// NASA and ESA Data Projects · Asteroid Tracker · data for the map and search · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// data/neos.json        every near-Earth asteroid's orbit (NASA/JPL Small-Body Database), refreshed daily
// data/spacecraft.json  spacecraft positions every few days (NASA/JPL Horizons), refreshed daily
// data/YYYY.json        this year's close approaches, for "this week's visitors"
// All three are written by fetch_close_approaches.py / fetch_map_data.py on GitHub Actions (JPL's APIs cannot be
// called from a web page).

let neosPromise = null;
// fresh (a reload button): read the file again, checking with the server for a newer copy
export function loadNeos({ fresh = false } = {}) {
  if (fresh) neosPromise = null;
  if (!neosPromise) neosPromise = fetch('data/neos.json', fresh ? { cache: 'no-cache' } : undefined).then((r) => { if (!r.ok) throw new Error('status ' + r.status); return r.json(); })
    .catch((e) => { neosPromise = null; throw e; });
  return neosPromise;
}

// The spacecraft positions and this week's visitors. With fresh (a reload button) each file is checked with the server
// for a newer copy and a file that cannot be read rejects; otherwise a missing file gives an empty list.
export async function loadExtras({ fresh = false } = {}) {
  const now = new Date(), y = now.getUTCFullYear();
  const day0 = Date.UTC(y, now.getUTCMonth(), now.getUTCDate()) - now.getUTCDay() * 86400000;   // Sunday of this week
  const get = (u, empty) => {
    const p = fetch(u, fresh ? { cache: 'no-cache' } : undefined).then((r) => { if (!r.ok) throw new Error('status ' + r.status); return r.json(); });
    return fresh ? p : p.catch(() => empty);
  };
  const [craft, year] = await Promise.all([get('data/spacecraft.json', { craft: [] }), get(`data/${y}.json`, { rows: [] })]);
  const visitors = year.rows.filter((r) => r[1] >= day0 && r[1] < day0 + 7 * 86400000).map((r) => r[5]);
  return { spacecraft: craft.craft || [], visitors };
}

export async function loadMapData() {
  const [neos, extras] = await Promise.all([loadNeos(), loadExtras()]);
  return { rows: neos.rows, updated: neos.updated, ...extras };
}
