// NASA and ESA Data Projects · shared · the same controls on every map · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Every map, globe and sky chart of the site sits in a map card (docs/DESIGN.md, "Map card"; version 2 of Nov 20, 2026)
// and gets its controls from this file, so they look and work the same everywhere:
//
//   bottom right, in a column:  [extra buttons of the map]  +  −  ⟲ (back to the starting view)  ⛶ (full screen)
//   to their left:              the arrow pad (↑ ← → ↓), which moves the map (from 761 px; phones drag instead)
//   keyboard, on the map:       + and − zoom, the arrow keys move, 0 or Home goes back to the start, F full screen,
//                               Esc leaves full screen
//   bottom left:                the hint (how to use the map), which fades after the first use
//
//   import { mapFrame } from '../shared/mapframe.js?v=…';
//   const mf = mapFrame(frameEl, {
//     zoomIn, zoomOut,          functions; zoom by one step
//     reset,                    back to the starting view
//     pan(dx, dy),              move one step: dx −1 left … 1 right, dy −1 up … 1 down (leave out: no arrow pad)
//     resize,                   called after the frame changes size (full screen on or off)
//     hint: 'Drag to turn …',   the hint's words (leave out: no hint)
//     extra: [buttonEl, …],     the map's own buttons, placed above the standard ones (class "mbtn")
//     keys: false,              the map handles + − arrows itself (the default: this file handles them when the map
//                               itself did not)
//   });
//   mf.used()                   fades the hint (call it on the first drag, tap or zoom)
//   mf.isFull()                 whether the map fills the screen
//
// Full screen uses the browser's own where it allows it for a part of the page, and otherwise makes the map fill the
// window (.pseudo-full; iPhone Safari). The frame gets tabindex 0 so the keys work once it is clicked or tabbed to.

const ICON = {
  reset: '<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path d="M4.5 10a5.5 5.5 0 1 0 1.7-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M4 2.8v4h4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  open: '<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path d="M3 8V3h5M12 3h5v5M17 12v5h-5M8 17H3v-5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  close: '<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path d="M8 3v5H3M17 8h-5V3M12 17v-5h5M3 12h5v5" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
  arrow: '<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M10 4 4 12h12z" fill="currentColor"/></svg>',
};

function button(cls, label, html, title = label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'mbtn ' + cls;
  b.setAttribute('aria-label', label);
  b.title = title;
  b.innerHTML = html;
  return b;
}

export function mapFrame(frame, api = {}) {
  if (!frame) return { used() {}, isFull: () => false };
  frame.classList.add('mapframe');
  if (!frame.hasAttribute('tabindex')) frame.tabIndex = 0;

  // the standard buttons, replacing any the page had
  frame.querySelectorAll(':scope > .ovl-zoom, :scope > .ovl-pad, :scope > .ovl-hint').forEach((el) => el.remove());
  const zoom = document.createElement('div');
  zoom.className = 'ovl ovl-zoom';
  zoom.setAttribute('role', 'group');
  zoom.setAttribute('aria-label', 'Map controls');
  for (const el of api.extra || []) { el.classList.add('mbtn'); zoom.append(el); }
  const zIn = button('m-in', 'Zoom in', '+'), zOut = button('m-out', 'Zoom out', '−');
  const home = button('m-reset', 'Back to the starting view', ICON.reset, 'Back to the starting view (0)');
  const full = button('m-full', 'Full screen', ICON.open, 'Full screen (F)');
  if (api.zoomIn) zoom.append(zIn, zOut);
  if (api.reset) zoom.append(home);
  zoom.append(full);
  frame.append(zoom);

  let pad = null;
  if (api.pan) {
    pad = document.createElement('div');
    pad.className = 'ovl ovl-pad';
    pad.setAttribute('role', 'group');
    pad.setAttribute('aria-label', 'Move the map');
    for (const [dir, dx, dy] of [['up', 0, -1], ['left', -1, 0], ['right', 1, 0], ['down', 0, 1]]) {
      const b = button('pad-' + dir, 'Move ' + dir, ICON.arrow);
      b.addEventListener('click', () => { api.pan(dx, dy); used(); });
      pad.append(b);
    }
    frame.append(pad);
  }

  let hint = null;
  if (api.hint) {
    hint = document.createElement('div');
    hint.className = 'ovl ovl-hint';
    hint.textContent = api.hint;
    frame.append(hint);
  }
  const used = () => { if (hint) hint.classList.add('gone'); };

  const act = (fn) => () => { if (fn) fn(); used(); };
  zIn.addEventListener('click', act(api.zoomIn));
  zOut.addEventListener('click', act(api.zoomOut));
  home.addEventListener('click', act(api.reset));

  // full screen
  const isFull = () => document.fullscreenElement === frame || frame.classList.contains('pseudo-full');
  const sync = () => {
    const on = isFull();
    full.innerHTML = on ? ICON.close + '<span>Exit</span>' : ICON.open;
    full.classList.toggle('wide', on);
    full.setAttribute('aria-label', on ? 'Exit full screen' : 'Full screen');
    full.title = on ? 'Exit full screen (Esc)' : 'Full screen (F)';
    frame.classList.toggle('is-full', on);
    requestAnimationFrame(() => { if (api.resize) api.resize(); window.dispatchEvent(new Event('resize')); });
  };
  const leavePseudo = () => { frame.classList.remove('pseudo-full'); document.body.classList.remove('noscroll'); sync(); };
  const toggle = () => {
    if (document.fullscreenElement === frame) { document.exitFullscreen(); return; }
    if (frame.classList.contains('pseudo-full')) { leavePseudo(); return; }
    const fallback = () => { frame.classList.add('pseudo-full'); document.body.classList.add('noscroll'); sync(); };
    if (frame.requestFullscreen) frame.requestFullscreen().catch(fallback); else fallback();
  };
  full.addEventListener('click', () => { toggle(); used(); });
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && frame.classList.contains('pseudo-full')) leavePseudo(); });

  // keys on the map, when the map itself did not use them
  frame.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest('input, select, textarea, .ovl-find')) return;
    const k = e.key;
    if (k === 'f' || k === 'F') { e.preventDefault(); toggle(); return; }
    if (api.keys === false) return;
    if ((k === '+' || k === '=') && api.zoomIn) { e.preventDefault(); api.zoomIn(); used(); }
    else if ((k === '-' || k === '_') && api.zoomOut) { e.preventDefault(); api.zoomOut(); used(); }
    else if ((k === '0' || k === 'Home') && api.reset) { e.preventDefault(); api.reset(); used(); }
    else if (api.pan && k.startsWith('Arrow')) {
      e.preventDefault();
      api.pan(k === 'ArrowLeft' ? -1 : k === 'ArrowRight' ? 1 : 0, k === 'ArrowUp' ? -1 : k === 'ArrowDown' ? 1 : 0);
      used();
    }
  });
  frame.addEventListener('pointerdown', used, { once: true });
  frame.addEventListener('wheel', used, { once: true, passive: true });

  shadeSide(frame.closest('.mapcard'));
  return { used, isFull, toggle };
}

// A still drawing (an SVG chart, such as a star map) made to move like a map (Nov 20, 2026): drag to move, the wheel
// or the buttons to zoom (1× to 8×), back to the start. It moves the drawing as a whole, so it keeps working when the
// chart is drawn again. Pass the result to mapFrame:  mapFrame(frame, { ...svgView(svg), hint: '…' }).
// the column beside the map scrolls when it holds more than the map's height: its edges fade where there is more
// (data-more="above", "below" or both; docs/DESIGN.md, "Map card")
function shadeSide(card) {
  const side = card && card.querySelector(':scope .mapside');
  if (!side || side.dataset.shade) return;
  side.dataset.shade = '1';
  const mark = () => {
    const more = [];
    if (side.scrollTop > 4) more.push('above');
    if (side.scrollHeight - side.scrollTop - side.clientHeight > 4) more.push('below');
    if (more.join(' ') !== (side.dataset.more || '')) side.dataset.more = more.join(' ');
  };
  side.addEventListener('scroll', mark, { passive: true });
  new ResizeObserver(mark).observe(side);
  new MutationObserver(() => requestAnimationFrame(mark)).observe(side, { childList: true, subtree: true });
  mark();
}

export function svgView(el) {
  const host = el.parentElement;
  let k = 1, x = 0, y = 0, drag = null;
  el.style.transformOrigin = '50% 50%';
  el.style.transition = 'transform .2s';
  const apply = () => { el.style.transform = k === 1 && !x && !y ? '' : `translate(${x}px, ${y}px) scale(${k})`; };
  const zoomBy = (f) => { k = Math.max(1, Math.min(8, k * f)); if (k === 1) { x = 0; y = 0; } apply(); };
  host.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.ovl, button, input, a')) return;
    drag = [e.clientX - x, e.clientY - y];
    el.style.transition = 'none';
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener('pointermove', (e) => { if (!drag) return; x = e.clientX - drag[0]; y = e.clientY - drag[1]; apply(); });
  const end = () => { drag = null; el.style.transition = 'transform .2s'; };
  host.addEventListener('pointerup', end);
  host.addEventListener('pointercancel', end);
  host.addEventListener('wheel', (e) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.25 : 0.8); }, { passive: false });
  return {
    zoomIn: () => zoomBy(1.5),
    zoomOut: () => zoomBy(1 / 1.5),
    reset: () => { k = 1; x = 0; y = 0; apply(); },
    pan: (dx, dy) => { x -= dx * host.clientWidth * 0.2; y -= dy * host.clientHeight * 0.2; apply(); },
  };
}
