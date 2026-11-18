# Handoff, Nov 18, 2026: reload buttons, project tab bars and two new checks (all chats)

**Read first. Pull before starting.** Live on main since Nov 18, 2026 (version tag 2026111808).

## 1. Reload buttons (new shared component)

Approved by the developer on Nov 18, 2026. Every page that shows live or updated data gets them; each chat adds them
to its own pages. Space Weather has them already (`space-weather/index.html`, `space-weather/app.js`, `wireReload`)
as the worked example. Full rules: `docs/DESIGN.md`, "Reload buttons"; the component page shows them (Section 10).

- **Page button:** at the end of the page head's `.meta` line, after the "Readings to …" or "Updated …" text:
  `<button class="reload" type="button" id="reloadAll">Reload all the data on this page</button>`
- **Panel button:** in the panel's `.ph`, after the `h3`:
  `<button class="reload small" type="button" id="reloadKp">Reload this chart</button>`
- **Script:** `import { reloadPage, reloadPart, markUpdated } from '../shared/reload.js?v=2026111808';`
  then `reloadPart(button, () => loadThisPart())` for each panel and `reloadPage(button, () => loadEverything())`.
  The function returns a promise; `false` or a rejection shows "Couldn't reload, try again". If the page refreshes
  itself on a timer, call `markUpdated(pageButton)` after each timed refresh.
- The button's text is its screen-reader label: say what it reloads. Don't add an icon, note or styles: the script
  and the theme do that. The 30-second wait between reloads is built in.
- A picture reloaded by hand should be fetched fresh (a new query value), not from the browser's saved copy.

## 2. Project tab bars and kickers

Every page of a project with more than one page now has the project's tab bar, `<nav class="tabs bar" aria-label="<project>">` (Space Weather's sticky form, since Nov 18, 2026), straight after the page head:
Overview first, then every page (`docs/DESIGN.md`, "Project tab bar"). Added on Nov 18, 2026 to the Asteroid Tracker
(overview, and Overview on the other pages), Image Explorer (overview, and Overview on the explorer), Mars Data (all
three pages) and Orbit Watch (all four pages). **A new page goes into its project's bar on every page of the project
in the same change.** A new project folder with more than one page goes into `TAB_PROJECTS` in
`dev/check_styles.py`. The Image Explorer's tab buttons lost `role="tab"` (a link now sits in the same bar).

Kickers, one form: an overview says "Project 1" (2, 3), or links "Orbit & Space Watch" to `../space-watch/`; every
other page links "Project 1 · Asteroid Tracker" or "Orbit & Space Watch · Orbit Watch" to its project's overview.

## 3. New checks after every push

- `python3 dev/check_styles.py` now refuses any `?v=` tag in a page **or script** that differs (raise the tag in
  `.html` and `.js` files together, with Sky Finder's `VERSION`), and a page missing its project's tab bar.
- `python3 dev/check_docs.py` (new): every live project or tool must have its row in `README.md` and in the Project
  Record's "The projects at a glance" (`docs/record/front.md`); `docs/ROADMAP.md` must keep its numbered sections,
  have no finished `[x]` items and no indented line left alone. **When removing a finished roadmap item, remove the
  whole item with its indented lines and nothing else.** The Mars Data heading had been deleted that way.

## 4. Small fixes made in project folders (for the owners' information)

- `mars-data/charts/index.html`: the dust-storm chart's "dust reaches Gale" label is "dust arrives" on narrow charts
  and moves to the line's left near the right edge.
- `exoplanets/charts.js`: shorter axis titles on charts narrower than 420 px.
- `asteroid-tracker/tracker.css`: links in `.neo` tables have a 40 px tap area on phones.
- `shared/theme.css`: one-column layouts (`.split`, `.panels`, `.cards`) use `minmax(0, 1fr)`, so a wide child no
  longer makes a page wider than the phone; the footer's layout follows its own width.

## 5. Repo-wide checks (added later on Nov 18, 2026)

`docs/CHECKS.md` is the fixed procedure for any repo-wide or site-wide check, and for adding, renaming or removing a
project, tool or page. `python3 dev/check_docs.py` now refuses a live project or tool missing from CLAUDE.md's table,
the README, the Project Record's front page, the About page, the home page and app descriptions or
`docs/CLAUDE-PROJECT-SETUP.md`. `python3 dev/check_pages.py` checks every page in a browser at every width.
