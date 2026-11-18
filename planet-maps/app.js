/* NASA and ESA Data Projects · Planetary Maps · © 2026 Malcolm Syme · mcsyme11@gmail.com
 *
 * The Moon and Mars on NASA's Solar System Treks tiles (docs/DATA-SOURCES.md, "Planetary Maps"), in four views:
 *   Map    the whole world flat (equirectangular), on the shared flat map (shared/flatmap.js, OpenLayers). Trek's grid:
 *          256-pixel tiles from (-180°, 90°), level z is 2^(z+1) × 2^z tiles, so level 0 is 180/256 degrees a pixel
 *          (FlatMap.worldGrid with tileSize 256, topRes 180/256). OpenLayers' zoom is one more than Trek's level.
 *   North, South   looking straight down on a pole (polar stereographic, on each body's sphere, out to 65°): the same
 *          Trek tiles, reprojected by OpenLayers in the browser, so no other source is needed.
 *   Globe  the same tiles on a ball (globe.js, on shared/globe.js), loaded the first time it is chosen.
 *
 * Files: places.json (the marked places, written by hand), data/routes.json (the rovers' routes, copied daily by a
 * data job; the page works without it) and data/names-moon.json, data/names-mars.json (every official feature name,
 * for the search box; optional, built by tools/build_names.py).
 */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = n => reduce ? 0 : n;
  const nf = n => n.toLocaleString('en');
  const D2R = Math.PI / 180;

  /* ---------- the maps ---------- */
  const TREK = 'https://trek.nasa.gov/tiles/';
  const trek = (body, layer, ext) => `${TREK}${body}/EQ/${layer}/1.0.0/default/default028mm/{z}/{y}/{x}.${ext}`;
  const BODIES = {
    mars: {
      name: 'Mars', trek: 'Mars', home: 'jezero', radius: 3396190,          /* metres: the sphere of Trek's Mars maps */
      layers: [
        { id: 'photo', name: 'Photo', note: 'The Viking orbiters’ colour mosaic, 232 m a pixel.', layer: 'Mars_Viking_MDIM21_ClrMosaic_global_232m', ext: 'jpg', max: 7,
          credit: 'Viking colour mosaic: NASA/JPL/USGS.' },
        { id: 'height', name: 'Height', note: 'Mars Global Surveyor’s laser altimeter (MOLA), 463 m a pixel.', layer: 'Mars_MGS_MOLA_ClrShade_merge_global_463m', ext: 'jpg', max: 7,
          credit: 'MOLA: NASA/JPL/GSFC.' },
        { id: 'sharp', name: 'Sharper', note: 'Height, sharper: MOLA with ESA Mars Express’s stereo camera (HRSC), 200 m a pixel.', layer: 'Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw', ext: 'jpg', max: 8,
          credit: 'MOLA: NASA/JPL/GSFC. HRSC: ESA/DLR/FU Berlin, CC BY-SA 3.0 IGO.' }],
      /* close-ups: [Trek layer, format, last level, [west, south, east, north], label, credit], coarse to fine
         (bounding boxes from each layer's capabilities) */
      close: [
        ['JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0', 'png', 13, [77.1605, 18.2110, 77.6992, 18.7212], 'Jezero, 6 m a pixel (CTX)', 'NASA/JPL-Caltech/MSSS; mosaic: USGS.'],
        ['JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd', 'png', 17, [77.2229, 18.3068, 77.5840, 18.6693], 'Jezero’s floor and delta, 25 cm a pixel (HiRISE)', 'NASA/JPL-Caltech/University of Arizona; mosaic: USGS.'],
        ['Gale_CTX_BlockAdj_dd', 'png', 12, [135.1843, -6.5733, 139.2413, -2.8078], 'Gale, about 6 m a pixel (CTX)', 'NASA/JPL-Caltech/MSSS.']],
      note: 'Sharper pictures appear by themselves as you zoom in around Jezero (25 cm a pixel) and Gale (6 m).',
      stats: () => [
        ['Size', `6,779 <small>km</small>`, 'across · about half the Earth'],
        ['Landers that worked', '10', 'since Viking 1, 1976'],
        rover('curiosity', 'Curiosity has driven'), rover('perseverance', 'Perseverance has driven')]
    },
    moon: {
      name: 'the Moon', trek: 'Moon', home: 'apollo11', radius: 1737400,
      layers: [
        { id: 'photo', name: 'Photo', note: 'The Lunar Reconnaissance Orbiter’s Wide Angle Camera, 100 m a pixel.', layer: 'LRO_WAC_Mosaic_Global_303ppd_v02', ext: 'jpg', max: 8,
          credit: 'LRO Wide Angle Camera: NASA/GSFC/Arizona State University.' },
        { id: 'height', name: 'Height', note: 'The Lunar Reconnaissance Orbiter’s laser altimeter (LOLA), 237 m a pixel.', layer: 'LRO_LOLA_ClrShade_Global_128ppd_v04', ext: 'png', max: 5,
          credit: 'LOLA: NASA/GSFC.' }],
      close: [
        ['LRO_NAC_Apollo11_Mosaic_p', 'png', 15, [23.4485, 0.1464, 23.5397, 1.1149], 'Apollo 11, about 0.5 m a pixel (LRO)', 'NASA/GSFC/Arizona State University.'],
        ['LRO_NAC_Apollo12_Mosaic_p', 'png', 16, [-23.4445, -3.4716, -23.3575, -2.5022], 'Apollo 12, about 0.5 m a pixel (LRO)', 'NASA/GSFC/Arizona State University.'],
        ['LRO_NAC_Apollo15_Mosaic_p', 'png', 16, [3.5805, 25.7964, 3.6894, 26.7635], 'Apollo 15, about 0.5 m a pixel (LRO)', 'NASA/GSFC/Arizona State University.'],
        ['LRO_NAC_Apollo16_Mosaic_p', 'png', 14, [15.3788, -9.6061, 15.5545, -8.6617], 'Apollo 16, about 0.5 m a pixel (LRO)', 'NASA/GSFC/Arizona State University.'],
        ['M129086118.nd.gcs', 'png', 15, [30.6859, 20.0288, 30.8445, 20.3660], 'Apollo 17, about 0.5 m a pixel (LRO)', 'NASA/GSFC/Arizona State University.']],
      note: 'Sharper pictures appear by themselves as you zoom in at the Apollo 11, 12, 15, 16 and 17 sites (about 0.5 m a pixel).',
      stats: () => [
        ['Size', `3,475 <small>km</small>`, 'across · about a quarter of the Earth'],
        ['People who walked on it', '12', 'Apollo 11 to 17, 1969–1972'],
        ['Sharpest map', `0.5 <small>m</small>`, 'a pixel, at the Apollo sites'],
        ['Seen from Earth', `59 <small>%</small>`, 'of the surface, thanks to its slow wobble']]
    }
  };
  const ROVERS = { curiosity: { colour: '#E2C88E' }, perseverance: { colour: '#8AA9C9' } };
  const VIEW_NOTE = {
    map: 'The whole world unrolled flat. North and South look straight down on a pole, without the flat map’s stretch.',
    globe: 'The same pictures wrapped round a ball. Drag to turn it; sharper pictures load as you come close.',
    north: 'Looking straight down on the north pole, out to 65° north. Longitude 0° points down the screen.',
    south: 'Looking straight down on the south pole, out to 65° south. Longitude 0° points up the screen.'
  };

  /* ---------- state ---------- */
  const S = { body: 'mars', view: 'map', layer: { mars: 'photo', moon: 'photo' }, sel: null, on: { land: true, route: true, crater: true, volc: true, valley: true, grid: false } };
  let PLACES = { mars: [], moon: [] }, NAMES = { mars: null, moon: null }, ROUTES = null, routesState = 'loading';
  const B = () => BODIES[S.body];
  const polar = () => S.view === 'north' || S.view === 'south';

  /* ---------- projections ---------- */
  /* OpenLayers measures degrees on the Earth, so each body's own size is set before a view is drawn. One degree of
     latitude is 2π × radius ÷ 360 everywhere, so the scale bar is true north to south (east to west it is true at the
     equator and too long by 1 ÷ cos(latitude) elsewhere, the stretch of a flat map). */
  const geo = ol.proj.get('EPSG:4326');
  geo.getMetersPerUnit = () => 2 * Math.PI * B().radius / 360;
  geo.setGetPointResolution(r => r);
  /* polar stereographic on each body's sphere, out to 65° (the edge is 2R tan(12.5°) from the pole); its scale is
     true at the pole and 4.9 % large at 65° */
  const EDGE = 65, POLE = {};
  for (const [b, { radius }] of Object.entries(BODIES)) for (const pole of ['north', 'south']) {
    const code = `NEDAP:${b}-${pole}`, H = 2 * radius * Math.tan((90 - EDGE) / 2 * D2R);
    proj4.defs(code, `+proj=stere +lat_0=${pole === 'north' ? 90 : -90} +lon_0=0 +k=1 +x_0=0 +y_0=0 +R=${radius} +units=m +no_defs`);
    POLE[`${b}-${pole}`] = { code, H };
  }
  ol.proj.proj4.register(proj4);
  for (const { code, H } of Object.values(POLE)) {
    const p = ol.proj.get(code);
    p.setExtent([-H, -H, H, H]); p.setGetPointResolution(r => r);
    p.setWorldExtent(code.endsWith('north') ? [-180, EDGE - 5, 180, 90] : [-180, -90, 180, -(EDGE - 5)]);
  }
  const proj = () => polar() ? POLE[`${S.body}-${S.view}`].code : 'EPSG:4326';
  const toView = c => polar() ? ol.proj.transform(c, 'EPSG:4326', proj()) : c;
  const toLonLat = c => polar() ? ol.proj.transform(c, proj(), 'EPSG:4326') : c;
  const inView = lat => S.view === 'north' ? lat >= EDGE : S.view === 'south' ? lat <= -EDGE : true;

  /* ---------- the flat and polar maps ---------- */
  const TOP = 180 / 256;                                   /* Trek level 0: degrees a pixel */
  const source = (url, max) => new ol.source.XYZ({ projection: 'EPSG:4326', url, wrapX: false, crossOrigin: 'anonymous',
    tileGrid: FlatMap.worldGrid({ maxZoom: max, tileSize: 256, topRes: TOP }) });
  let tileErrors = 0, tileLoads = 0;
  const watch = src => { src.on('tileloaderror', () => { tileErrors++; health(); }); src.on('tileloadend', () => { tileLoads++; health(); }); return src; };

  const base = new ol.layer.Tile({ preload: 1, zIndex: 0 });
  const close = new ol.layer.Group({ minZoom: 6, zIndex: 1 });   /* close-ups from OpenLayers zoom 6 (Trek level 5) */
  const grid = FlatMap.graticule();
  const routeSrc = new ol.source.Vector({ wrapX: false });
  const font = (px, bold) => `${bold ? 'bold ' : ''}${px}px Georgia, "Palatino Linotype", serif`;
  const text = (t, colour, dy, bold) => new ol.style.Text({ text: t, offsetY: dy, font: font(12.5, bold), fill: new ol.style.Fill({ color: colour }),
    stroke: new ol.style.Stroke({ color: '#0C1119', width: 3 }) });
  const routes = new ol.layer.Vector({ source: routeSrc, zIndex: 12, style: f => f.get('here')
    ? new ol.style.Style({ image: new ol.style.Circle({ radius: 5, fill: new ol.style.Fill({ color: f.get('c') }), stroke: new ol.style.Stroke({ color: '#0C1119', width: 2 }) }),
        text: text(f.get('here'), f.get('c'), 16) })
    : [new ol.style.Style({ stroke: new ol.style.Stroke({ color: 'rgba(12,17,25,.8)', width: 4.5 }) }),
       new ol.style.Style({ stroke: new ol.style.Stroke({ color: f.get('c'), width: 2.5 }) })] });
  const placeSrc = new ol.source.Vector({ wrapX: false });
  const SHAPE = { land: 4, crater: 40, volc: 3 };
  const places = new ol.layer.Vector({ source: placeSrc, declutter: true, zIndex: 13, style: f => {
    const g = f.get('group'), sel = f.get('id') === S.sel, land = g === 'land';
    return new ol.style.Style({
      image: g === 'valley'
        ? new ol.style.RegularShape({ points: 4, radius: sel ? 7 : 5, angle: Math.PI / 4, fill: new ol.style.Fill({ color: 'rgba(0,0,0,0)' }),
            stroke: new ol.style.Stroke({ color: sel ? '#E2C88E' : '#EDE6D3', width: sel ? 2.5 : 1.5, lineDash: [3, 2] }) })
        : new ol.style.RegularShape({ points: SHAPE[g] || 40, radius: sel ? 8 : 6, angle: 0,
            fill: new ol.style.Fill({ color: land ? '#C0A062' : 'rgba(0,0,0,0)' }),
            stroke: new ol.style.Stroke({ color: sel ? '#E2C88E' : land ? '#0C1119' : '#EDE6D3', width: sel ? 2.5 : 1.6 }) }),
      text: text(f.get('name'), sel ? '#E2C88E' : '#EDE6D3', -15, sel), zIndex: sel ? 2 : land ? 1 : 0 });
  } });
  const pinSrc = new ol.source.Vector({ wrapX: false });     /* a searched feature that is not one of the marked places */
  const pin = new ol.layer.Vector({ source: pinSrc, zIndex: 14, style: f => new ol.style.Style({
    image: new ol.style.Circle({ radius: 6, fill: new ol.style.Fill({ color: 'rgba(0,0,0,0)' }), stroke: new ol.style.Stroke({ color: '#E2C88E', width: 2.5 }) }),
    text: text(f.get('name'), '#E2C88E', -15, true) }) });
  let pinAt = null;                                         /* the pin's [name, lat, lon], kept across views */

  let view = FlatMap.worldView(18);
  const map = new ol.Map({ target: 'pmap', layers: [base, close, grid, routes, places, pin], view,
    controls: ol.control.defaults.defaults({ attribution: false, rotate: false }).extend([new ol.control.ScaleLine({ units: 'metric' })]) });

  function makeView() {
    if (!polar()) return FlatMap.worldView(18);
    const { code, H } = POLE[`${S.body}-${S.view}`];
    return new ol.View({ projection: code, center: [0, 0], zoom: 2, maxZoom: 18, extent: [-H, -H, H, H], smoothExtentConstraint: false });
  }
  /* the smallest zoom keeps the frame filled: the whole flat map with no empty bands, or the whole polar circle */
  let sized = false;
  function fill() {
    const size = map.getSize(); if (!size || !size[0] || !size[1]) return false;
    view.setMinZoom(0);
    if (polar()) { const H = POLE[`${S.body}-${S.view}`].H; view.setMinZoom(view.getZoomForResolution(2 * H / Math.min(size[0], size[1]))); }
    else view.setMinZoom(view.getZoomForResolution(Math.min(360 / size[0], 180 / size[1])));
    return true;
  }
  function home() { if (fill()) { view.setZoom(view.getMinZoom()); view.setCenter([0, 0]); } }
  let pending = null;                                       /* a place to show once the map has its size */
  new ResizeObserver(() => {
    if (S.view === 'globe') return;
    map.updateSize();
    if (!sized) { sized = fill(); if (sized && !pending) home(); } else fill();
  }).observe($('pmap'));
  const watchView = v => { v.on('change:center', () => requestAnimationFrame(tag)); v.on('change:resolution', () => requestAnimationFrame(tag)); };
  watchView(view);
  function setView() {
    view = makeView(); watchView(view);
    map.setView(view);
    if (sized) home();
  }

  /* ---------- drawing a body ---------- */
  const layerNow = () => B().layers.find(x => x.id === S.layer[S.body]) || B().layers[0];
  function drawBody() {
    const b = B(), l = layerNow();
    tileErrors = 0; tileLoads = 0; health();
    base.setSource(watch(source(trek(b.trek, l.layer, l.ext), l.max)));
    close.setLayers(new ol.Collection(polar() ? [] : b.close.map(([layer, ext, max, box]) =>
      new ol.layer.Tile({ extent: box, source: source(trek(b.trek, layer, ext), max) }))));
    $('pmLayers').innerHTML = b.layers.map(x => `<button class="chip" type="button" aria-pressed="${x.id === l.id}" data-layer="${x.id}">${esc(x.name)}</button>`).join('');
    $('pmLayerNote').textContent = `${l.note}${S.view === 'map' ? ' ' + b.note : ''}`;
    for (const v of $('pmViews').children) v.setAttribute('aria-pressed', v.dataset.view === S.view);
    $('pmViewNote').textContent = VIEW_NOTE[S.view];
    drawPlaces(); drawRoutes(); drawPin();
    const mars = S.body === 'mars';
    routes.setVisible(mars && S.on.route);
    $('chipRoute').hidden = !mars; $('keyRoutes').hidden = !mars || routesState !== 'ok';
    grid.setVisible(S.on.grid);
    for (const t of document.querySelectorAll('.tabs [data-body]')) {
      const on = t.dataset.body === S.body; t.setAttribute('aria-selected', on);
    }
    $('pmap').setAttribute('aria-label', `${polar() ? `The ${S.view} pole of ${b.name}` : `Map of ${b.name}`}. Drag to move, scroll or pinch to zoom, or use the arrow keys and plus and minus.`);
    stats(); card(); tag(); notes(); globeShow();
  }
  function drawPlaces() {
    placeSrc.clear();
    placeSrc.addFeatures(PLACES[S.body].filter(p => S.on[p.group] && inView(p.lat)).map(p =>
      new ol.Feature({ geometry: new ol.geom.Point(toView([p.lon, p.lat])), id: p.id, name: p.name, group: p.group })));
    globeItems();
  }
  function drawRoutes() {
    routeSrc.clear();
    if (polar()) return;                                    /* both rovers are near the equator */
    for (const [key, r] of Object.entries(ROUTES && ROUTES.rovers || {})) {
      const c = (ROVERS[key] || {}).colour || '#EDE6D3';
      if (Array.isArray(r.route) && r.route.length > 1) routeSrc.addFeature(new ol.Feature({ geometry: new ol.geom.LineString(r.route), c }));
      routeSrc.addFeature(new ol.Feature({ geometry: new ol.geom.Point([r.lon, r.lat]), here: `${r.name}, sol ${nf(r.sol)}`, c }));
    }
  }
  function drawPin() {
    pinSrc.clear();
    if (pinAt && inView(pinAt[1])) pinSrc.addFeature(new ol.Feature({ geometry: new ol.geom.Point(toView([pinAt[2], pinAt[1]])), name: pinAt[0] }));
  }

  /* ---------- figures, the place card, notes ---------- */
  function rover(key, label) {
    const r = ROUTES && ROUTES.rovers && ROUTES.rovers[key];
    if (!r) return [label, '–', routesState === 'loading' ? 'loading…' : 'the daily copy is not available yet'];
    return [label, `${(r.driven_m / 1000).toFixed(1)} <small>km</small>`, `${esc(r.site)} · to sol ${nf(r.sol)}`];
  }
  function stats() {
    $('pmStats').innerHTML = B().stats().map(([l, v, n]) =>
      `<div class="stat"><div class="label">${l}</div><div class="value">${v}</div><div class="note">${n}</div></div>`).join('');
  }
  const deg = (v, p, n) => `${Math.abs(v).toFixed(Math.abs(v) < 10 ? 2 : 1)}° ${v >= 0 ? p : n}`;
  const where = (lat, lon) => `${deg(lat, 'N', 'S')}, ${deg(lon, 'E', 'W')}`;
  /* the sharpest close-up at a point (each body's list runs from coarse to fine, as they are drawn) */
  const closeAt = ([lon, lat]) => B().close.filter(([, , , b]) => lon >= b[0] && lon <= b[2] && lat >= b[1] && lat <= b[3]).pop();
  function card() {
    const list = PLACES[S.body];
    if (!list.length) { $('pmCard').innerHTML = `<div class="pb"><p class="loading">Loading the places…</p></div>`; return; }
    const p = list.find(x => x.id === S.sel) || list.find(x => x.id === B().home) || list[0];
    const r = p.rover && ROUTES && ROUTES.rovers && ROUTES.rovers[p.rover];
    const at = r ? [r.lon, r.lat] : [p.lon, p.lat];
    const facts = [['Where', where(p.lat, p.lon)], ...p.facts];
    if (r) facts.push(['Now', `Sol ${nf(r.sol)}, ${(r.driven_m / 1000).toFixed(1)} km driven, at ${where(r.lat, r.lon)}`]);
    const flat = S.view === 'map';
    const go = S.view === 'globe' ? 'Turn to it' : r && flat ? `Zoom to ${esc(r.name)}` : closeAt(at) && flat ? 'Zoom into the close-up' : 'Zoom in';
    $('pmCard').innerHTML = `<div class="ph"><h3>${esc(p.name)}</h3><span class="aside">${esc(p.kind)}</span></div>
      <div class="pb"><div class="split">
        <div><p>${esc(p.text)}</p>
          <p class="pmgo"><button class="btn small" type="button" id="pmGo">${go}</button>${(p.links || []).map(([t, h]) => ` <a class="btn outline small" href="${esc(h)}">${esc(t)}</a>`).join('')}</p></div>
        <div><dl class="terms">${facts.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>${picture(p.picture)}</div>
      </div></div>`;
    $('pmGo').onclick = () => {
      if (S.view === 'globe') { if (globe) globe.go(at[1], at[0], true); $('pmGlobe').focus({ preventScroll: true }); return; }
      if (!inView(at[1])) { S.view = 'map'; setView(); drawBody(); setHash(); }
      /* a rover: OpenLayers zoom 15 (about 1.4 m a pixel on Mars); a close-up: zoom 13; elsewhere at least zoom 6 */
      const z = polar() ? Math.max(view.getZoom(), view.getMinZoom() + 3) : r ? 15 : closeAt(at) ? 13 : Math.max(view.getZoom(), 6);
      view.animate({ center: toView(at), zoom: Math.min(z, view.getMaxZoom()), duration: ms(900) });
      $('pmap').focus({ preventScroll: true });
    };
  }
  /* an ESA picture of the place (places.json "picture"), loaded from ESA's own server, with ESA's credit and licence */
  function picture(pic) {
    if (!pic) return '';
    const lic = pic.licenceUrl ? `<a href="${esc(pic.licenceUrl)}" target="_blank" rel="noopener">${esc(pic.licence)}</a>` : esc(pic.licence);
    return `<figure class="pmpic"><a href="${esc(pic.page)}" target="_blank" rel="noopener"><img src="${esc(pic.src)}" alt="${esc(pic.alt)}" loading="lazy" decoding="async"></a>
      <figcaption class="caption">${esc(pic.caption)} ${esc(pic.credit)}, ${lic}. <a href="${esc(pic.page)}" target="_blank" rel="noopener">ESA ↗</a></figcaption></figure>`;
  }
  function credits() {
    const c = S.view === 'map' && view.getZoom() >= 6 && closeAt(view.getCenter() || [0, 0]);
    $('pmSrc').textContent = `Map tiles: NASA Solar System Treks (JPL). ${layerNow().credit}${c ? ` Close-up: ${c[5]}` : ''}`;
    return c;
  }
  /* the label in the map's corner: which close-up is showing */
  function tag() {
    const c = credits();
    $('pmTag').hidden = !c;
    if (c) $('pmTag').innerHTML = `Close-up: <strong>${esc(c[4])}</strong>`;
  }
  function notes() {
    let t = '';
    const down = tileErrors >= 6 && tileLoads === 0 && S.view !== 'globe';
    if (down) t = 'NASA’s map server (trek.nasa.gov) could not be reached, so the map has no picture. The places are still shown; try again later.';
    else if (S.body === 'mars' && routesState === 'missing') t = 'The rovers’ routes come from a daily copy of NASA/JPL’s files, which is not available yet. The places are shown without them.';
    $('pmNote').hidden = !t; $('pmNoteT').textContent = t;
    $('pmNote').className = 'notice' + (down ? ' error' : '');
  }
  let healthTimer = 0;
  function health() { clearTimeout(healthTimer); healthTimer = setTimeout(notes, 400); }
  function problem(t) { $('pmNote').hidden = false; $('pmNote').className = 'notice error'; $('pmNoteT').textContent = t; }

  /* ---------- the globe (globe.js, loaded the first time it is chosen) ---------- */
  let globe = null, globeLoading = null;
  function globeItems() {
    if (!globe) return;
    const list = PLACES[S.body].filter(p => S.on[p.group]).map(p => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, kind: p.group, sel: p.id === S.sel }));
    if (S.body === 'mars' && S.on.route) for (const [key, r] of Object.entries(ROUTES && ROUTES.rovers || {}))
      list.push({ name: r.name, lat: r.lat, lon: r.lon, kind: 'rover', colour: (ROVERS[key] || {}).colour });
    if (pinAt) list.push({ name: pinAt[0], lat: pinAt[1], lon: pinAt[2], kind: 'crater', sel: true });
    globe.items(list);
  }
  function globeShow() {
    const on = S.view === 'globe';
    $('pmGlobe').hidden = !on; $('pmap').hidden = on;
    if (on) { $('pmPos').hidden = true; $('pmTag').hidden = true; }
    if (!on) { if (globe) globe.run(false); return; }
    if (!globe) {
      globeLoading = globeLoading || import('./globe.js?v=2026111812')
        .then(m => m.start({ frame: $('pmGlobe'), host: $('pmGlobeHost'), over: $('pmGlobeOver'), onPick: choose }))
        .then(g => { globe = g; if (S.view === 'globe') globeShow(); })
        .catch(() => problem('The globe needs WebGL, which this browser could not start. The map views still work.'));
      return;
    }
    globe.show(B(), layerNow(), []).then(ok => { if (ok === false && S.view === 'globe') problem('NASA’s map server (trek.nasa.gov) could not be reached, so the globe has no picture. Try again later.'); });
    globeItems(); globe.run(true);
    const p = PLACES[S.body].find(x => x.id === S.sel);
    if (p) globe.go(p.lat, p.lon, false);
  }
  $('pmGIn').addEventListener('click', () => globe && globe.zoom(0.75));
  $('pmGOut').addEventListener('click', () => globe && globe.zoom(1.4));

  /* ---------- choosing a place ---------- */
  function choose(id, body = S.body) {
    if (body !== S.body) { S.body = body; S.sel = id; if (polar()) S.view = 'map'; setView(); drawBody(); setHash(); }
    const p = PLACES[S.body].find(x => x.id === id); if (!p) return;
    S.sel = id; pinAt = null; drawPin(); places.changed(); globeItems(); card();
    show(p.lat, p.lon, 5);
  }
  function show(lat, lon, minZoom) {
    if (S.view === 'globe') { if (globe) globe.go(lat, lon, false); return; }
    if (!inView(lat)) { S.view = 'map'; setView(); drawBody(); setHash(); }
    if (!sized) { pending = { at: [lon, lat], minZoom }; return; }
    view.animate({ center: toView([lon, lat]), zoom: Math.max(view.getZoom(), polar() ? view.getMinZoom() + 1 : minZoom), duration: ms(700) });
  }
  function choosePoint(name, lat, lon, kind) {
    pinAt = [name, lat, lon]; drawPin();
    $('pmCard').innerHTML = `<div class="ph"><h3>${esc(name)}</h3><span class="aside">${esc(kind)}</span></div>
      <div class="pb"><dl class="terms"><dt>Where</dt><dd>${where(lat, lon)}</dd></dl></div>`;
    S.sel = null; places.changed(); globeItems();
    show(lat, lon, 6);
  }

  /* ---------- search: the marked places, every official name (when its list is there) and coordinates ---------- */
  const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let matches = [], active = -1;
  function coords(q) {
    const m = q.match(/^\s*(-?\d+(?:\.\d+)?)\s*°?\s*([NS])?\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EW])?\s*$/i);
    if (!m) return null;
    let lat = +m[1], lon = +m[3];
    if (m[2] && /s/i.test(m[2])) lat = -Math.abs(lat);
    if (m[4] && /w/i.test(m[4])) lon = -Math.abs(lon);
    if (lon > 180) lon -= 360;
    return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null;
  }
  function find(q) {
    const f = fold(q.trim()); if (f.length < 2) return [];
    const out = [];
    const c = coords(q);
    if (c) out.push({ t: 'point', name: where(c[0], c[1]), kind: 'Coordinates', lat: c[0], lon: c[1], body: S.body });
    for (const body of [S.body, S.body === 'mars' ? 'moon' : 'mars']) {
      for (const p of PLACES[body]) if (fold(p.name).includes(f)) out.push({ t: 'place', id: p.id, name: p.name, kind: `${p.kind}${body !== S.body ? ` · ${BODIES[body].name}` : ''}`, body });
      for (const n of NAMES[body] || []) {
        if (out.length >= 12) break;
        if (fold(n[0]).startsWith(f) && !PLACES[body].some(p => fold(p.name) === fold(n[0])))
          out.push({ t: 'point', name: n[0], kind: `${n[1]}${body !== S.body ? ` · ${BODIES[body].name}` : ''}`, lat: n[2], lon: n[3], body });
      }
    }
    return out.slice(0, 12);
  }
  function list() {
    const ul = $('pmList'), q = $('pmFind').value;
    matches = find(q); active = matches.length ? 0 : -1;
    ul.hidden = !q.trim();
    ul.innerHTML = matches.length
      ? matches.map((m, i) => `<li role="option" id="pmOpt${i}" aria-selected="${i === active}" data-i="${i}"><span>${esc(m.name)}</span><span class="k">${esc(m.kind)}</span></li>`).join('')
      : `<li role="option" aria-disabled="true"><span>No place by that name${NAMES[S.body] ? '' : ' on the map'}</span></li>`;
    $('pmFind').setAttribute('aria-expanded', !ul.hidden);
    $('pmFind').setAttribute('aria-activedescendant', active >= 0 ? `pmOpt${active}` : '');
  }
  function pick(m) {
    $('pmList').hidden = true; $('pmFind').setAttribute('aria-expanded', 'false');
    if (!m) return;
    $('pmFind').value = m.name;
    if (m.t === 'place') choose(m.id, m.body);
    else { if (m.body !== S.body) { S.body = m.body; if (polar()) S.view = 'map'; setView(); drawBody(); setHash(); } choosePoint(m.name, m.lat, m.lon, m.kind); }
  }
  $('pmFind').addEventListener('input', list);
  $('pmFind').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!matches.length) return; e.preventDefault();
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
      for (const li of $('pmList').children) li.setAttribute('aria-selected', +li.dataset.i === active);
      $('pmFind').setAttribute('aria-activedescendant', `pmOpt${active}`);
    } else if (e.key === 'Enter') { e.preventDefault(); pick(matches[active]); }
    else if (e.key === 'Escape') { $('pmList').hidden = true; $('pmFind').setAttribute('aria-expanded', 'false'); }
  });
  $('pmList').addEventListener('mousedown', e => { const li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); pick(matches[+li.dataset.i]); } });
  $('pmFind').addEventListener('blur', () => setTimeout(() => { $('pmList').hidden = true; $('pmFind').setAttribute('aria-expanded', 'false'); }, 150));

  /* ---------- controls ---------- */
  document.querySelector('.tabs').addEventListener('click', e => {
    const t = e.target.closest('[data-body]'); if (!t || t.dataset.body === S.body) return;
    S.body = t.dataset.body; S.sel = null; pinAt = null; if (S.view !== 'globe') setView(); drawBody(); setHash();
  });
  $('pmViews').addEventListener('click', e => {
    const b = e.target.closest('[data-view]'); if (!b || b.dataset.view === S.view) return;
    S.view = b.dataset.view; if (S.view !== 'globe') setView(); drawBody(); setHash();
  });
  $('pmLayers').addEventListener('click', e => { const b = e.target.closest('[data-layer]'); if (b) { S.layer[S.body] = b.dataset.layer; drawBody(); } });
  $('pmOn').addEventListener('click', e => {
    const b = e.target.closest('[data-k]'); if (!b) return;
    const k = b.dataset.k; S.on[k] = !S.on[k]; b.setAttribute('aria-pressed', S.on[k]);
    if (k === 'grid') grid.setVisible(S.on.grid);
    else if (k === 'route') { routes.setVisible(S.body === 'mars' && S.on.route); globeItems(); }
    else drawPlaces();
  });
  map.on('click', e => {
    const f = map.forEachFeatureAtPixel(e.pixel, f => f.get('id') ? f : null, { layerFilter: l => l === places, hitTolerance: 6 });
    if (f) choose(f.get('id'));
  });
  map.on('pointermove', e => {
    if (e.dragging) return;
    $('pmap').style.cursor = map.hasFeatureAtPixel(e.pixel, { layerFilter: l => l === places, hitTolerance: 6 }) ? 'pointer' : '';
    const [lon, lat] = toLonLat(e.coordinate);
    $('pmPos').hidden = false; $('pmPos').textContent = where(lat, lon);
  });
  $('pmap').addEventListener('pointerleave', () => { $('pmPos').hidden = true; });

  /* the body and view are kept in the address (#mars, #moon, #moon-south, #mars-globe …), so a link can open either
     and Back returns to it. A link may also name a place instead of a view (#mars-gale, #moon-apollo11): the flat map
     opens on it, with its card. */
  const VIEWS = ['map', 'globe', 'north', 'south'];
  function setHash() { history.replaceState(null, '', `#${S.body}${S.view === 'map' ? '' : '-' + S.view}`); }
  function fromHash() {
    const [b, v] = location.hash.slice(1).split('-');
    return BODIES[b] ? { body: b, view: VIEWS.includes(v) ? v : 'map', place: VIEWS.includes(v) ? null : v || null } : null;
  }
  window.addEventListener('hashchange', () => {
    const h = fromHash(); if (!h) return;
    if (h.place && PLACES[h.body].some(p => p.id === h.place)) {
      if (h.body !== S.body || S.view !== 'map') { S.body = h.body; S.view = 'map'; setView(); drawBody(); }
      choose(h.place); setHash(); return;
    }
    if (h.body === S.body && h.view === S.view) return;
    S.body = h.body; S.view = h.view; S.sel = null; pinAt = null; if (S.view !== 'globe') setView(); drawBody();
  });

  /* ---------- data ---------- */
  async function json(url) { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); }
  async function loadRoutes() {
    try { ROUTES = await json('data/routes.json'); routesState = 'ok'; }
    catch { ROUTES = null; routesState = 'missing'; }
    drawRoutes(); globeItems();
    if (ROUTES && ROUTES.updated) {
      const d = new Date(ROUTES.updated);
      $('pmRouteDate').textContent = `NASA/JPL-Caltech · copied ${d.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
    }
    $('keyRoutes').hidden = S.body !== 'mars' || routesState !== 'ok';
    stats(); card(); notes();
  }
  async function loadNames(body) {
    try { const d = await json(`data/names-${body}.json`); NAMES[body] = Array.isArray(d.names) ? d.names : null; } catch { NAMES[body] = null; }
  }

  const start = fromHash();
  if (start) { S.body = start.body; S.view = start.view; }
  if (polar()) setView();
  drawBody();
  json('places.json').then(d => {
    PLACES = { mars: d.mars || [], moon: d.moon || [] };
    drawBody();
    if (start && start.place && PLACES[S.body].some(p => p.id === start.place)) { choose(start.place); setHash(); }
    if (pending) { const p = pending; pending = null; if (sized) view.animate({ center: toView(p.at), zoom: Math.max(view.getZoom(), p.minZoom), duration: 0 }); }
  }).catch(() => {
    $('pmCard').innerHTML = `<div class="pb"><p class="state">The list of places could not be loaded. <button class="linkbtn" type="button" id="pmRetry">Try again</button></p></div>`;
    $('pmRetry').onclick = () => location.reload();
  });
  loadRoutes();
  loadNames('mars'); loadNames('moon');
})();
