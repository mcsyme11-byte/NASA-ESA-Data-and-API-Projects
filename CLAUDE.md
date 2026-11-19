# Instructions for Claude working in this repo

This repository is Malcolm Syme's **NASA and ESA Data Projects**: learning-and-exploring projects built on the open data
and APIs of NASA and ESA (the European Space Agency), one folder each. **Short name: NEDAP** (NASA and ESA Data and
API Projects, decided Nov 14, 2026), used wherever the full name does not fit: the app label under the home-screen
icon, and any other short or abbreviated use.

Everything on the site, by section (the site's own list of pages is `SECTIONS` in `shared/footer.js`; this table, the
README, the Project Record's front page, the About page and `docs/CLAUDE-PROJECT-SETUP.md` must name every live one,
and `dev/check_docs.py` refuses any that is missing):

| Section | Project or tool | Folder | What it is | Live since |
|---|---|---|---|---|
| Project 1 | **Asteroid Tracker** | `asteroid-tracker/` | Near-Earth objects by size and distance: this week, by year, impact risk, visible from here, a search, the solar system map and the **Within reach** mining view (`mining.html`) (NASA/JPL and ESA NEOCC) | Nov 8, 2026 |
| Project 2 | **Image Explorer** | `image-explorer/` | Imagery by date, place and mission: the daily Earth map, the globe and the picture library (NASA GIBS, EONET, Image Library, astronaut photos; ESA/Webb, ESA/Hubble) | Nov 9, 2026 |
| Project 3 | **Mars Data** | `mars-data/` | Weather measured on Mars by Curiosity and Perseverance, cleaned, organised, analysed and charted (NASA PDS) | Nov 12, 2026 |
| Orbit & Space Watch (`space-watch/`) | **Orbit Watch** | `orbit-watch/` | Satellites and space junk on a live globe, close passes and a collision calculator, and how orbit could be cleaned up (CelesTrak; NASA ODPO; ESA Space Debris Office) | Nov 17, 2026 |
| Orbit & Space Watch | **Space Weather** | `space-weather/` | The Sun now: flares, CMEs, the solar wind, storms and the aurora, read live (NASA DONKI, iSWA, SDO; SOHO; NOAA SWPC; GFZ Kp) | Nov 17, 2026 |
| Orbit & Space Watch | **Exoplanets** | `exoplanets/` | How planets around other stars are found, and every confirmed planet (NASA Exoplanet Archive, MAST) | Nov 17, 2026 |
| Orbit & Space Watch | **Planetary Maps** | `planet-maps/` | Zoomable maps of the Moon and Mars with landing sites, rover routes and place names (NASA Solar System Treks) | Nov 17, 2026 |
| Utility | **Sky Finder** | `sky-finder/` | An installable phone web app that points to tonight's passing asteroid | Nov 12, 2026 |
| Utility | **Spacecraft map** | `spacecraft/` | The active spacecraft of NASA, ESA and others, previewed on the home page (data job `spacecraft-data.yml`; facts in `spacecraft/catalogue.json`, checked by hand) | Nov 12, 2026 |

Orbit & Space Watch was planned and published on Nov 17, 2026, one chat and folder per tool; the plan, the approved
sources and what each reuses are in `docs/PROJECT-NOTES.md` and `docs/ROADMAP.md` (section 5). Site pages that are not
projects: the home page, `space-watch/`, `data-collection/`, `control-room/`, `design/` (the component page) and the
information pages (`about/`, `contact/`, `credits/`, `legal/`, `privacy/`, `terms/`).

Shared code and the look are in `shared/`; documents in `docs/`. It is separate from the Flight Deck Suite and Hot Mic
(their own repositories), but shares their look.

**First command in every new copy of the repository:** `sh dev/setup.sh` (switches on the check before every push,
`docs/CHECKS.md`).

**Start every new chat here:** read `docs/PROJECT-NOTES.md` (decisions, how it's built), `docs/ROADMAP.md` (what's
next and every pending to-do), `docs/DATA-SOURCES.md` (APIs, keys, limits) and the latest file in `docs/handoffs/`, if
any (its confirmed answers at the top override older notes). Work on one project at a time, in that project's chat,
inside its own folder.

## Standing rules

- When the developer asks a question ("why…", "what do you think?"), answer it only. Build or change nothing until he
  explicitly says go.
- **Links in every report (decided Nov 18, 2026):** every reply that finishes work on the site ends with links to the
  live pages that were added, updated or fixed, on the site's address
  (`https://mcsyme11-byte.github.io/NASA-ESA-Data-and-API-Projects/` plus the page's path, for example
  `orbit-watch/tracker.html`); changes that are not on a page (scripts, data jobs, documents) are linked on GitHub.
- **Repo-wide and site-wide checks (decided Nov 18, 2026):** any check, review or tidy-up of the whole repository or
  site, and every addition, rename or removal of a project, tool or page, follows `docs/CHECKS.md` step by step: the
  automatic checks, every place that describes the whole site (compared with `SECTIONS` in `shared/footer.js`), the
  page check (`dev/check_pages.py`) at every width, each page by hand, the repository's organisation, and the
  Project Record after pushing. A check is not finished until every step is done; the report lists each step's
  result. When a step finds something a check let through, the check is extended in the same change.
- **The check before every push (decided Nov 18, 2026):** no change reaches the site or the repository until it has
  passed `docs/CHECKS.md`: `git push` runs `.githooks/pre-push` (the wording, style and documents checks, and the page
  check of the pages changed at 375 and 1280 px), and GitHub runs the same checks on every page after the push. A
  failing push is fixed, never forced past (`--no-verify` is not used). A finding that belongs to another chat goes to
  it as a handoff and into `dev/known_issues.json` and `docs/ROADMAP.md`. Before pushing a visual change, the
  screenshots of the pages it touches are also looked at by eye (`docs/CHECKS.md`, step 3), and its rules ("Rules
  learned from the review of Nov 18, 2026") are followed.
- **After every change that's finished and checked,** commit and push it to `main` with a short plain-English commit
  message, and update `docs/ROADMAP.md` (remove what's done: the whole item with its indented lines, never a section
  heading; `dev/check_docs.py` checks the shape), `CHANGELOG.md` and, for milestones, `docs/HISTORY.md`. When a
  project or tool goes live, its row goes into `README.md` and the Project Record's "The projects at a glance"
  (`docs/record/front.md`) in the same change; `dev/check_docs.py` refuses a live one that is missing.
- **Public repository: no secrets, ever.** No API key, password or token in any file. Visitors need no key: data that
  needs one is copied by the GitHub data jobs with repository secrets (`NASA_API_KEY`, `EOL_API_KEY`); web pages call
  NASA only through `shared/nasa.js` (with `DEMO_KEY` for api.nasa.gov; `nasaOpenGet` for NASA's keyless DONKI and iSWA
  services, since Nov 17, 2026); Python run by hand reads `NASA_API_KEY` from `.env` (ignored by
  Git).
- **Public-ready by default:** no personal details in code, docs or tests (no PC or user names, personal paths,
  callsigns or family details); use generic wording and made-up test data. **Exception: always keep "Malcolm Syme"
  and mcsyme11@gmail.com as the developer, copyright and contact credit.**
- **Look:** the Flight Deck Suite's "old money" look (navy, brass, cream, serif type), as set out in `docs/DESIGN.md`
  and `shared/theme.css`. New pages and big visual changes start as mock-ups the developer approves.
- **Logo (decided Nov 17, 2026):** the NEDAP mission patch (`brand/patch/`) is the project's logo everywhere: the
  patch at 64 px and larger, the mark (no lettering) at about 32 to 64 px, the small mark at 16 to 24 px, as set out
  in `brand/patch/README.md` and `docs/DESIGN.md` ("Logo and icons"). Pages reuse the shared copies
  (`shared/emblem.svg` in the top bar, `shared/icons/` for icons; the footer mark is added by `shared/footer.js`) and
  never add a logo of their own; the files are changed only by `brand/patch/build_patch.py`. The credit stays
  "© 2026 Malcolm Syme · mcsyme11@gmail.com"; the NEDAP name and patch are the developer's marks, not covered by the
  MIT License. Never put "NASA" or "ESA" into the logo.
- **Shared components (version 2 of the look, decided Nov 13, 2026):** pages are built only from the components in
  `shared/theme.css`, listed in `docs/DESIGN.md` and shown on the component page (`design/index.html`). Pages carry
  no styles of their own (no `<style>` block, no `style="…"` attribute); project style sheets hold only the inside of
  their tools and never restyle a shared component on its own. A new component is added to the theme and the
  component page first, after an approved mock-up, and every addition to a page says what it replaces or why nothing
  already there fits. `python3 dev/check_styles.py` checks this, and GitHub runs it after every push.
- **Free to run:** static pages on GitHub Pages and free NASA APIs; no paid services.
- **Site pages (since Nov 9, 2026):** every page loads `shared/footer.js`. Since Nov 17, 2026 it builds a **site-map
  footer** on every page from one list (`SECTIONS` in `shared/footer.js`): the NEDAP mark and name with the live data
  status, a column for each part of the site listing its pages, then the copyright with the legal links (Legal,
  Privacy, Terms, Credits, licence, source code) and the credit line. A page keeps only the footer's copyright and
  credit lines in its own HTML (copy them from any page); it never adds links, a logo or other content to the footer.
  **A new page is listed by adding one line to its section in `SECTIONS`** (a page not live yet carries
  `{ soon: true }`, which keeps it out; remove it when the page is published, and give it `added: 'YYYY-MM-DD'`, the
  day it is published, so the menu marks it as new), in the same change as the page, with
  its name in the Back-button list (`NAMES`) of the same file. **Since Nov 19, 2026** a new page, or a page whose
  title or description changes, gets its preview card for shared links by running `python3 dev/build_social.py`
  (`dev/check_docs.py` refuses a page without it); the site search finds new pages by itself. Every page's menu is Home, Asteroids, Mars, Images,
  Space Watch (copy it from any page). **Since Nov 18, 2026** every page of a project with more than one page carries
  the project's tab bar (`nav.tabs.bar`) straight after the page head (Overview first, then every page; `docs/DESIGN.md`,
  "Project tab bar"): a new page is added to the bar on every page of its project in the same change, and a new project folder to
  `TAB_PROJECTS` in `dev/check_styles.py`. The kicker follows DESIGN.md ("Page head"). Pages with live or updated data
  get the reload buttons (`shared/reload.js`, DESIGN.md "Reload buttons"). Each page's
  detailed data credits sit above the footer in `<p class="srcline">` lines, never in the footer. A new data source or library is added to `CREDITS.md` and the Credits
  page (`credits/index.html`) in the same change; anything new the site stores or sends is added to the Privacy page
  first.
- **Version tags on style files (since Nov 9, 2026; project style sheets since Nov 12):** pages link
  `shared/theme.css`, `shared/footer.js` and every project style sheet (`asteroid-tracker/tracker.css`,
  `image-explorer/explorer.css`, `mars-data/mars.css`, `spacecraft/spacecraft.css`, `sky-finder/sky-finder.css`,
  `planet-maps/maps.css`, `space-weather/spaceweather.css`, `orbit-watch/orbit.css`, `exoplanets/exoplanets.css`)
  with one version tag (`?v=YYYYMMDDNN`), and scripts import `shared/datastatus.js` and `shared/reload.js` with the
  same tag. After changing any of them, raise the tag everywhere in one search-and-replace over `.html` and `.js`
  files, with Sky Finder's `VERSION` in `sky-finder/sw.js`, so browsers fetch the new copy instead of an old saved
  one. Since Nov 18, 2026 `dev/check_styles.py` refuses any `?v=` tag in a page or script that differs, and a
  `VERSION` that differs.
- **Feel (since Nov 12, 2026):** everything pressable gives quick feedback (the shared hover and press transitions in
  `shared/theme.css`); tap targets are at least 40 px tall on phones; segmented controls and chip rows that don't
  fit a phone scroll sideways with a soft edge fade (`shared/footer.js` adds it to `.seg`, `.popular` and anything
  marked `data-hscroll`), and tab bars wrap to a second line instead (since Nov 13, 2026), except the bar form `.tabs.bar` of the project tab bars, which scrolls sideways like Space Weather's (since Nov 18, 2026); labels drawn over maps and diagrams get a dark outline; placeholders fit a 375 px phone; every page except the
  site's home page has a Back button (`.backlink#back`).
- **ESA data (decided Nov 9, 2026):** ESA's data is added alongside NASA's where it helps; NASA stays the main source,
  and pages say which agency each number or picture comes from. For every ESA source:
  - check it against ESA's current documentation before building on it (address, format, limits, terms, credit), and
    record it in `docs/DATA-SOURCES.md` (ESA section) with its exact credit line;
  - show ESA's credit wherever its data or pictures appear, in ESA's own form (for example "ESA/DLR/FU Berlin, CC BY-SA
    3.0 IGO", with a link to the licence where one applies), and add the source to `CREDITS.md` and the Credits page
    in the same change;
  - use only material ESA allows: works released under CC BY-SA 3.0 IGO, or ESA's terms for educational and
    informational use; never ESA's logo (it needs ESA's written permission);
  - keep it free to run: no paid ESA services; a free account or key follows the same no-secrets rule as NASA's;
  - if visitors' browsers contact an ESA service directly, add it to the Privacy page first.
- **Respect NASA's and ESA's terms:** show "Data courtesy of NASA" (and ESA where its data is used) and that the
  project isn't endorsed by NASA or ESA; show the GIBS
  acknowledgement wherever GIBS imagery appears; never use NASA's insignia or logotype, or ESA's logo.
- **Check facts about the data:** confirm endpoints, fields and limits against NASA's current documentation before
  building on them, and record anything new in `docs/DATA-SOURCES.md`.
- Quality bar: correct, professional, tested. Check every page at the widths in DESIGN.md, and its empty, loading and
  error states (no results, NASA out of reach, the demo key used up).
- Keep every pending to-do in `docs/ROADMAP.md`; the developer tests at his own pace.
- Explain things with examples and clear, concise, correct notes. When teaching a method, give a clear set of rules
  saying which formula or step to use in which situation.

## Data updates (since Nov 14, 2026)

Automatic data updates for the whole project are looked after by the "Data updates" chat, following
`docs/DATA-UPDATES.md`. That chat owns the scheduled data workflows in `.github/workflows/`, `dev/datajob.py`,
`dev/data_health.py`, `dev/data_jobs.json` and the status files in `shared/data/status/`. Project chats keep their page
code, fetch and cleaning scripts and data sources. Before adding or changing a data job, a schedule, or the format or
place of a data file, follow `docs/DATA-UPDATES.md`: every job keeps the previous file when a source fails, ends with
the `dev/datajob.py` step (data guard, status file, standard commit message) and is listed in `dev/data_jobs.json`.
Problems with schedules, failures and stale data are reported by the daily Data health check in one GitHub issue
labelled `data-health`, and are handled by the Data updates chat.

## Project Record (since Nov 11, 2026)

`docs/NASA and ESA Data Projects - Project Record.pdf` is the whole project as one PDF, built from the repository by
`docs/record/` (see its README). **GitHub rebuilds it automatically** (`.github/workflows/project-record.yml`) after
every push to main and commits it as "Project Record rebuilt (automatic)". Pushes that change only data files
(`asteroid-tracker/data/`, `image-explorer/data/`, `mars-data/data/`: the daily data updates) don't start a rebuild.
So: **never build or commit the PDF yourself** (two builds at once clash). Pull and rebase before every push, since
the automatic commit lands on main. After pushing, check a few minutes later that the automatic commit arrived
(`git fetch` and `git log -1 origin/main`); only if the run failed, fix the cause. **Everything goes in:** every
Markdown or text document in the repository is in the record; one not yet listed in `PARTS`
(`docs/record/build_record.js`) lands in a "Newly added documents" Part by itself. When you add a document, add it to
its proper Part in `PARTS` in the same change. Keep "Where things stand" in `docs/record/front.md` current.

## Protected main branch (since Nov 10, 2026)

`main` has a ruleset that blocks force pushes and its deletion. Pull and rebase before pushing; never force-push. To
undo a change, make a new commit (`git revert <commit>`).

## Writing style

**Rule (decided Nov 8, 2026): all documentation is written in a professional tone, as project documentation, never
in the tone of an AI assistant talking to a person.** No greetings, no "I'll", "we'll", "let's", "happy to", "great
question" or exclamation marks; no addressing the developer; no narrating what a chat did. State facts, decisions,
steps and limits plainly.

Documents, commit messages and code comments are neutral, professional project documentation, not conversation:
"the developer" for Malcolm Syme (his full name and email stay in every credit line), "the user" or "you" in text for
people using the pages. Record decisions as dated facts ("Decided Nov 8, 2026: …"), and describe work by what was
done, not by who in a chat did it. `python3 dev/check_wording.py` checks this, and GitHub runs it after every push.

## Running

```
python3 -m http.server 8000     # then open http://localhost:8000
python3 dev/check_wording.py    # wording, personal details and keys
python3 dev/check_styles.py     # shared components, page styles, version tags and project tab bars
python3 dev/check_docs.py       # every place that describes the site names every live project; roadmap; doc links
python3 dev/check_pages.py      # every page in a browser at every width (Playwright; docs/CHECKS.md, step 3)
python3 dev/check_pages.py --changed   # the pages changed since origin/main, at 375 and 1280 px (run before each push)
sh dev/setup.sh                 # once per copy: the check before every push, and the page check's browser
```
