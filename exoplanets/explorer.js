// NASA and ESA Data Projects · Exoplanets · every confirmed planet (explorer.html) · © 2026 Malcolm Syme ·
// mcsyme11@gmail.com
//
// The list of every confirmed planet (data/planets.json) with search, filters and sorting, and one planet's page
// (explorer.html?p=<name>): its system to scale with the habitable zone, and the sums behind its verdict.

import { fmt, sig, esc, dateText, GROUPS, groupOf, METHOD_NAMES, PC_LY, NASA_HZ, TEFF_RANGE, zones,
  loadPlanets, planetUrl, archiveUrl, sizeCell } from './data.js';
import { system, hideTip } from './charts.js';

const $ = (s) => document.querySelector(s);
const PAGE = 50;
const st = { d: null, q: '', method: 'all', hz: false, small: false, sort: 'dist', shown: PAGE, pick: null };

function failed(e) {
  $('#notice').innerHTML = `<div class="notice error" role="alert"><span class="t">The planet list could not be loaded (${esc(e.message)}). Check the connection, then try again.</span><button class="btn outline small" type="button" id="retry">Try again</button></div>`;
  $('#retry').addEventListener('click', () => location.reload());
  $('#list tbody').innerHTML = '<tr><td colspan="7"><div class="empty">Nothing to show yet.</div></td></tr>';
}

// ---- the list ----
const zoneCell = (p) => (p.hz_nasa === 1 ? 'Yes' : p.hz_temp === 2 ? 'Yes, with the star’s temperature'
  : p.hz_temp === 1 ? 'Optimistic only' : p.hz_nasa === 0 ? 'No' : '—');
const distCell = (p) => (p.dist ? `${sig(p.dist * PC_LY, p.dist * PC_LY < 100 ? 2 : 3)} ly` : '—');
const yearCell = (p) => (!p.period ? '—' : p.period < 1000 ? `${sig(p.period, 3)} d` : `${sig(p.period / 365.25, 3)} yr`);

function filtered() {
  const q = st.q.trim().toLowerCase();
  const g = st.method === 'all' ? null : GROUPS.find((x) => x.id === st.method);
  return st.d.list.filter((p) => (!g || g.codes.includes(p.method))
    && (!st.hz || p.hz_nasa === 1 || p.hz_temp === 2) && (!st.small || p.small === 1)
    && (!q || p.name.toLowerCase().includes(q) || p.host.toLowerCase().includes(q)));
}
const SORTS = {
  dist: (a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9),
  year: (a, b) => b.year - a.year || a.name.localeCompare(b.name),
  name: (a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }),
  radius: (a, b) => (b.radius ?? -1) - (a.radius ?? -1),
  period: (a, b) => (a.period ?? 1e12) - (b.period ?? 1e12),
};
function render() {
  const list = filtered().sort(SORTS[st.sort]);
  $('#count').textContent = `${fmt(list.length)} ${list.length === 1 ? 'planet' : 'planets'}`;
  const rows = list.slice(0, st.shown);
  $('#list tbody').innerHTML = rows.length ? rows.map((p) => `<tr data-p="${esc(p.name)}"${st.pick === p ? ' aria-selected="true"' : ''}>
      <td data-l="Planet"><a href="${planetUrl(p.name)}">${esc(p.name)}</a></td>
      <td data-l="Found by">${esc(METHOD_NAMES[p.method])}<span class="s">${p.year}</span></td>
      <td data-l="Size (Earth = 1)" class="r">${sizeCell(p)}</td>
      <td data-l="Year" class="r">${yearCell(p)}</td>
      <td data-l="Starlight (Earth = 1)" class="r">${p.light !== null ? sig(p.light, 2) : '—'}</td>
      <td data-l="Distance" class="r">${distCell(p)}</td>
      <td data-l="Habitable zone">${zoneCell(p)}</td></tr>`).join('')
    : '<tr><td colspan="7"><div class="empty">No planets match. Try a shorter name, or turn a filter off.</div></td></tr>';
  $('#more').hidden = list.length <= st.shown;
  $('#more').textContent = `Show ${fmt(Math.min(PAGE, list.length - st.shown))} more`;
}

// ---- one planet ----
function show(p, scroll) {
  st.pick = p;
  hideTip();
  if (!p) { $('#planet').hidden = true; return; }
  $('#planet').hidden = false;
  document.title = `${p.name} · Exoplanets · NASA and ESA Data Projects`;
  $('#pKicker').textContent = `${METHOD_NAMES[p.method]} · ${p.year}`;
  $('#pName').textContent = p.name;
  $('#pArchive').href = archiveUrl(p.host);
  const sys = st.d.byHost.get(p.host) || [p];
  $('#sysTitle').textContent = sys.length > 1 ? `The ${p.host} system, ${sys.length} planets` : `${p.host} and its planet`;
  system($('#sys'), p.host, sys, p);
  const z = zones(p.teff, p.slum);
  $('#sysCap').textContent = `NASA Exoplanet Archive. ${z.nasa.a_in ? `Habitable zone by NASA's rule: ${sig(z.nasa.a_in, 2)} to ${sig(z.nasa.a_out, 2)} au from this star` : 'The star’s luminosity is not known, so its habitable zone is not drawn'}` +
    `${z.cons && z.cons.a_in ? `; with its temperature, ${sig(z.cons.a_in, 2)} to ${sig(z.cons.a_out, 2)} au` : ''}.`;
  const stats = [
    { label: 'Size', value: p.radius && p.radius_kind === 'measured' ? `${sig(p.radius, 3)} <small>Earths</small>` : p.mass && p.mass_kind !== 'est' ? `${p.mass_kind === 'msini' ? '≥ ' : ''}${sig(p.mass, 3)} <small>Earths</small>` : p.radius ? `${sig(p.radius, 3)} <small>Earths</small>` : '—',
      note: p.radius && p.radius_kind === 'measured' ? 'radius, from the transit' : p.mass && p.mass_kind === 'msini' ? 'minimum mass, from radial velocity' : p.mass && p.mass_kind === 'mass' ? 'mass' : p.radius ? 'radius, estimated from the mass' : 'not measured' },
    { label: 'Year', value: p.period ? yearCell(p).replace(/ (d|yr)$/, ' <small>$1</small>').replace('<small>d</small>', '<small>days</small>').replace('<small>yr</small>', '<small>years</small>') : '—', note: p.a ? `${sig(p.a, 3)} au from its star` : 'orbit size not known' },
    { label: 'Starlight', value: p.light !== null ? sig(p.light, 3) : '—', note: 'of what Earth gets' },
    { label: 'Distance', value: p.dist ? `${sig(p.dist * PC_LY, 3)} <small>ly</small>` : '—', note: p.dist ? `${sig(p.dist, 3)} parsecs` : '' },
  ];
  $('#pStats').innerHTML = stats.map((t) => `<div class="stat"><div class="label">${t.label}</div><div class="value">${t.value}</div><div class="note">${t.note}</div></div>`).join('');
  $('#pSums').innerHTML = sums(p, z);
  $('#pFacts').innerHTML = [
    ['Found', `${esc(METHOD_NAMES[p.method])}, ${p.year}${p.facility ? ` · ${esc(p.facility)}` : ''}`],
    ['Its star', [p.teff ? `${fmt(p.teff)} K` : null, p.srad ? `${sig(p.srad, 3)} × the Sun's radius` : null, p.smass ? `${sig(p.smass, 3)} × the Sun's mass` : null].filter(Boolean).join(' · ') || 'not known'],
    ['In the sky', p.ra !== null ? `right ascension ${raText(p.ra)}, declination ${decText(p.dec)}${p.vmag ? ` · magnitude ${sig(p.vmag, 3)}${p.vmag <= 6 ? ', visible to the eye from a dark site' : p.vmag <= 9 ? ', visible with binoculars' : ''}` : ''}` : 'not known'],
    ['System', `${p.npl} known planet${p.npl === 1 ? '' : 's'}`],
  ].map(([h, t]) => `<div class="f"><h4>${h}</h4><p>${t}</p></div>`).join('');
  render();
  if (scroll) $('#planet').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const raText = (deg) => { const h = deg / 15, hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${hh}h ${String(mm % 60).padStart(2, '0')}m`; };
const decText = (deg) => `${deg < 0 ? '−' : '+'}${fmt(Math.abs(deg), 1)}°`;

/** The worked sums behind the habitable-zone verdict, with this planet's numbers. */
function sums(p, z) {
  if (p.light === null) return `<h3>Is it in the habitable zone?</h3><p>Not known: the archive has neither the starlight this planet gets nor both its star's luminosity and its orbit.</p>`;
  const out = ['<h3>Is it in the habitable zone?</h3>'];
  if (p.light_from === 'c') {
    out.push(`<p><b>1. The starlight it gets.</b> <span class="sum">S = L ÷ a² = ${sig(z.L, 3)} ÷ ${sig(p.a, 3)}² = <b>${sig(p.light, 3)}</b></span> of what Earth gets (L in Suns, a in au).</p>`);
  } else {
    out.push(`<p><b>1. The starlight it gets.</b> The archive gives <span class="sum"><b>S = ${sig(p.light, 3)}</b></span> of what Earth gets${z.L && p.a ? `; from the star's luminosity and the orbit, <span class="sum">L ÷ a² = ${sig(z.L, 3)} ÷ ${sig(p.a, 3)}² = ${sig(z.L / p.a ** 2, 3)}</span>` : ''}.</p>`);
  }
  const inN = p.light >= NASA_HZ.s_out && p.light <= NASA_HZ.s_in;
  out.push(`<p><b>2. NASA's rule.</b> <span class="sum">${sig(NASA_HZ.s_out, 3)} ≤ S ≤ ${sig(NASA_HZ.s_in, 4)}</span>: ${sig(p.light, 3)} is <b>${inN ? 'inside' : p.light > NASA_HZ.s_in ? 'too much, inside the inner edge' : 'too little, outside the outer edge'}</b>.</p>`);
  if (z.cons) {
    const c = z.cons, o = z.opt, inC = p.light >= c.s_out && p.light <= c.s_in, inO = p.light >= o.s_out && p.light <= o.s_in;
    out.push(`<p><b>3. With the star's temperature</b> (${fmt(p.teff)} K): the edges move to <span class="sum">${sig(c.s_out, 3)} ≤ S ≤ ${sig(c.s_in, 3)}</span> (conservative) and ${sig(o.s_out, 3)} to ${sig(o.s_in, 3)} (optimistic). ${sig(p.light, 3)} is <b>${inC ? 'inside' : inO ? 'inside the optimistic zone only' : 'outside'}</b>.</p>`);
  } else if (p.teff) {
    out.push(`<p><b>3. With the star's temperature:</b> not worked out, because the formula covers stars of ${fmt(TEFF_RANGE[0])} to ${fmt(TEFF_RANGE[1])} K and this one is ${fmt(p.teff)} K.</p>`);
  }
  out.push(`<p class="caption">${p.small === 1 ? 'It is about Earth’s size, so it could be rocky.' : p.radius && p.radius_kind === 'measured' && p.radius > 1.6 ? 'It is larger than 1.6 Earths across, so it is probably not rocky: more likely a world with a thick atmosphere of hydrogen and helium, or water.' : p.mass && p.mass_kind !== 'est' && p.mass > 10 ? 'It is heavier than 10 Earths, so it is probably a gas giant, not a rocky planet.' : 'Its size is not well enough known to say whether it is rocky.'} The zone tells only whether the starlight is right; not whether there is water.</p>`);
  return out.join('');
}

// ---- controls ----
function fromUrl(scroll) {
  const name = new URLSearchParams(location.search).get('p');
  const p = name ? st.d.byName.get(name) : null;
  show(p || null, scroll && !!p);
  if (name && !p) $('#notice').innerHTML = `<div class="notice warn" role="status"><span class="t">No confirmed planet is called “${esc(name)}” in the archive's list.</span></div>`;
}
function pick(name) {
  history.pushState(null, '', planetUrl(name));
  fromUrl(true);
}
$('#list').addEventListener('click', (e) => {
  const tr = e.target.closest('tr[data-p]'); if (!tr) return;
  if (e.target.closest('a') && (e.metaKey || e.ctrlKey || e.shiftKey)) return;
  e.preventDefault();
  pick(tr.dataset.p);
});
addEventListener('popstate', () => fromUrl(false));
let qt;
$('#q').addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { st.q = $('#q').value; st.shown = PAGE; render(); }, 120); });
$('#method').innerHTML = [{ id: 'all', label: 'All' }, ...GROUPS].map((g, i) => `<button type="button" aria-pressed="${i === 0}" data-m="${g.id}">${g.id === 'other' ? 'Timing and other' : g.label}</button>`).join('');
$('#method').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  $('#method').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  st.method = b.dataset.m; st.shown = PAGE; render();
});
for (const id of ['hz', 'small']) {
  $('#' + id).addEventListener('click', () => {
    st[id] = !st[id];
    $('#' + id).setAttribute('aria-pressed', st[id]);
    st.shown = PAGE; render();
  });
}
$('#sort').addEventListener('change', () => { st.sort = $('#sort').value; st.shown = PAGE; render(); });
$('#more').addEventListener('click', () => { st.shown += PAGE; render(); });
let rt;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (st.pick) system($('#sys'), st.pick.host, st.d.byHost.get(st.pick.host), st.pick); }, 150); });

(async () => {
  try { st.d = await loadPlanets(); } catch (e) { failed(e); return; }
  $('#updated').textContent = `Planet list as of ${dateText(st.d.updated)}, from the NASA Exoplanet Archive. Choose a planet for its system and its habitable-zone sums.`;
  fromUrl(true);
  render();
})();
