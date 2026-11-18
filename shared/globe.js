/* NASA and ESA Data Projects · shared · a 3D globe of any round body (three.js) · © 2026 Malcolm Syme · mcsyme11@gmail.com
 *
 * Moved here from the Image Explorer's globe on Nov 17, 2026, unchanged in behaviour, for the tools that show a body
 * as a globe: the Image Explorer (the Earth), Planetary Maps (the Moon and Mars) and Orbit Watch (the Earth). What is
 * drawn on the globe (pins, labels, the sky) stays in each tool.
 *
 * A page that uses this file loads three.js through an import map (three.js 0.187.0, kept in shared/vendor/):
 *   <script type="importmap">{ "imports": { "three": "../shared/vendor/three-0.187.0/three.module.js",
 *                                         "three/addons/": "../shared/vendor/three-0.187.0/" } }</script>
 *
 * Directions: x towards longitude 0, y north, and longitude growing eastwards (the same rule for right ascension, so a
 * sky drawn with vec() lines up with the body). The body has radius 1; it sits in body (a group) that can be turned.
 *
 *   const g = createGlobe({ host, frame });            the scene, camera, controls and a plain body
 *   await bodyTexture(g, GIBS_BLUE_MARBLE, { z: 2, cols: 5, rows: 3 });   a picture of the whole body from tiles
 *   const sharper = closeUp(g, { url: GIBS_BLUE_MARBLE });   sharper tiles over the part in view, once close
 *   loop: g.stepFly(); g.controls.update(); sharper(); g.renderer.render(g.scene, g.camera);
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export { THREE };
export const D2R = Math.PI / 180;
export const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A point at latitude, longitude (degrees) and distance r from the centre. */
export const vec = (lat, lon, r) => new THREE.Vector3(r * Math.cos(lat * D2R) * Math.cos(lon * D2R), r * Math.sin(lat * D2R), -r * Math.cos(lat * D2R) * Math.sin(lon * D2R));

/** Greenwich mean sidereal time, radians: how far the Earth has turned against the stars (IAU 1982 formula). */
export const gmst = (t = Date.now()) => ((((280.46061837 + 360.98564736629 * (t / 864e5 + 2440587.5 - 2451545)) % 360) + 360) % 360) * D2R;

/** The direction of the Sun in the sky's frame (right ascension and declination from the Astronomical Almanac's
 *  low-precision formulas, about 0.01°). */
export function sunDir(t = Date.now()) {
  const n = t / 864e5 + 2440587.5 - 2451545, L = (280.46 + 0.9856474 * n) % 360, g = (357.528 + 0.9856003 * n) % 360 * D2R;
  const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * D2R, eps = (23.439 - 4e-7 * n) * D2R;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / D2R, dec = Math.asin(Math.sin(eps) * Math.sin(lam)) / D2R;
  return vec(dec, ra, 1);
}

/** NASA GIBS Blue Marble (Next Generation, 500 m) in the world grid: 512 px tiles, 288 / 2^z degrees each. */
export const GIBS_BLUE_MARBLE = (z, row, col) => `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/default/500m/${z}/${row}/${col}.jpeg`;

/**
 * The scene: renderer, camera, orbit controls and a body of radius 1, with a faint atmosphere.
 * Options: host (element the canvas goes in), frame (element whose size the canvas takes), clearColor, color (the
 * body before its picture arrives), atmosphere (colour, or null for none), night (true: the night side shaded, as
 * g.night, for the Earth), minDistance, maxDistance, autoRotate, autoRotateSpeed, fov.
 */
export function createGlobe(o) {
  const opt = { clearColor: 0x05080d, color: 0x1a2333, atmosphere: 0x8aa9c9, minDistance: 1.12, maxDistance: 40,
    autoRotate: false, autoRotateSpeed: 0.35, fov: 40, ...o };
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(opt.clearColor);
  opt.host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opt.fov, 1, 0.01, 1000);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enablePan: false, enableDamping: true, dampingFactor: 0.08, minDistance: opt.minDistance, maxDistance: opt.maxDistance,
    rotateSpeed: 0.5, zoomSpeed: 0.9, autoRotate: opt.autoRotate, autoRotateSpeed: opt.autoRotateSpeed });
  camera.aspect = (opt.frame.clientWidth || 1) / (opt.frame.clientHeight || 1);
  const body = new THREE.Group(); scene.add(body);
  const mat = new THREE.MeshBasicMaterial({ color: opt.color });
  body.add(new THREE.Mesh(new THREE.SphereGeometry(1, 128, 64), mat));
  const night = opt.night ? nightShade() : null;
  if (night) scene.add(night);
  if (opt.atmosphere != null) scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 32),
    new THREE.MeshBasicMaterial({ color: opt.atmosphere, transparent: true, opacity: 0.18, side: THREE.BackSide })));

  const g = { renderer, scene, camera, controls, body, mat, night, frame: opt.frame, fly: null, min: opt.minDistance, max: opt.maxDistance };
  /** Fits the canvas to the frame; returns false while the frame is hidden. */
  g.resize = () => {
    const w = opt.frame.clientWidth, h = opt.frame.clientHeight;
    if (!w || !h) return false;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    return true;
  };
  /** A smooth move of the camera to a position (in 0.9 s, or at once with reduced motion). */
  g.flyTo = to => { g.fly = { from: camera.position.clone(), to, t0: performance.now(), ms: reduceMotion() ? 1 : 900 }; };
  /** One step of the move, each frame; the path keeps its distance from the centre changing smoothly. */
  g.stepFly = () => {
    const fly = g.fly; if (!fly) return;
    const k = Math.min(1, (performance.now() - fly.t0) / fly.ms), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const a = fly.from.clone().normalize(), b = fly.to.clone().normalize();
    const dir = new THREE.Vector3().copy(a).lerp(b, e);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);                  /* exactly opposite: pass over the pole */
    camera.position.copy(dir.normalize().multiplyScalar(fly.from.length() + (fly.to.length() - fly.from.length()) * e));
    if (k === 1) g.fly = null;
  };
  /** Zoom in (f < 1) or out (f > 1), kept a little outside the body. */
  g.zoom = f => g.flyTo(camera.position.clone().multiplyScalar(f).clampLength(1.15, g.max));
  /** Turns the view with the arrow keys' rule: 8° a press, never over the poles. */
  g.turn = key => {
    const step = 8 * D2R, p = camera.position.clone(), up = new THREE.Vector3(0, 1, 0);
    if (key === 'ArrowLeft' || key === 'ArrowRight') p.applyAxisAngle(up, key === 'ArrowLeft' ? -step : step);
    else {
      const side = new THREE.Vector3().crossVectors(up, p).normalize(), q = p.clone().applyAxisAngle(side, key === 'ArrowUp' ? -step : step);
      if (Math.abs(q.clone().normalize().y) < 0.97) p.copy(q);
    }
    camera.position.copy(p); controls.update();
  };
  /** Turning slows close to the surface, so a drag moves the ground about the same amount at any height. */
  g.paceControls = () => { controls.rotateSpeed = Math.min(0.5, Math.max(0.04, (camera.position.length() - 1) * 0.25)); };
  /** A point in the scene on the screen: [x, y] in CSS pixels of the frame, or null if behind the camera or off screen. */
  g.toScreen = p => {
    const s = p.clone().project(camera), w = opt.frame.clientWidth, h = opt.frame.clientHeight;
    if (s.z > 1 || s.x < -1.05 || s.x > 1.05 || s.y < -1.05 || s.y > 1.05) return null;
    return [(s.x + 1) / 2 * w, (1 - s.y) / 2 * h];
  };
  return g;
}

/** Joins tiles into one picture of the whole body and puts it on the globe. url(z, row, col) gives a tile; the picture
 *  is cols × rows tiles of `tile` px. Returns false if no tile arrived. */
export async function bodyTexture(g, url, { z, cols, rows, tile = 512 }) {
  const c = document.createElement('canvas'); c.width = cols * tile; c.height = rows * tile; const ctx = c.getContext('2d');
  let ok = 0;
  await Promise.all(Array.from({ length: cols * rows }, (_, i) => new Promise(done => {
    const x = i % cols, y = Math.floor(i / cols), img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { ctx.drawImage(img, x * tile, y * tile); ok++; done(); };
    img.onerror = done;
    img.src = url(z, y, x);
  })));
  if (!ok) return false;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = g.renderer.capabilities.getMaxAnisotropy();
  if (g.mat.map) g.mat.map.dispose();
  g.mat.map = t; g.mat.color.set(0xffffff); g.mat.needsUpdate = true;
  return true;
}

/**
 * Sharper close up: once the view comes close, a patch of finer tiles (5 × 4 of them) is laid over the part of the
 * body in view, a little above the surface. Returns a function to call each frame; it looks a few times a second,
 * while the view is still. Options: url(z, row, col); tile (px, 512); degPerTile(z), the degrees a tile covers
 * (GIBS: 288 / 2^z); levelFor(height above the surface, in body radii), the tile level to use, or 0 for none.
 * The default levels pick the one with at least one picture pixel for each screen pixel for GIBS's grid: the view
 * is about 42° × height a screen across per radius of height, and level z has 2^z / 0.5625 pixels a degree.
 */
export function closeUp(g, o) {
  const opt = { tile: 512, degPerTile: z => 288 / 2 ** z, lift: 1.0006,
    levelFor: alt => (alt < 0.16 ? 7 : alt < 0.32 ? 6 : alt < 0.65 ? 5 : alt < 1.3 ? 4 : 0), ...o };
  let patch = null, patchKey = '', busy = false, lastLook = 0;
  return function sharper() {
    const now = performance.now();
    if (now - lastLook < 400 || busy || g.fly) return;
    lastLook = now;
    const alt = g.camera.position.length() - 1, z = opt.levelFor(alt);
    if (patch) patch.visible = !!z;                              /* the old patch stays until the new one is in */
    if (!z) return;
    const local = g.camera.position.clone().applyMatrix4(g.body.matrixWorld.clone().invert()).normalize();
    const lat = Math.asin(local.y) / D2R, lon = Math.atan2(-local.z, local.x) / D2R;
    const span = opt.degPerTile(z), cols = Math.ceil(360 / span), rows = Math.ceil(180 / span), T = opt.tile;
    const c0 = Math.floor((lon + 180) / span) - 2, r0 = Math.max(0, Math.min(rows - 4, Math.floor((90 - lat) / span) - 1));
    const key = `${z} ${c0} ${r0}`;
    if (key === patchKey) return;
    patchKey = key; busy = true;
    const cv = document.createElement('canvas'); cv.width = 5 * T; cv.height = 4 * T; const ctx = cv.getContext('2d');
    let ok = 0;
    Promise.all(Array.from({ length: 20 }, (_, i) => new Promise(done => {
      const x = i % 5, y = Math.floor(i / 5), col = ((c0 + x) % cols + cols) % cols, row = r0 + y, img = new Image();
      if (row >= rows) return done();
      img.crossOrigin = 'anonymous';
      img.onload = () => { ctx.drawImage(img, x * T, y * T); ok++; done(); };
      img.onerror = done;
      img.src = opt.url(z, row, col);
    }))).then(() => {
      busy = false;
      if (!ok || key !== patchKey) return;
      const west = -180 + c0 * span, north = 90 - r0 * span, south = Math.max(-90, north - 4 * span);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = g.renderer.capabilities.getMaxAnisotropy();
      /* the canvas runs past the south pole on the last rows: show only the part with picture */
      const vFrac = (north - south) / (4 * span); tex.repeat.set(1, vFrac); tex.offset.set(0, 1 - vFrac);
      /* three.js spheres start at longitude -180 (phi = longitude + 180°) and measure theta from the north pole */
      const geo = new THREE.SphereGeometry(opt.lift, 80, 64, (west + 180) * D2R, 5 * span * D2R, (90 - north) * D2R, (north - south) * D2R);
      if (patch) { patch.geometry.dispose(); patch.material.map.dispose(); patch.material.dispose(); g.body.remove(patch); }
      patch = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -1 }));
      patch.userData.z = z; patch.visible = true;
      g.body.add(patch);
    });
  };
}

/** Night: the half of the body facing away from the Sun shaded, with a soft edge about 6° wide (twilight).
 *  Call shade.update(t) to move the Sun on. */
export function nightShade(t = Date.now()) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sunDir(t) } }, transparent: true, depthWrite: false,
    vertexShader: 'varying vec3 vN; void main() { vN = normalize((modelMatrix * vec4(position, 0.0)).xyz); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 uSun; varying vec3 vN; void main() { float d = dot(normalize(vN), uSun); gl_FragColor = vec4(0.016, 0.027, 0.05, (1.0 - smoothstep(-0.05, 0.05, d)) * 0.66); }',
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.002, 96, 48), m);
  mesh.update = (when = Date.now()) => m.uniforms.uSun.value.copy(sunDir(when));
  return mesh;
}
