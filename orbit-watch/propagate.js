// NASA and ESA Data Projects · Orbit Watch · positions of every object, worked out in a background worker
// © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Receives the objects' orbital elements (objects.json, CelesTrak's OMM fields) once, builds an SGP4 record for each
// (satellite.js, shared/vendor/, the same model as shared/sats.js) and then, whenever asked for a moment, sends back
// every object's position and velocity in the Earth-centred frame (TEME, km and km/s) as one Float32Array each.
// Objects whose model fails (an orbit already decayed, elements far too old) get NaN and are not drawn.
// Asked with { t }, it answers { t, pos, vel }; the page draws in between by moving each object along its velocity.

import * as sat from '../shared/vendor/satellite.min.js';

let recs = [];

function build(rows, f) {
  const at = (name) => f.indexOf(name);
  const I = { id: at('id'), name: at('name'), intl: at('intl'), epoch: at('epoch'), mm: at('mm'), ecc: at('ecc'), inc: at('inc'),
    raan: at('raan'), argp: at('argp'), ma: at('ma'), bstar: at('bstar'), mmdot: at('mmdot'), mmddot: at('mmddot') };
  recs = rows.map((r) => {
    try {
      const rec = sat.json2satrec({
        OBJECT_NAME: r[I.name], OBJECT_ID: r[I.intl], EPOCH: new Date(r[I.epoch]).toISOString().replace('Z', ''),
        MEAN_MOTION: r[I.mm], ECCENTRICITY: r[I.ecc], INCLINATION: r[I.inc], RA_OF_ASC_NODE: r[I.raan],
        ARG_OF_PERICENTER: r[I.argp], MEAN_ANOMALY: r[I.ma], EPHEMERIS_TYPE: 0, CLASSIFICATION_TYPE: 'U',
        NORAD_CAT_ID: r[I.id], ELEMENT_SET_NO: 999, REV_AT_EPOCH: 0, BSTAR: r[I.bstar],
        MEAN_MOTION_DOT: r[I.mmdot], MEAN_MOTION_DDOT: r[I.mmddot],
      });
      return rec && !rec.error ? rec : null;
    } catch { return null; }
  });
}

function step(t) {
  const n = recs.length, pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), d = new Date(t);
  for (let i = 0; i < n; i++) {
    const rec = recs[i];
    let p = null;
    if (rec) { try { p = sat.propagate(rec, d); } catch { p = null; } }
    if (p && p.position && Number.isFinite(p.position.x)) {
      pos[i * 3] = p.position.x; pos[i * 3 + 1] = p.position.y; pos[i * 3 + 2] = p.position.z;
      vel[i * 3] = p.velocity.x; vel[i * 3 + 1] = p.velocity.y; vel[i * 3 + 2] = p.velocity.z;
    } else {
      pos[i * 3] = pos[i * 3 + 1] = pos[i * 3 + 2] = NaN;
    }
  }
  postMessage({ t, pos, vel }, [pos.buffer, vel.buffer]);
}

onmessage = (e) => {
  const m = e.data;
  if (m.rows) { build(m.rows, m.f); postMessage({ ready: recs.length, failed: recs.filter((r) => !r).length }); }
  else if (m.t != null) step(m.t);
};
