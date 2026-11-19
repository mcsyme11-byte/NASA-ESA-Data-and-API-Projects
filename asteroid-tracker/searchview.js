// NASA and ESA Data Projects · Asteroid Tracker · the Search tab · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Results appear after every letter typed. The first search loads data/neos.json (about 43,000 asteroids) once;
// after that each keystroke is answered from memory in a few milliseconds.

import { searchNames, countMatches, resultCard, decodeCode } from './search.js';
import { COL } from './skymap.js';
import { fmt } from './format.js';

const READY = '<div class="state small">Type a name or a code to search the whole list, or choose a year.</div>';

export function mountSearch(root, loadRows) {
  // the search box, the first lines and the guide are written into tracker.html (#view-search), so the view
  // opens at its full height before the list arrives (Nov 19, 2026)
  const q = root.querySelector('#q'), out = root.querySelector('#results'), more = root.querySelector('#rmore');
  const ysel = root.querySelector('#qyear'), decodeBar = root.querySelector('#qdecode');
  const now = new Date().getUTCFullYear();
  // the years since 1990 go between "Any year" and the decades, which are written into the page
  ysel.options[0].insertAdjacentHTML('afterend', Array.from({ length: now - 1989 }, (_, i) => now - i).map((y) => `<option value="y${y}">${y}</option>`).join(''));
  const keepFor = (v) => {
    if (!v) return null;
    if (v === 'before1950') return (r) => r[COL.found] && r[COL.found] < 1950;
    const n = Number(v.slice(1));
    return v[0] === 'y' ? (r) => r[COL.found] === n : (r) => r[COL.found] >= n && r[COL.found] < n + 10;
  };
  let rows = null, loading = null, fresh = false;
  const ensure = () => {
    if (rows) return Promise.resolve(rows);
    if (!loading) {
      if (!out.querySelector('.state')) out.innerHTML = '<div class="state small">Loading the list of asteroids…</div>';
      loading = loadRows(fresh).then((r) => { rows = r; root.querySelector('#qcount').textContent = ` (${fmt(r.length)})`; if (out.querySelector('.state')) out.innerHTML = READY; return r; })
        .catch(() => { loading = null; out.innerHTML = '<div class="notice warn"><span class="t">The list of asteroids could not be loaded.</span><button class="btn outline small" data-retry>Try again</button></div>'; throw new Error('load'); });
    }
    return loading;
  };
  const show = () => {
    const text = q.value, yv = ysel.value, keep = keepFor(yv);
    const code = decodeCode(text.replace(/[()]/g, ''));
    decodeBar.hidden = !code;
    if (code) decodeBar.innerHTML = `<b>${text.trim().replace(/[<>&"()]/g, '').toUpperCase()}</b> means: ${code.text}.`;
    if (!text.trim() && !keep) { out.innerHTML = rows ? READY : '<div class="state small">Loading the list of asteroids…</div>'; more.textContent = ''; return; }
    ensure().then((r) => {
      if (q.value !== text || ysel.value !== yv) return;   // a newer keystroke or choice has taken over
      const t0 = performance.now(), hits = searchNames(r, text, 24, keep), total = countMatches(r, text, keep);
      out.innerHTML = hits.length ? hits.map((k) => resultCard(r[k])).join('')
        : `<div class="state small">${text.trim() ? `No near-Earth object matches “${text.replace(/[<>&"]/g, '')}”${keep ? ' in that year' : ''}. Try fewer letters, or a code such as 2004 MN4.` : 'None found in that year.'}</div>`;
      const what = text.trim() ? 'matches' : `found ${ysel.options[ysel.selectedIndex].text.replace(/^(\d)/, 'in $1')}, biggest first`;
      more.textContent = total > hits.length ? `Showing the best ${hits.length} of ${fmt(total)} ${what}. Type more letters to narrow it down.` : total ? `${fmt(total)} ${total === 1 && text.trim() ? 'match' : what}.` : '';
      out.dataset.ms = (performance.now() - t0).toFixed(1);
    }).catch(() => {});
  };
  const clear = root.querySelector('#qclear');
  q.addEventListener('input', () => { clear.hidden = !q.value; show(); });
  clear.addEventListener('click', () => { q.value = ''; clear.hidden = true; show(); q.focus(); });
  q.addEventListener('focus', () => { ensure().catch(() => {}); });
  ysel.addEventListener('change', show);
  q.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const a = out.querySelector('a.rmain'); if (a) location.href = a.href; }
    if (e.key === 'ArrowDown') { const a = out.querySelector('a.rmain'); if (a) { e.preventDefault(); a.focus(); } }
  });
  out.addEventListener('keydown', (e) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const links = [...out.querySelectorAll('a.rmain')], i = links.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const j = i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1);
    if (j < 0) q.focus(); else if (links[j]) links[j].focus();
  });
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]'); if (b) { q.value = b.dataset.q; clear.hidden = false; show(); q.focus(); }
    if (e.target.closest('[data-retry]')) { ensure().then(show).catch(() => {}); }
  });
  // the reload button: read the list again (checking with the server for a newer copy), then show the same search
  const reload = () => { rows = null; loading = null; fresh = true; return ensure().then(() => { fresh = false; show(); return true; }, () => { fresh = false; return false; }); };
  return { focus: () => q.focus(), set: (v) => { q.value = v; clear.hidden = !v; show(); }, reload };
}
