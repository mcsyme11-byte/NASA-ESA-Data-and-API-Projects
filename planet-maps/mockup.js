/* NASA and ESA Data Projects · Planetary Maps · mock-up for approval · © 2026 Malcolm Syme · mcsyme11@gmail.com
 *
 * The Moon and Mars on NASA's Trek map tiles (equirectangular, 256-pixel tiles, level z is 2^(z+1) × 2^z tiles), with
 * sample places, and the rovers' routes read live from NASA/JPL's "Where is the rover?" files. In the real page the
 * routes come from a daily copy (planet-maps/data/routes.json) and the places from the official name lists.
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const T = 'https://trek.nasa.gov/tiles/';
  const tile = (body, layer, ext) => `${T}${body}/EQ/${layer}/1.0.0/default/default028mm/{z}/{y}/{x}.${ext}`;

  /* ---------- the maps (docs/DATA-SOURCES.md, "Planetary Maps") ---------- */
  const LAYERS = {
    mars: [
      { id: 'photo', name: 'Colour photo', note: 'The Viking orbiters, 232 m a pixel', url: tile('Mars', 'Mars_Viking_MDIM21_ClrMosaic_global_232m', 'jpg'), max: 7,
        credit: 'Viking: NASA/JPL/USGS.' },
      { id: 'height', name: 'Height', note: 'Laser altimeter (MOLA), 463 m a pixel', url: tile('Mars', 'Mars_MGS_MOLA_ClrShade_merge_global_463m', 'jpg'), max: 7,
        credit: 'MOLA: NASA/JPL/GSFC.' },
      { id: 'sharp', name: 'Height, sharper', note: 'MOLA with ESA Mars Express (HRSC), 200 m a pixel', url: tile('Mars', 'Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw', 'jpg'), max: 8,
        credit: 'MOLA: NASA/JPL/GSFC. HRSC: ESA/DLR/FU Berlin, CC BY-SA 3.0 IGO.' }],
    moon: [
      { id: 'photo', name: 'Photo', note: 'LRO Wide Angle Camera, 100 m a pixel', url: tile('Moon', 'LRO_WAC_Mosaic_Global_303ppd_v02', 'jpg'), max: 8,
        credit: 'LRO: NASA/GSFC/Arizona State University.' },
      { id: 'height', name: 'Height', note: 'LRO laser altimeter (LOLA), 237 m a pixel', url: tile('Moon', 'LRO_LOLA_ClrShade_Global_128ppd_v04', 'png'), max: 5,
        credit: 'LOLA: NASA/GSFC.' }]
  };
  /* close-ups: [layer, format, last level, [west, south, east, north]] */
  const CLOSE = {
    mars: [['JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0', 'png', 13, [77.1605, 18.2110, 77.6992, 18.7212]],
           ['JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd', 'png', 17, [77.2229, 18.3068, 77.5840, 18.6693]],
           ['Gale_CTX_BlockAdj_dd', 'png', 12, [135.1843, -6.5733, 139.2413, -2.8078]]],
    moon: [['LRO_NAC_Apollo11_Mosaic_p', 'png', 15, [23.4485, 0.1464, 23.5397, 1.1149]],
           ['LRO_NAC_Apollo12_Mosaic_p', 'png', 16, [-23.4445, -3.4716, -23.3575, -2.5022]],
           ['LRO_NAC_Apollo15_Mosaic_p', 'png', 16, [3.5805, 25.7964, 3.6894, 26.7635]],
           ['LRO_NAC_Apollo16_Mosaic_p', 'png', 14, [15.3788, -9.6061, 15.5545, -8.6617]],
           ['M129086118.nd.gcs', 'png', 15, [30.6859, 20.0288, 30.8445, 20.3660]]]
  };

  /* ---------- sample places: [id, name, kind, latitude, longitude (east), group] ---------- */
  const PLACES = {
    mars: [
      ['jezero', 'Jezero Crater', 'Crater · Perseverance, 2021', 18.44, 77.45, 'land'],
      ['gale', 'Gale Crater', 'Crater · Curiosity, 2012', -5.37, 137.81, 'land'],
      ['olympus', 'Olympus Mons', 'Volcano', 18.65, -133.8, 'volc'],
      ['vm', 'Valles Marineris', 'Canyon', -13.9, -59.2, 'valley'],
      ['hellas', 'Hellas Planitia', 'Impact basin', -42.4, 70.5, 'crater'],
      ['v1', 'Viking 1', 'Lander, 1976', 22.27, -47.95, 'land'], ['v2', 'Viking 2', 'Lander, 1976', 47.64, 134.29, 'land'],
      ['mpf', 'Mars Pathfinder', 'Lander and rover, 1997', 19.13, -33.22, 'land'],
      ['spirit', 'Spirit', 'Rover, 2004', -14.57, 175.47, 'land'], ['opp', 'Opportunity', 'Rover, 2004', -1.95, -5.53, 'land'],
      ['phx', 'Phoenix', 'Lander, 2008', 68.22, -125.75, 'land'], ['insight', 'InSight', 'Lander, 2018', 4.50, 135.62, 'land'],
      ['zhurong', 'Zhurong (CNSA)', 'Rover, 2021', 25.07, 109.93, 'land'],
      ['arsia', 'Arsia Mons', 'Volcano', -8.26, -120.09, 'volc'], ['pavonis', 'Pavonis Mons', 'Volcano', 1.48, -112.96, 'volc'],
      ['ascraeus', 'Ascraeus Mons', 'Volcano', 11.92, -104.08, 'volc'], ['elysium', 'Elysium Mons', 'Volcano', 24.8, 146.9, 'volc']],
    moon: [
      ['a11', 'Apollo 11', 'Landing site, 1969', 0.674, 23.473, 'land'], ['a12', 'Apollo 12', 'Landing site, 1969', -3.01, -23.42, 'land'],
      ['a14', 'Apollo 14', 'Landing site, 1971', -3.65, -17.47, 'land'], ['a15', 'Apollo 15', 'Landing site, 1971', 26.13, 3.63, 'land'],
      ['a16', 'Apollo 16', 'Landing site, 1972', -8.97, 15.50, 'land'], ['a17', 'Apollo 17', 'Landing site, 1972', 20.19, 30.77, 'land'],
      ['ce4', 'Chang’e 4 (CNSA)', 'Far-side landing, 2019', -45.44, 177.6, 'land'],
      ['tycho', 'Tycho', 'Crater', -43.3, -11.36, 'crater'], ['copernicus', 'Copernicus', 'Crater', 9.62, -20.08, 'crater'],
      ['shackleton', 'Shackleton', 'Crater at the south pole', -89.67, 129.8, 'crater'],
      ['tranq', 'Mare Tranquillitatis', 'Lava plain (a "sea")', 8.5, 31.4, 'valley']]
  };
  const INFO = {
    jezero: { facts: [['Where', '18.4° N, 77.5° E'], ['Size', '45 km across'], ['Visited by', 'Perseverance and the Ingenuity helicopter, since February 18, 2021'], ['Sharpest map', '25 cm a pixel (HiRISE), zoom in']],
      text: 'A crater that held a lake about 3.5 billion years ago. A river flowed in through a gap in the western rim and left a fan of mud and sand, the delta: the reason Perseverance was sent here. Rocks from the delta, which could hold signs of ancient life, are sealed in sample tubes.',
      rover: 'per', links: [['Weather at Jezero (Mars Data)', '../mars-data/charts/#craters']],
      esa: 'In the page: ESA Mars Express’s picture of the crater and its delta, ESA/DLR/FU Berlin, CC BY-SA 3.0 IGO.' },
    gale: { facts: [['Where', '5.4° S, 137.8° E'], ['Size', '154 km across'], ['Visited by', 'Curiosity, since August 6, 2012'], ['Sharpest map', 'About 6 m a pixel (CTX), zoom in']],
      text: 'A huge crater with a mountain 5 km high in the middle, Aeolis Mons ("Mount Sharp"), built of layers laid down in lakes and later by wind. Curiosity is climbing it layer by layer, reading the history of Mars’ climate like the pages of a book.',
      rover: 'cur', links: [['Weather at Gale (Mars Data)', '../mars-data/charts/#craters']],
      esa: 'In the page: ESA Mars Express’s picture of the crater, ESA/DLR/FU Berlin, CC BY-SA 3.0 IGO.' },
    olympus: { facts: [['Where', '18.7° N, 133.8° W'], ['Size', 'About 600 km across and 22 km high']],
      text: 'The tallest volcano in the solar system, about two and a half times the height of Mount Everest above sea level. It is so wide and its slopes so gentle that someone standing on the top would not see that they were on a mountain.' },
    a11: { facts: [['Where', '0.67° N, 23.47° E'], ['When', 'July 20, 1969'], ['Crew on the surface', 'Neil Armstrong and Buzz Aldrin'], ['Sharpest map', 'About 0.5 m a pixel (LRO), zoom in']],
      text: 'The first landing by people, in the Sea of Tranquillity. The close-up from the Lunar Reconnaissance Orbiter shows the descent stage of the lunar module Eagle, still standing where it landed.' }
  };

  /* ---------- the map ---------- */
  const res = z => 360 / (256 * 2 ** (z + 1));
  const grid = max => new ol.tilegrid.TileGrid({ extent: [-180, -90, 180, 90], origin: [-180, 90], tileSize: 256,
    resolutions: Array.from({ length: max + 1 }, (_, z) => res(z)) });
  const source = (url, max) => new ol.source.XYZ({ projection: 'EPSG:4326', tileGrid: grid(max), url, wrapX: false, crossOrigin: 'anonymous' });
  const font = (px, bold) => `${bold ? 'bold ' : ''}${px}px Georgia, "Palatino Linotype", serif`;
  const label = (text, colour, dy, bold) => new ol.style.Text({ text, offsetY: dy, font: font(12.5, bold),
    fill: new ol.style.Fill({ color: colour }), stroke: new ol.style.Stroke({ color: '#0C1119', width: 3 }) });

  const base = new ol.layer.Tile({ preload: 1 });
  const close = new ol.layer.Group({ minZoom: 7 });
  const routeSrc = new ol.source.Vector({ wrapX: false });
  const routes = new ol.layer.Vector({ source: routeSrc,
    style: f => f.get('here') ? new ol.style.Style({ image: new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: f.get('c') }), stroke: new ol.style.Stroke({ color: '#0C1119', width: 2 }) }),
      text: label(f.get('here'), f.get('c'), 16) }) : new ol.style.Style({ stroke: new ol.style.Stroke({ color: f.get('c'), width: 2.5 }) }) });
  const placeSrc = new ol.source.Vector({ wrapX: false });
  const S = { body: 'mars', layer: 'photo', sel: 'jezero', on: { land: true, route: true, crater: true, volc: true, valley: true, grid: false } };
  const places = new ol.layer.Vector({ source: placeSrc, declutter: true, style: f => {
    const k = f.get('k'), sel = f.get('id') === S.sel;
    return new ol.style.Style({
      image: new ol.style.RegularShape({ points: k === 'land' ? 4 : k === 'volc' ? 3 : 30, radius: sel ? 8 : 6,
        fill: new ol.style.Fill({ color: k === 'land' ? '#C0A062' : 'rgba(0,0,0,0)' }),
        stroke: new ol.style.Stroke({ color: sel ? '#E2C88E' : k === 'land' ? '#0C1119' : '#EDE6D3', width: sel ? 2.5 : 1.6 }) }),
      text: label(f.get('n'), sel ? '#E2C88E' : '#EDE6D3', -14, sel) });
  } });
  const lbl = o => new ol.style.Text(Object.assign({ font: font(11), fill: new ol.style.Fill({ color: '#EDE6D3' }), stroke: new ol.style.Stroke({ color: '#0C1119', width: 3 }) }, o));
  const graticule = new ol.layer.Graticule({ strokeStyle: new ol.style.Stroke({ color: 'rgba(237,230,211,.25)', width: 1 }), showLabels: true, visible: false,
    lonLabelStyle: lbl({ textBaseline: 'bottom' }), latLabelStyle: lbl({ textAlign: 'end' }) });
  const view = new ol.View({ projection: 'EPSG:4326', center: [0, 0], zoom: 1, extent: [-180, -90, 180, 90], showFullExtent: false, maxZoom: 18 });
  const map = new ol.Map({ target: 'map', layers: [base, close, graticule, routes, places], view,
    controls: ol.control.defaults.defaults({ attribution: false, rotate: false }) });

  /* the whole world fills the frame: wide frames show it all, narrow ones (phones) let it pan sideways */
  /* the smallest zoom keeps the frame filled; a resize keeps the place and zoom, unless the frame would show empty space */
  function fill() {
    const [w, h] = map.getSize() || [0, 0]; if (!w || !h) return false;
    const r = Math.min(360 / w, 180 / h);
    view.setMinZoom(0); view.setMinZoom(view.getZoomForResolution(r));
    return true;
  }
  function home() { if (fill()) { view.setZoom(view.getMinZoom()); view.setCenter([0, 0]); } }
  let sized = false;
  new ResizeObserver(() => { map.updateSize(); if (!sized) { sized = fill(); if (sized) home(); } else fill(); }).observe($('map'));

  /* ---------- the rovers (live from NASA/JPL in the mock-up) ---------- */
  const R = {};
  async function loadRovers() {
    const gj = new ol.format.GeoJSON();
    for (const [k, m, c, name] of [['cur', 'MSL', '#E2C88E', 'Curiosity'], ['per', 'M20', '#8AA9C9', 'Perseverance']]) {
      try {
        const [t, w] = await Promise.all([`${m}_traverse`, `${m}_waypoints_current`].map(f =>
          fetch(`https://mars.nasa.gov/mmgis-maps/${m}/Layers/json/${f}.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })));
        const lines = gj.readFeatures(t); lines.forEach(f => f.set('c', c)); routeSrc.addFeatures(lines);
        const p = w.features[0].properties;
        R[k] = { name, km: (p.dist_total_m / 1000).toFixed(1), sol: p.sol, at: [p.lon, p.lat] };
        routeSrc.addFeature(new ol.Feature({ geometry: new ol.geom.Point([p.lon, p.lat]), here: `${name}, sol ${p.sol.toLocaleString('en')}`, c }));
      } catch (e) { R[k] = null; }
    }
    figures(); card();
    $('pRouteDate').textContent = 'NASA/JPL-Caltech' + (R.cur && R.per ? ` · Curiosity to sol ${R.cur.sol.toLocaleString('en')}, Perseverance to sol ${R.per.sol.toLocaleString('en')}` : '');
  }

  /* ---------- the page around the map ---------- */
  const fig = (label, value, note, id) => `<div class="tile"><div class="label">${label}</div><div class="value"${id ? ` id="${id}"` : ''}>${value}</div><div class="note"${id ? ` id="${id}N"` : ''}>${note}</div></div>`;
  function figures() {
    const rv = (r, site) => r ? [`${r.km} <small>km</small>`, `${site} · to sol ${r.sol.toLocaleString('en')}`] : ['–', site];
    $('pTiles').innerHTML = S.body === 'mars'
      ? fig('Size', '6,779 <small>km</small>', 'across · about half the Earth') + fig('Landers that worked', '10', 'since Viking 1, 1976')
        + fig('Curiosity has driven', ...rv(R.cur, 'Gale Crater')) + fig('Perseverance has driven', ...rv(R.per, 'Jezero Crater'))
      : fig('Size', '3,475 <small>km</small>', 'across · about a quarter of the Earth') + fig('People who walked on it', '12', 'Apollo 11 to 17, 1969–1972')
        + fig('Sharpest map', '0.5 <small>m</small>', 'a pixel, at the Apollo sites') + fig('Seen from Earth', '59 <small>%</small>', 'of the surface, over time');
  }
  const deg = (v, p, n) => `${Math.abs(v).toFixed(Math.abs(v) < 10 ? 2 : 1)}° ${v >= 0 ? p : n}`;
  function card() {
    const p = PLACES[S.body].find(x => x[0] === S.sel) || PLACES[S.body][0];
    const i = INFO[p[0]] || { facts: [['Where', `${deg(p[3], 'N', 'S')}, ${deg(p[4], 'E', 'W')}`]],
      text: 'In the page: a short explanation of what this place is, why it matters and what was found there.' };
    const r = i.rover && R[i.rover];
    $('pCard').innerHTML = `<div class="ph"><h3>${p[1]}</h3><span class="aside">${p[2]}</span></div>
      <div class="pb"><div class="split"><div><p>${i.text}</p>
        <p>${r ? `<button class="btn small" id="pGo">Zoom to ${r.name}</button> ` : `<button class="btn small" id="pGo">Zoom in</button> `}${(i.links || []).map(([t, h]) => `<a class="btn outline small" href="${h}">${t}</a>`).join(' ')}</p></div>
        <div><dl class="facts">${i.facts.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}${r ? `<dt>Now</dt><dd>Sol ${r.sol.toLocaleString('en')}, ${r.km} km driven</dd>` : ''}</dl>
        ${i.esa ? `<p class="caption">${i.esa}</p>` : ''}</div></div></div>`;
    /* a place with a close-up opens inside it (view zoom 13: about 5 m a pixel on the Moon, 10 m on Mars) */
    const at = r ? r.at : [p[4], p[3]];
    const sharp = CLOSE[S.body].some(([, , , b]) => at[0] >= b[0] && at[0] <= b[2] && at[1] >= b[1] && at[1] <= b[3]);
    $('pGo').onclick = () => view.animate({ center: at, zoom: r ? 15 : sharp ? 13 : Math.max(view.getZoom(), 6), duration: 900 });
  }
  function draw() {
    const list = LAYERS[S.body];
    if (!list.some(l => l.id === S.layer)) S.layer = list[0].id;
    const l = list.find(x => x.id === S.layer);
    base.setSource(source(l.url, l.max));
    close.setLayers(new ol.Collection(CLOSE[S.body].map(([name, ext, max, box]) =>
      new ol.layer.Tile({ source: source(tile(S.body === 'mars' ? 'Mars' : 'Moon', name, ext), max), extent: box }))));
    $('pLayers').innerHTML = list.map(x => `<button class="chip" aria-pressed="${x.id === S.layer}" data-l="${x.id}">${x.name}</button>`).join('');
    $('pLayerNote').textContent = `${l.note}. ` + (S.body === 'mars'
      ? 'Sharper pictures appear by themselves around Jezero (25 cm a pixel) and Gale (6 m).'
      : 'Sharper pictures appear by themselves at the Apollo 11, 12, 15, 16 and 17 sites (about 0.5 m a pixel).');
    $('pSrc').textContent = `Map tiles: NASA Solar System Treks (JPL). ${l.credit}`;
    placeSrc.clear();
    placeSrc.addFeatures(PLACES[S.body].filter(p => S.on[p[5]]).map(p =>
      new ol.Feature({ geometry: new ol.geom.Point([p[4], p[3]]), id: p[0], n: p[1], k: p[5] })));
    routes.setVisible(S.body === 'mars' && S.on.route);
    graticule.setVisible(S.on.grid);
    document.querySelectorAll('.tabs [data-b]').forEach(b => { const on = b.dataset.b === S.body; b.setAttribute('aria-pressed', on); b.setAttribute('aria-selected', on); });
    figures(); card();
  }
  function choose(id) {
    const p = PLACES[S.body].find(x => x[0] === id); if (!p) return;
    S.sel = id; places.changed(); card();
    view.animate({ center: [p[4], p[3]], zoom: Math.max(view.getZoom(), 4), duration: 700 });
  }

  document.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-b]'); if (!b || b.dataset.b === S.body) return;
    S.body = b.dataset.b; S.sel = S.body === 'mars' ? 'jezero' : 'a11'; draw(); home();
  });
  $('pLayers').addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (b) { S.layer = b.dataset.l; draw(); } });
  $('pOn').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    S.on[b.dataset.k] = !S.on[b.dataset.k]; b.setAttribute('aria-pressed', S.on[b.dataset.k]); draw();
  });
  $('pFind').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim().toLowerCase(); if (!q) return;
    for (const body of ['mars', 'moon']) {
      const p = PLACES[body].find(x => x[1].toLowerCase().includes(q));
      if (p) { if (body !== S.body) { S.body = body; draw(); home(); } choose(p[0]); return; }
    }
  });
  map.on('click', e => { const f = map.forEachFeatureAtPixel(e.pixel, f => f.get('id') ? f : null); if (f) choose(f.get('id')); });
  map.on('pointermove', e => { $('map').style.cursor = map.hasFeatureAtPixel(e.pixel, { layerFilter: l => l === places }) ? 'pointer' : ''; });

  draw(); home(); loadRovers();
})();
