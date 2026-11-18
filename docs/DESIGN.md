# Design guide — "old money", under a night sky

NASA and ESA Data Projects share the look of the developer's other projects (the Flight Deck Suite and Hot Mic): navy,
brass and cream, serif type; calm and precise, like a well-kept paper logbook. The one addition is a quiet night sky:
a faint field of brass and cream stars behind the home page and the Contact page.

**Version 2 (decided Nov 13, 2026).** The site was rebuilt on one shared set of components after pieces added page by
page had left several versions of the same thing (four kinds of tiles, three tables, three "How to read this" boxes,
page styles inside most pages). Since then:

- every component exists **once**, in `shared/theme.css`, and is shown on the component page, `design/index.html`
  (open it at `/design/` on the site);
- pages use only those components; a project style sheet holds only **the inside of its tools** (see "Page styles");
- a new component is added to `shared/theme.css` and the component page first, after a mock-up the developer approves,
  **saying which existing piece it replaces or why none fits**;
- `python3 dev/check_styles.py` checks this, and GitHub runs it after every push.

## 1. Principles

1. **Calm and readable at a glance.** Real headings, big numbers, small labels, short notes.
2. **A box means something.** A card (`.card`) is a thing you open; a panel (`.panel`) holds one chart, map or table;
   a control box (`.ctl`) holds a group of settings beside a tool. Writing, figures and lists sit on the page itself.
3. **Numbers people can picture.** "3.2 Moon distances", "as wide as two football fields", next to the exact value.
4. **Brass is for meaning, not decoration.** Kickers, labels, the main button, the chosen state, the first chart series.
5. **Plain English.** Every science word explained the first time it appears (sol, Ls, LD).
6. **Honest data.** Estimates look like estimates (ranges, "about"), gaps in the data stay visible, and every chart
   says where its numbers came from.
7. **Nothing added without something considered for removal.** A new section or control says what it replaces; if it
   repeats what is already on the page (a list of what the page can do beside cards that say the same), it is left out.

## 1a. Logo and icons

Decided Nov 17, 2026: the **NEDAP mission patch** is the project's logo everywhere, replacing the planet-and-ring
emblem (Nov 8 to Nov 17, 2026). The files, the drawing script and the rules are in `brand/patch/` (its README).

| Size | Version | Where |
|---|---|---|
| 64 px and larger | The patch (`brand/patch/nedap-patch.svg`; 512 and 1024 px PNG copies) | Above the centred page heads (home and Contact, `.medal`, 150 px, 120 px on phones), the README, the Project Record cover, the component page |
| About 32 to 64 px | The mark, no lettering (`nedap-mark.svg`; `shared/emblem.svg` as a symbol) | The top bar (32 px), the home-screen icon |
| 16 to 24 px | The small mark, a solid asteroid (`nedap-mark-small.svg`; `shared/icons/favicon.svg`) | The browser tab, the start of the footer's copyright line (20 px) |

- **Icons:** `shared/icons/` holds `favicon.svg` and `favicon-32.png` (the browser tab), and `icon.svg` with its
  copies `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (180 px, square: iOS rounds the corners) and
  `maskable-512.png` (square, the mark inside the central safe circle): the mark on the night-sky tile, labelled
  NEDAP. Every page outside Sky Finder links them, with `site.webmanifest`.
- **Sky Finder** (`sky-finder/icons/`) keeps its own icon, the same tile with Sky Finder's sight: it is an app of its own.
- The lettering is outlines, never live text. Below 64 px the ring lettering can't be read, so only the marks are used.
- No page adds a logo of its own; the patch and the marks are used unchanged (no recolouring, stretching, cropping
  or effects), with clear space of at least a tenth of their width.
- The credit stays "© 2026 Malcolm Syme · mcsyme11@gmail.com" everywhere. The NEDAP name and patch are the developer's
  marks and are not covered by the MIT License (`LICENSE.md`); no ™ or ® sign until a trademark search and legal
  advice (`brand/patch/README.md`).

## 2. Colour

| Role | Token | Value |
|---|---|---|
| Background (navy) | `--bg` | `#141B26` |
| Bars, fields | `--bg2` | `#0F1520` |
| Card / card on hover | `--card` / `--card2` | `#1A2333` / `#1E2839` |
| Panels: charts, maps, tables, image frames | `--deep` | `#0C1119` |
| Hairline / stronger border | `--line` / `--line2` | `#2A3446` / `#3A465C` |
| **Brass** (kickers, accents, main button) | `--brass` | `#C0A062`; bright `#E2C88E`; dim `#7E6A45` |
| Cream text / secondary / muted | `--ink` / `--ink2` / `--muted` | `#EDE6D3` / `#B4AFA2` / `#98A0AB` |
| Faint (disabled, placeholders) | `--faint` | `#5E6775` |

**Status:** good `#8FB996`, problem `#C9675A`, caution `#D1A956`, information and ESA `#8AA9C9`.

**Page background:** navy with a faint brass glow at the top.

## 3. Type

- **Everything is serif:** `Georgia, "Palatino Linotype", "Book Antiqua", Palatino, serif`.
- **Numbers:** `lining-nums tabular-nums`, so digits line up and don't jump as they change.
- **Three heading sizes and five text sizes**, nothing in between:

| Use | Size (phone) | Class |
|---|---|---|
| Page title | 46 px (34); tool pages 38 px (30) | `h1`, `.pagehead.compact` |
| Section heading | 30 px (25) | `h2` |
| Card, panel and step title | 21 px (19); in a panel 18 px | `h3` |
| Lede, under the page title | 20 px (18) | `.lede` |
| Body | 17 px | |
| Small | 14.5 px | `.small` |
| Caption, note, aside (italic, muted) | 13.5 px | `.caption`, `.note`, `.aside` |
| Kicker, label, tab, button (small capitals) | 11–12 px | `.kicker`, `.label`, `.lbl`, `.tabs`, `.btn` |

**Small capitals only for kickers, labels, tabs and buttons, never as a section's heading.** Every section has a real
`h2`. The one exception is the small title of a control box (`.ctl > h2`), which names a group of settings.

## 4. Spacing and shape

- **One spacing scale:** 4, 8, 12, 16, 24, 32, 48, 72 px (`--sp1` to `--sp8`; on phones 48 and 72 become 36 and 52).
  Every margin and padding is one of these.
- Content at most 1200 px wide, with a 32 px gutter (16 px on phones). Decided Nov 13, 2026: left-aligned text
  (paragraphs, ledes, notes) runs the full width of the content; only a two-column layout (`.split`) narrows it.
  Centred text (the centred page heads, empty and loading states) stays narrower, at most 40 em, with its lines
  balanced to even lengths. Headings are balanced too, and paragraphs never end on a single word.
- Sections are 72 px apart (52 on phones); a section's heading sits 24 px above its content.
- Corners: 4 px on buttons, fields and segmented controls; 6 px on cards, panels and boxes; round on chips and badges.
- No drop shadows except on things that float (tooltips, the picture viewer, suggestion lists).

## 5. Components

All in `shared/theme.css`, all shown on `design/index.html`. Use these; do not restyle them in a page.

| Component | Class | Use |
|---|---|---|
| Top bar | `.topbar`, `.brand` › `.emblem` + `.bname`, `.nav` | Sticky, 60 px; the NEDAP mark (32 px, `shared/emblem.svg`); the menu: Home, Asteroids, Mars, Images, Space Watch. Every label stays on one line: the site's name shows from 881 px, the Home link from 761 px (the mark is the way home), small phones close the letters up |
| Back | `.backlink#back` | Above the page head on every page except the site's home page; the arrow is drawn by the style sheet; named for the previous page by `shared/footer.js` |
| Page head | `header.pagehead` › `.kicker`, `h1`, `.lede`, `.meta` | `.compact` for tool pages, `.center` for the home and Contact pages, `.medal` for the NEDAP patch above a centred head. The kicker (decided Nov 18, 2026): a project's overview says "Project 1" (2, 3), a Space Watch tool's overview links "Orbit & Space Watch" to `space-watch/`; every other page links "Project 1 · Asteroid Tracker" or "Orbit & Space Watch · Orbit Watch" to its project's overview |
| Section | `section.section` › `.section-head` › `div` (`.kicker` + `h2`), then `.aside` or a button | `.section-head.sub` for a heading inside a tool view |
| View heading | `.viewhead` › `h2`, `.lede` | The top of one tab of a tool |
| Stats | `.stats` › `.stat` › `.label`, `.value` (unit in `small`), `.note` | A strip of up to five figures, not boxes; `.tiles`/`.tile` are the same component under their older names |
| Cards | `.cards` (`.three`, `.two`) › `a.card` › `.kicker`, `h3`, `p`, `.foot` (badges + `.go`) | Something you open; the whole card is the link. `.card.feature` adds a picture on top (`.media`); `.card.muted` is a dashed card for something planned |
| Panel | `.panel` › `.ph` (`h3` + `.aside`), `.pb` (`.flush` for tables), `.pf`, `details.howto` | One chart, map or table; `.panels` lays them out two across (`.wide` spans both) |
| How to read this | `details.howto` › `summary` + paragraphs | At the foot of a panel, or as a box of its own; closed by default |
| Control box | `.ctl` › `h2` (small title), controls, `.caption` | A group of settings beside a tool (the Earth map's layers, the globe's selection) |
| Buttons | `.btn`, `.btn.outline`, `.btn.quiet`; `.small` | Primary (brass), outline, quiet; `.ghost` is the older name of `.outline` |
| Text button | `.linkbtn` | An underlined action inside text ("Try again") |
| Segmented control | `.seg` › `button` (or `.chip`), optional `.lbl` inside | One choice of a few (a time step, a view, a distance); scrolls sideways with a fade if it does not fit |
| Chips | `.chips` › `.chip[aria-pressed]` | Filters that turn on and off independently |
| Quick picks | `.searchopts` › `.popular` › `.barlbl` + `.chip` | A labelled row of chips under a search box (popular searches, missions); scrolls sideways on phones. Moved into the theme from the Asteroid Tracker's style sheet on Nov 17, 2026, unchanged, as both projects use it |
| Tabs | `nav.tabs` | The views of one tool; wrap to a second line when they don't fit; one brass underline glides to the current tab (`.glides`, `.glide`, set up by `shared/motion.js`, since Nov 18, 2026) |
| Project tab bar | `nav.tabs.bar[aria-label="<project>"]` › `a` (`aria-current="page"` on the page shown), or the tool's view buttons | Decided Nov 18, 2026: on every page of a project with more than one page, straight after the page head: Overview first, then every page (or view) of the project, the same on each page. A view that is switched in the page (the tracker's This week, the Image Explorer's Earth map) is a `button[data-view]` there and a link (`tracker.html#risk`) everywhere else. Single-page tools (Space Weather, Planetary Maps) need none; Space Weather's "On this page" bar is the same component. `.bar` (since Nov 18, 2026, Space Weather's form made shared): the bar stays under the top bar while the page scrolls, on the top bar's background across the gutters; on phones it is one row that scrolls sideways with the edge fade, the current tab scrolled into view. A page with its own sticky section menu (Mars Data's charts) lets the project bar scroll away. `dev/check_styles.py` checks that each page has its project's bar with a link to every other page, and that a new folder with more than one page is added to its list |
| Reading progress | `.readbar` › `i` (added to the top bar by `shared/motion.js`) | A thin brass line along the foot of the top bar, filled as far as the page has been read. Every page except the legal, professional and technical ones (`SKIP` in `shared/motion.js`), Sky Finder, and pages with `<body data-nomotion>`; only on pages longer than a screen and a half. Added Nov 18, 2026; replaces nothing |
| Back to top | `button.totop` (added by `shared/motion.js`) | A round button at the bottom right, shown after a screen and a half of scrolling, whose ring fills with the reading progress. Same pages as the progress line. Added Nov 18, 2026; replaces nothing |
| Rising sections | `.section.reveal`, `.shown` (set by `shared/motion.js`) | Each section below the first screen fades up 16 px the first time it shows. Same pages; never for visitors who ask for less motion, nor in print. Added Nov 18, 2026 |
| Numbers that count up | `.stat .value`, `.tile .value` (set up by `shared/motion.js`) | The tile's number counts up from zero over 0.9 s the first time it shows with a plain number in it (keeping its decimals, sign and thousands commas); later live changes show as they are. Same pages as the progress line; never for visitors who ask for less motion. Added Nov 18, 2026 |
| Pointer glow | `.card.glow`, `.panel.glow` (set by `shared/motion.js`) | On a computer, a soft brass glow follows the pointer over cards and panels. Same pages. Added Nov 18, 2026 |
| Updated notice | `.toasts` › `.toast` (`.bad`), from `toast(text)` in `shared/motion.js` | A small notice at the bottom left for 3 seconds, "Updated 13:20" after live data refreshes, or a failure in red; read out politely by screen readers. Added Nov 18, 2026 for Space Weather; any page with live data may use it |
| Period bar | `.periodbar` › `.seg`, `.period` (`.lbl` + `strong` or a field), `.grow`, a button | Step through weeks, years or days |
| Filters | `.filters` › `.seg`, `label` + `select`/`input`, `.count` | The filter row above a chart or list |
| Fields | `input`, `select`, `.field` | 44 px, dark, brass ring on focus |
| Search box | `label.bigsearch` › icon `svg`, `input[type=search]`, `.qclear` | Clear appears once there is something to clear; `.large` for a page's main search |
| Badges | `.badge`, `.badge.nasa`, `.badge.esa`, `.badge.live`, `.badge.warn` | The agency of a source, a status; `.pill`, `.tag`, `.agency` are older names of the same component |
| What you need | `.need.n-eye`, `.n-bino`, `.n-small`, `.n-large`, `.n-faint` | What is needed to see an object in the sky (Asteroid Tracker and Sky Finder), one colour per instrument |
| Notices | `.notice`, `.notice.warn`, `.notice.error` | A message with an icon, and an action button at the end |
| States | `.state`, `.empty`, `.loading` | No results, loading, could not be loaded |
| Tables | `table.table` (`.stack` turns rows into cards on phones), `table.credits` | Brass small-capital headings, hairline rows; `.r` right-aligns numbers |
| Writing | `.prose`, `.summary`, `.updated`, `.list`, `.facts` › `.f`, `.terms` (`dt`/`dd`), `.steps` | Reading pages, short facts beside text, a glossary, numbered steps |
| Sources | `.sources` › `.s` › `.n` (name + badge), `.d`, `.u` | Where a project's data comes from |
| Two columns | `.split` | Reading on the left, facts on the right |
| Level scale | `.levels` › `span` (the step's number; `.on`, `.on.mid`, `.on.high`, `.mark`) | A reading on a scale of steps, filled up to it, the steps that matter outlined in brass (Space Weather's Kp and the Kp a place needs). Added Nov 17, 2026; replaces nothing |
| Chart parts | `svg.chart` (`.grid`, `.axt` axis titles, `.dim`), `.legend` (`.s1`–`.s6` swatches), `.tip` | Axis text, gridlines, a chart's key and its tooltip |
| Callout, stage | `.pf.callout` › `.t` + a button; `a.stage` › `canvas` | A line of text with one action, at the foot of a panel; a canvas that fills a panel and opens something |
| Data credits | `p.srcline` | A page's detailed credits, just above the footer |
| Footer | `footer.footer` › `.copy`, `.fnote` in the page; `shared/footer.js` builds the rest: `.fmap` › `.fbrand` (NEDAP mark, name, `.ftag`, the live status) and `nav.fcols` › `details.fcol` (`summary.fhead`, the page links), then `.flegal` (the copyright, `nav.flinks`) | Decided Nov 17, 2026: the site map on every page, from the one list `SECTIONS` in `shared/footer.js`; the page you are on is marked. The layout follows the footer's own width (since Nov 18, 2026, so a narrow page such as Sky Finder gets the narrow layout on a computer too): narrower than 1136 px the name sits above the columns, narrower than 837 px the columns are in rows of three; on phones (760 px and below) each section folds and opens from its heading |
| Live data status | `.light[data-state]`, `.fbottom` › `.fnote` + `a.livestatus` › `.light`, `.ls-t`, `.ls-s`; `.board` › `.board-head`, `ol.jobs` › `li.job` › `.light`, `.job-meta`, `.job-srcs` › `.srcstate`, `dl.job-when`, `.job-side` › `.job-state`, `.ticks` › `i[data-r]` | Added Nov 14, 2026 (the developer waived the mock-up). The state of the automatic data updates (`shared/datastatus.js`): `data-state` is `ok` (green), `updating` (brass, pulsing rings), `late` or `partial` (amber), `failed` (red) or `unknown` (grey). The footer line sits on the credit line's row, opposite it, in the footer's own type (revised Nov 14, 2026, from a separate pill below the footer, which looked out of place); the board is on How the data is collected (`data-collection/`). Replaces nothing: no earlier component shows a state that changes while the page is open |
| Reload buttons | `button.reload` (page head) and `button.reload.small` (a panel's `.ph`), wrapped by `shared/reload.js` in `.reloader` with an `.rnote`; in a panel header the title and button sit in `.phtitle` | Added Nov 18, 2026 (mock-up approved that day). On a page with live or updated data: `.reload` at the end of the page head's `.meta` line, after the "Readings to …" text, reloads all of the page's data without reloading the page; `.reload.small` beside a panel's title reloads only that panel. Write the button with its label as text (`<button class="reload small" type="button">Reload this chart</button>`); `reloadPage(button, load)` and `reloadPart(button, load)` add the circular-arrow icon, keep the text as the screen-reader label and tooltip, spin the icon and disable the button while loading, then show "Updated hh:mm" (the visitor's clock, fading after 6 seconds) or "Couldn't reload, try again". `load` returns a promise; false or a rejection counts as failed. Clicks within 30 seconds of a reload (10 after a failure) are ignored, to spare NASA's, ESA's and NOAA's servers; a page reload spins the panel buttons too and starts their wait; `markUpdated(button)` records a reload made by the page's own timer. 30 px (34 on phones), 26 px small, each with a 40 px tap area. Replaces nothing: no earlier component fetches a page's data again without reloading the page |

## 6. Page styles

Decided Nov 13, 2026: **a page adds no styles of its own** (no `<style>` block, no `style="…"` attribute). A project's
style sheet (`asteroid-tracker/tracker.css`, `image-explorer/explorer.css`, `mars-data/mars.css`,
`spacecraft/spacecraft.css`, `sky-finder/sky-finder.css`, `planet-maps/maps.css`, `orbit-watch/orbit.css`, `exoplanets/exoplanets.css`) holds only the inside of its tools: the chart drawing, the
maps and their buttons, the orbit diagram, the globe, the picture viewer, the asteroid tables. It may adjust a shared
component inside its own parts (`.mapbar .seg`, `.chip.play`), never restyle one on its own (`.btn { … }`). Values a
script works out from data (a key's colour, a tooltip's position) are set by the script.

Sky Finder is a home-screen app with its own app bar and full-screen view; its style sheet keeps those, on the same
colours, type and buttons.

## 7. Charts

- **Background** `--deep` (the panel), gridlines `--line`, axis text 11 px muted serif, axis titles in brass capitals.
- **Series colours, in order:** brass `#C0A062`, blue `#8AA9C9`, green `#8FB996`, copper `#C9784A`, lilac `#B79AC8`,
  amber `#D1A956` (`--s1` to `--s6`). Never more than six; group the rest as "Other".
- **Highlight** with brass-bright `#E2C88E`; everything else dims.
- **Hazard / warning** uses `--red` only for things that are actually flagged (for example NASA's "potentially
  hazardous" flag), never for decoration.
- **Every chart** sits in a panel with a title, units on its axes, a source line under it, a tooltip with exact values
  and a "How to read this". Colour is never the only way to tell series apart (labels or shapes too).
- **Estimates** (asteroid diameters) are drawn as a range (a bar from min to max), not one point.
- **Agencies:** every source line names the agency the numbers come from (NASA, NASA/JPL, ESA). No agency logos or
  agency colours; NASA and ESA data share the same series colours.
- **Labels drawn over maps and diagrams** get a dark outline (canvas `strokeText`, SVG `paint-order: stroke`).

## 8. Screen sizes

Everything must look right at 320, 375, 390 (phones), 768, 1024 (tablets), 1280 and 1440 (computers).

## 9. Accessibility

- Text contrast at least 4.5 : 1 (cream and brass on navy both pass).
- Every control reachable and usable from the keyboard, with a visible brass focus ring.
- Images have descriptions (NASA's own captions where there are); decorative pictures have empty `alt`.
- One `h1` per page; headings in order.
- Motion is never needed to understand anything, and stops with "reduce motion".

## 10. Feel (decided Nov 12, 2026; version 2 since Nov 13)

- **Feedback:** everything pressable changes colour or border over 0.15 s on hover; buttons, chips and segments move
  down 1 px while pressed; cards and pictures lift 2 px on hover. "Reduce motion" turns this off.
- **Tap targets:** at least 40 px tall on phones (44 px for the main buttons and fields).
- **Rows that don't fit:** segmented controls and chip rows scroll sideways on phones with a soft fade on the side where
  there is more, and the chosen button scrolled into view (`shared/footer.js`: `.seg`, `.popular`, `[data-hscroll]`).
  Tabs wrap instead.
- **Fields:** a brass ring on focus; date pickers, dropdowns and scrollbars drawn dark (`color-scheme: dark`); short
  placeholders that fit a 375 px phone.
- **The top bar** is solid, so nothing shows through it while scrolling.

## 11. Quality checklist (every change)

1. `python3 dev/check_styles.py` and `python3 dev/check_wording.py` pass.
2. Look at the page at all the widths above, with real data, with the data missing and with NASA out of reach.
3. No console errors.
4. At 320 and 375 px: nothing runs off the screen, nothing is cut off inside its box, tap targets are 40 px or taller.
5. Hover, press and focus look right on every control.
6. The page uses only the components above; anything new went through the component page first.
