/* NASA and ESA Data Projects · shared · a flat map of any body on an equirectangular or polar tile grid (OpenLayers) ·
 * © 2026 Malcolm Syme · mcsyme11@gmail.com
 *
 * Moved here from the Image Explorer's Earth map on Nov 17, 2026, unchanged in behaviour, for the tools that show a
 * body as a flat map: the Image Explorer (the Earth from NASA GIBS), Planetary Maps (the Moon and Mars) and Orbit
 * Watch (the Earth). The layers, the date and everything drawn on the map stay in each tool.
 *
 * A classic script (not a module), loaded after OpenLayers and proj4js (kept in shared/vendor/):
 *   <link rel="stylesheet" href="../shared/vendor/ol-10.11.0/ol.css">
 *   <script src="../shared/vendor/ol-10.11.0/ol.js"></script>
 *   <script src="../shared/vendor/proj4-2.22.0/proj4.js"></script>
 *   <script src="../shared/flatmap.js"></script>
 * It defines one global, FlatMap:
 *   FlatMap.worldGrid({ maxZoom })            equirectangular tiles (GIBS: 512 px, 0.5625° a pixel at level 0)
 *   FlatMap.polarGrid({ maxZoom })            GIBS's polar tiles (512 px, 8,192 m a pixel at level 0)
 *   FlatMap.registerPolar()                   the Arctic (EPSG:3413) and Antarctic (EPSG:3031) projections of GIBS
 *   FlatMap.worldView(maxZoom), FlatMap.polarView(code, maxZoom)
 *   FlatMap.fillFrame(map, polar)             the whole world (or the pole to about 55°) filling the frame
 *   FlatMap.clearBlack                        a tile load function: black pixels of JPEG tiles made see-through
 *   FlatMap.graticule()                       a latitude and longitude grid in the site's brass, hidden at first
 * Other bodies use the same grids with their own numbers (for example a tile set whose level 0 is 2 × 1 tiles of
 * 256 px has worldGrid({ tileSize: 256, topRes: 180 / 256 })).
 */
(function () {
  const H = 4194304;                                        /* half the width of GIBS's polar grids, metres */

  /* World (equirectangular): tiles from (-180°, 90°), topRes degrees a pixel at level 0; each level halves it. */
  function worldGrid({ maxZoom, topRes = 0.5625, tileSize = 512 }) {
    const res = [];
    for (let z = 0; z <= maxZoom; z++) res.push(topRes / 2 ** z);
    return new ol.tilegrid.TileGrid({ origin: [-180, 90], extent: [-180, -90, 180, 90], resolutions: res, tileSize });
  }
  /* Polar: tiles from (-H, H), topRes metres a pixel at level 0. */
  function polarGrid({ maxZoom, topRes = 8192, tileSize = 512 }) {
    const res = [];
    for (let z = 0; z <= maxZoom; z++) res.push(topRes / 2 ** z);
    return new ol.tilegrid.TileGrid({ origin: [-H, H], extent: [-H, -H, H, H], resolutions: res, tileSize });
  }
  function registerPolar() {
    proj4.defs('EPSG:3413', '+proj=stere +lat_0=90 +lat_ts=70 +lon_0=-45 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs');
    proj4.defs('EPSG:3031', '+proj=stere +lat_0=-90 +lat_ts=-71 +lon_0=0 +k=1 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs');
    ol.proj.proj4.register(proj4);
    for (const c of ['EPSG:3413', 'EPSG:3031']) ol.proj.get(c).setExtent([-H, -H, H, H]);
    ol.proj.get('EPSG:3413').setWorldExtent([-180, 30, 180, 90]); ol.proj.get('EPSG:3031').setWorldExtent([-180, -90, 180, -30]);   /* for the grid */
  }
  /* never shows past the poles or the date line */
  const worldView = (maxZoom = 10) => new ol.View({ projection: ol.proj.get('EPSG:4326'), center: [0, 0], zoom: 2, maxZoom, extent: [-180, -90, 180, 90], smoothExtentConstraint: false });
  const polarView = (code, maxZoom = 8) => new ol.View({ projection: ol.proj.get(code), center: [0, 0], maxZoom, extent: [-H, -H, H, H], smoothExtentConstraint: false });

  /* fills the frame with no empty bands; the edges of the world crop to fit */
  function fillFrame(map, polar) {
    const size = map.getSize(); if (!size || !size[0]) return;
    const [w, h] = size;
    if (!polar) { map.getView().setResolution(Math.min(360 / w, 180 / h)); map.getView().setCenter([0, 0]); }
    else map.getView().fit([-H * 0.92, -H * 0.92, H * 0.92, H * 0.92], { size });     /* the pole to about 55° */
  }

  /* JPEG tiles draw the gaps between a satellite's passes in black: those pixels (each colour 10 or less out of 255)
     are made see-through as each tile loads, so a picture underneath shows instead */
  function clearBlack(tile, src) {
    const img = tile.getImage(), raw = new Image();
    raw.crossOrigin = 'anonymous';
    raw.onload = () => {
      const c = document.createElement('canvas'); c.width = raw.width; c.height = raw.height;
      const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(raw, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
      let any = false;
      for (let i = 0; i < a.length; i += 4) if (a[i] <= 10 && a[i + 1] <= 10 && a[i + 2] <= 10) { a[i + 3] = 0; any = true; }
      if (!any) { img.src = src; return; }                  /* nothing to clear: the original, from the browser's cache */
      g.putImageData(d, 0, 0);
      c.toBlob(b => { const u = URL.createObjectURL(b); img.onload = img.onerror = () => URL.revokeObjectURL(u); img.src = u; }, 'image/png');
    };
    raw.onerror = () => { img.src = src; };               /* lets OpenLayers see the error as before */
    raw.src = src;
  }

  const label = o => new ol.style.Text({ font: '11px ui-monospace, monospace', fill: new ol.style.Fill({ color: '#D4B87A' }),
    stroke: new ol.style.Stroke({ color: 'rgba(14,20,31,.9)', width: 3 }), ...o });
  const graticule = () => new ol.layer.Graticule({ strokeStyle: new ol.style.Stroke({ color: 'rgba(212,184,122,.35)', width: 1, lineDash: [2, 4] }),
    showLabels: true, wrapX: false, visible: false, zIndex: 11,
    lonLabelStyle: label({ textBaseline: 'bottom' }), latLabelStyle: label({ textAlign: 'end' }) });

  window.FlatMap = { H, worldGrid, polarGrid, registerPolar, worldView, polarView, fillFrame, clearBlack, graticule };
})();
