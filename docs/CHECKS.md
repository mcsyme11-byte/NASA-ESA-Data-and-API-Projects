# Repo-wide and site-wide checks

The fixed procedure for checking the whole repository and the whole site (decided Nov 18, 2026, after a repo-wide check
left CLAUDE.md, the About page, the home page's description, the app description and the Claude project text still
naming three projects a day after Orbit & Space Watch went live). It is written down so that no step depends on memory.

## When it is used

- whenever a repo-wide or site-wide check, review or tidy-up is asked for;
- after a project, tool or page is added, renamed or removed (steps 1, 2 and 4 at least);
- before a large change across several projects is reported as finished.

## How it is used

1. Every step below is done, in order. A check is not finished while any step is left out.
2. Every finding is fixed in the same change, or written into `docs/ROADMAP.md` with the reason it waits (for example a
   missing data file that the Data updates chat produces).
3. When a finding shows that a document or check let the problem through, the document or check is corrected too, so
   the same problem is caught automatically next time (a line in `dev/check_docs.py`, `dev/check_styles.py` or this
   list).
4. The report to the developer lists each step with what was found and fixed, or "nothing found", and ends with links
   to the pages changed (CLAUDE.md, "Links in every report").

## The one list of what is on the site

`SECTIONS` in `shared/footer.js` is the list of every live page, by section. Every other description of the site is
compared with it. A page not yet published carries `{ soon: true }` there and is left out everywhere else.

## Step 1. The automatic checks

All three pass with no problems (GitHub runs them after every push; run them by hand first):

```
python3 dev/check_wording.py    # professional wording, no personal details, no keys
python3 dev/check_styles.py     # shared components only, no page styles, one version tag, project tab bars
python3 dev/check_docs.py       # every place below names every live project; roadmap shape; links between documents
```

## Step 2. Every place that describes the whole site

Each is read and compared with `SECTIONS`. `dev/check_docs.py` checks the names in the places marked (auto); the
wording, the descriptions and the dates are read by hand in all of them.

| Place | What it must hold |
|---|---|
| `CLAUDE.md`, the table at the top (auto) | A row for every live project and tool: section, name, folder, what it is, live since; the list of site pages under it |
| `README.md` (auto) | Every project and tool in its tables with a link and its data sources; the folder tree with every folder; no "three projects" |
| `docs/record/front.md` (auto) | The opening sentence; a row per project and tool in "The projects at a glance", none called "Planned" once live; "Where things stand" current to the day |
| `about/index.html` (auto) | Every project and tool named and linked under "The projects" |
| `index.html` (auto) | The `<meta name="description">` naming the three projects and Orbit & Space Watch; the lede; a card or link for every project and tool |
| `site.webmanifest` (auto) | The `description` naming the three projects and Orbit & Space Watch |
| `space-watch/index.html` (auto) | A linked card for every Orbit & Space Watch tool |
| `docs/CLAUDE-PROJECT-SETUP.md` (auto) | The project description and instructions naming every project and tool, and the list of chats. When this changes, the developer is told to paste the new text into the Claude project's settings |
| `shared/footer.js` (auto) | `SECTIONS`: every live page, `soon: true` gone once published; `NAMES`: a Back-button name for every page |
| `docs/record/build_record.js` (auto) | Every project's README in `PARTS`, in the site's order; every new document in its proper Part |
| `docs/PROJECT-NOTES.md` | A section per project or tool with its decisions; dated decisions for anything new |
| `docs/DATA-SOURCES.md` | Every source each live page uses, checked against the agency's documentation, with its credit line |
| `CREDITS.md` and `credits/index.html` | Every data source and library, the same in both |
| `privacy/index.html` | Every outside service that visitors' browsers contact, and anything the site stores |
| `data-collection/index.html` and `dev/data_jobs.json` | Every scheduled data job (owned by the Data updates chat: findings go to it as a handoff) |
| `docs/DESIGN.md` and `design/index.html` | Every shared component in `shared/theme.css`, listed and shown; every class in `SHARED` of `dev/check_styles.py` |
| Each project's own `README.md` | Its pages and files as they are in its folder |
| `docs/ROADMAP.md` | Nothing finished left in it; every pending item from the last changes added |

## Step 3. The page check

`dev/check_pages.py` opens every page and view in a real browser at 320, 375, 390, 768, 1024, 1280 and 1440 px, with
other sites out of reach, and reports pages wider than the screen, text cut off or running off the screen, chart
labels cut off, text on top of text, small tap targets on phones, missing names and labels, script errors and missing
files. It writes a screenshot of every page.

```
pip install playwright && python3 -m playwright install chromium     # once
python3 dev/check_pages.py                                           # every page, every width
FAILDATA=404 python3 dev/check_pages.py --widths 375,1280            # the site's own data files failing too
```

Every finding is fixed or explained. Known and accepted: `bad: 404 …/data/…` for a data job that has not run yet
(reported to the Data updates chat). The screenshots of every new or changed page are looked at, at 375 and 1280 px.

## Step 4. Each page, by hand

New pages in detail, the others quickly; at a phone and a computer width:

1. **Top bar:** the NEDAP mark and name, and the menu Home, Asteroids, Mars, Images, Space Watch, with the page's own
   part marked.
2. **Back button** (`.backlink#back`) on every page except the home page, going to the right page with the right name.
3. **Page head:** the kicker in the form of DESIGN.md ("Page head"), one `h1`, the lede.
4. **Project tab bar** (`nav.tabs.bar`) on every page of a project with more than one page, straight after the page
   head: Overview first, then every page, the page shown marked, the same on every page of the project.
5. **Reload buttons** on a page with live or updated data: the page button at the end of the "Readings to …" line,
   a small one beside each panel's title that loads its own data (DESIGN.md, "Reload buttons").
6. **Credits:** `p.srcline` lines above the footer with each agency's credit, "Data courtesy of NASA" (and ESA where
   its data is used), and that the project is not endorsed by NASA or ESA; the GIBS acknowledgement wherever GIBS
   imagery appears.
7. **Footer:** only the copyright and credit lines in the page's own HTML; `shared/footer.js` builds the rest.
8. **States:** loading, empty (no results), the data file missing, NASA out of reach and the demo key used up all show
   a clear message in the page's own words.
9. **Look:** built only from shared components; nothing overlapping, cut off or crowded; even spacing.

## Step 5. The repository's organisation

1. Every folder of pages has a `README.md`; every document is in the Project Record's `PARTS`.
2. No stray files: no mock-ups, temporary or generated files left in the repository, no `.env`, no keys.
3. `CHANGELOG.md` has an entry for every change, newest first; `docs/HISTORY.md` has the milestones.
4. Handoffs in `docs/handoffs/` are named `YYYY-MM-DD - <who> - <subject>.md`; the newest one says what is current.
5. The version tag is the same everywhere (step 1 checks it).

## Step 6. After pushing

1. `gh run list` shows Checks and Project Record passing; the commit "Project Record rebuilt (automatic)" has arrived.
2. The rebuilt Project Record is opened: the cover names every project and tool, the front page and Contents are
   current, nothing in "Newly added documents" that belongs in a Part.
3. The changed pages are opened on the live site (`https://mcsyme11-byte.github.io/NASA-ESA-Data-and-API-Projects/`).
