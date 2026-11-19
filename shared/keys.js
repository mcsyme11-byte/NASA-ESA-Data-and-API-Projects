// NASA and ESA Data Projects · the list of keyboard shortcuts · © 2026 Malcolm Syme · mcsyme11@gmail.com
//
// Opened with the ? key (added Nov 19, 2026); shared/footer.js loads this file only when it is first needed. The keys
// themselves are handled in shared/footer.js (shortcuts), so this panel lists only what works on the page that is open:
//   / or Ctrl+K (Cmd+K)   the site search (shared/search.js)
//   ?                     this list
//   1 to 9                the project's tabs, in the order of its tab bar (nav.tabs.bar)
//   ← and →               the previous and next period, on tools whose buttons carry data-key="prev" and "next"
//   Esc                   closes a panel
// None of them act while the visitor is typing in a box or using a control that takes the keys itself.

let dlg;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const label = (el) => (el.getAttribute('aria-label') || el.title || el.textContent || '').trim().replace(/\s+/g, ' ');

function rows() {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  let h = '<div class="grouph">Everywhere</div>'
    + `<dt><kbd>/</kbd> or <kbd>${mac ? '⌘' : 'Ctrl'}</kbd> <kbd>K</kbd></dt><dd>Search the site</dd>`
    + '<dt><kbd>?</kbd></dt><dd>This list of shortcuts</dd>'
    + '<dt><kbd>Esc</kbd></dt><dd>Close a panel</dd>';
  const tabs = [...document.querySelectorAll('nav.tabs.bar:not(.sub):not([data-spy]) a[href]')].slice(0, 9);
  if (tabs.length > 1) {
    h += '<div class="grouph">On this page</div>';
    tabs.forEach((a, i) => { h += `<dt><kbd>${i + 1}</kbd></dt><dd>${esc(label(a))}</dd>`; });
  }
  const prev = document.querySelector('[data-key="prev"]'), next = document.querySelector('[data-key="next"]');
  if (prev || next) {
    if (tabs.length <= 1) h += '<div class="grouph">On this page</div>';
    if (prev) h += `<dt><kbd>←</kbd></dt><dd>${esc(label(prev))}</dd>`;
    if (next) h += `<dt><kbd>→</kbd></dt><dd>${esc(label(next))}</dd>`;
  }
  return h;
}

export function openKeys() {
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.className = 'dlg';
    dlg.setAttribute('aria-labelledby', 'keysTitle');
    document.body.append(dlg);
    dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.closest('.close')) dlg.close(); });
  }
  dlg.innerHTML = '<div class="shead2"><h2 id="keysTitle">Keyboard shortcuts</h2><button type="button" class="close" aria-label="Close">×</button></div>'
    + `<div class="sbody"><dl class="keylist">${rows()}</dl></div>`;
  if (!dlg.open) dlg.showModal();
  dlg.querySelector('.close').focus();
}
