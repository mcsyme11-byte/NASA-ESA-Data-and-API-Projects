/* NASA and ESA Data Projects · Planetary Maps · the Moon and Mars as globes · © 2026 Malcolm Syme · mcsyme11@gmail.com
 *
 * Loaded by app.js the first time the Globe view is chosen. Built on the shared globe (shared/globe.js, three.js):
 * the body's picture is made from the same NASA Trek tiles as the flat map (level 2, 8 × 4 tiles of 256 px, then
 * level 3 where the graphics card allows), and closeUp() lays sharper Trek tiles over the part in view as the camera
 * comes close. Trek's level z tile covers 180 / 2^z degrees. The places and the rovers are drawn on a 2D layer above.
 *
 *   const globe = await start({ frame, host, over, onPick })
 *   globe.show(body, layer, items)   body: { trek, atmosphere }; layer: { layer, ext, max }; items: [{ id, name, lat, lon, kind, colour, sel }]
 *   globe.items(items)               new marks (the filters changed, a place was chosen)
 *   globe.go(lat, lon, near)         turn to a place (near: come close)
 *   globe.run(on)                    start or stop drawing (stopped while another view is shown)
 */
import { vec, createGlobe, bodyTexture, closeUp, reduceMotion } from '../shared/globe.js?v=2026111801';

const TREK = 'https://trek.nasa.gov/tiles/';
const BRIGHT = '#E2C88E', INK = '#EDE6D3', BRASS = '#C0A062';

export async function start({ frame, host, over, onPick }) {
  const g = createGlobe({ host, frame, atmosphere: null, minDistance: 1.03, maxDistance: 12, autoRotate: !reduceMotion(), autoRotateSpeed: 0.3 });
  g.camera.position.copy(vec(18, 77, 3.2));
  g.controls.addEventListener('start', () => { g.fly = null; g.controls.autoRotate = false; });
  const ctx = over.getContext('2d');
  let items = [], hits = [], running = false, sharper = () => {}, key = '', atmo = null;

  function resize() {
    const w = frame.clientWidth, h = frame.clientHeight, d = Math.min(devicePixelRatio, 2);
    if (!g.resize()) return;
    over.width = w * d; over.height = h * d;
  }
  new ResizeObserver(resize).observe(frame);

  async function show(body, layer, list) {
    items = list;
    const k = body.trek + layer.layer;
    if (k === key) return;
    key = k;
    for (const c of g.body.children.slice(1)) { g.body.remove(c); c.geometry && c.geometry.dispose(); }   /* an old close-up patch */
    if (atmo) { g.scene.remove(atmo); atmo = null; }
    const url = (z, row, col) => `${TREK}${body.trek}/EQ/${layer.layer}/1.0.0/default/default028mm/${z}/${row}/${col}.${layer.ext}`;
    /* Trek level z: about 2^z × 1.42 pixels a degree. One picture pixel or more for each screen pixel: the view is
       about 42° × height across, in body radii, for a screen of about 1,000 px. */
    sharper = closeUp(g, { url, tile: 256, degPerTile: z => 180 / 2 ** z,
      levelFor: alt => Math.min(layer.max, alt < 0.04 ? 9 : alt < 0.08 ? 8 : alt < 0.16 ? 7 : alt < 0.32 ? 6 : alt < 0.65 ? 5 : alt < 1.3 ? 4 : 0) });
    const first = await bodyTexture(g, url, { z: 2, cols: 8, rows: 4, tile: 256 });
    if (!first) return false;
    if (layer.max >= 3 && g.renderer.capabilities.maxTextureSize >= 4096 && key === k) await bodyTexture(g, url, { z: 3, cols: 16, rows: 8, tile: 256 });
    return true;
  }

  /* a point on the near side of the body: seen from the camera at c (|c| > 1), the point p (|p| = 1) is in view while
     p · c > 1 (beyond that it is over the horizon) */
  function draw() {
    const w = frame.clientWidth, h = frame.clientHeight, d = over.width / (w || 1);
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, w, h);
    hits = [];
    const cam = g.camera.position;
    ctx.font = '12.5px Georgia, "Palatino Linotype", serif'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const placed = [];
    for (const it of [...items].sort((a, b) => (a.sel ? 1 : 0) - (b.sel ? 1 : 0))) {
      const p = vec(it.lat, it.lon, 1);
      if (p.dot(cam) <= 1.0005) continue;
      const s = g.toScreen(p); if (!s) continue;
      const [x, y] = s, r = it.sel ? 7 : 5;
      ctx.lineWidth = it.sel ? 2.4 : 1.6;
      ctx.strokeStyle = it.sel ? BRIGHT : it.kind === 'land' ? '#0C1119' : INK;
      ctx.fillStyle = it.colour || (it.kind === 'land' ? BRASS : 'rgba(0,0,0,0)');
      ctx.beginPath();
      if (it.kind === 'land') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); }
      else if (it.kind === 'volc') { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y + r * 0.8); ctx.lineTo(x - r, y + r * 0.8); ctx.closePath(); }
      else if (it.kind === 'rover') { ctx.arc(x, y, r - 1, 0, 7); ctx.fill(); ctx.strokeStyle = '#0C1119'; }
      else if (it.kind === 'valley') { ctx.setLineDash([3, 2]); ctx.rect(x - r, y - r, 2 * r, 2 * r); }
      else ctx.arc(x, y, r, 0, 7);
      ctx.stroke(); ctx.setLineDash([]);
      hits.push({ x, y, it });
      /* names: skipped where they would overlap one already drawn, except the chosen place */
      const tw = ctx.measureText(it.name).width, box = [x + 9, y - 8, tw, 16];
      if (!it.sel && placed.some(b => box[0] < b[0] + b[2] && b[0] < box[0] + box[2] && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])) continue;
      placed.push(box);
      ctx.lineWidth = 3; ctx.strokeStyle = '#0C1119'; ctx.strokeText(it.name, x + 9, y);
      ctx.fillStyle = it.sel ? BRIGHT : it.colour && it.kind === 'rover' ? it.colour : INK; ctx.fillText(it.name, x + 9, y);
    }
  }

  function loop() {
    if (!running) return;
    g.stepFly(); g.paceControls(); g.controls.update(); sharper();
    g.renderer.render(g.scene, g.camera); draw();
    requestAnimationFrame(loop);
  }
  function run(on) {
    if (on && !running) { running = true; resize(); requestAnimationFrame(loop); }
    if (!on) running = false;
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) running = false; });

  /* tap a mark to choose it; a drag turns the globe instead */
  const el = g.renderer.domElement; let down = null;
  const nearest = e => {
    const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    let best = null, bd = 256;                                /* within 16 px */
    for (const h of hits) { const dd = (h.x - x) ** 2 + (h.y - y) ** 2; if (dd < bd) { bd = dd; best = h.it; } }
    return best;
  };
  el.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  el.addEventListener('pointerup', e => {
    if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 6) { const it = nearest(e); if (it && it.id) onPick(it.id); }
    down = null;
  });
  el.addEventListener('pointermove', e => { if (!e.buttons) el.style.cursor = nearest(e) ? 'pointer' : ''; });
  frame.addEventListener('keydown', e => {
    if (!running || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key.startsWith('Arrow')) { g.controls.autoRotate = false; g.turn(e.key); e.preventDefault(); }
    else if (e.key === '+' || e.key === '=') g.zoom(0.75);
    else if (e.key === '-' || e.key === '_') g.zoom(1.4);
  });

  return {
    show, run,
    items(list) { items = list; },
    go(lat, lon, near) {
      g.controls.autoRotate = false;
      g.flyTo(vec(lat, lon, near ? 1.25 : Math.max(1.8, Math.min(g.camera.position.length(), 3.2))));
    },
    zoom: f => { g.controls.autoRotate = false; g.zoom(f); },
  };
}
