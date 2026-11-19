# Repo-wide and site-wide checks

The fixed procedure for checking the whole repository and the whole site (decided Nov 18, 2026, after a repo-wide check
left CLAUDE.md, the About page, the home page's description, the app description and the Claude project text still
naming three projects a day after Orbit & Space Watch went live). It is written down so that no step depends on memory.

## The check before every push (decided Nov 18, 2026)

Every copy of the repository runs `sh dev/setup.sh` once, before its first commit. From then on `git push` first runs
`.githooks/pre-push`: step 1 below in full and the page check (step 3) for the pages the push changes (all pages when a
file in `shared/` changed), at 375 and 1280 px. A push that fails is not sent; the findings are fixed and the push is
repeated. When a push is refused only because another chat pushed first, pull with rebase and push again: the
hook remembers changes that already passed the page check and does not run it again for them. `git push --no-verify` is not used. GitHub runs step 1 and the page check of every page after every push
(`.github/workflows/checks.yml`), so a copy without the hook is still caught. A finding that belongs to another chat
is handed to it and listed, with its owner and date, in `dev/known_issues.json` and `docs/ROADMAP.md`: the page check
then shows it as known and does not fail on it, and reports it as overdue after 14 days.

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
python3 dev/check_docs.py       # every place below names every live project; roadmap shape; links between documents;
                                # every page's preview card tags (dev/build_social.py --check)
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

Since Nov 18, 2026 it also reports skipped heading levels, table values shown as cards on a phone without their label,
links in running text that are not underlined, rows scrolled sideways on arrival for no reason, misused `aria-`
attributes, layout shift above 0.1 as the page loads (Google's "good" limit), and pages that load more than their
weight budget on arrival (`WEIGHT_KB` and `WEIGHT_OK` in the script). Screenshots are taken with reduced motion, so
sections that rise into view are in them.

Every finding is fixed or explained. Known and accepted: `bad: 404 …/data/…` for a data job that has not run yet
(reported to the Data updates chat). The screenshots of every new or changed page are looked at, at 375 and 1280 px:
cut each long screenshot into strips side by side so the text can be read, and look at the top bar, the Back button,
the page head, the tab bar, every section, the credits and the footer.

**Speed, by hand, for a new or much changed tool:** Lighthouse (in Chrome's developer tools, or
`npx lighthouse <address> --only-categories=performance,accessibility`) on a phone setting. Aim: performance 90 or
more, accessibility 100, no long task over 200 ms while the page is idle. Big parts (a 3D globe, a 5 MB list) load
when they are opened, not with the page; animations stop while they are off the screen or the tab is hidden.

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

## Rules learned from the review of Nov 18, 2026

The site-wide review of Nov 18, 2026 (every page at seven widths, read by eye, with the page check, axe-core and
Lighthouse) found the problems below. Each is fixed, and each became a rule. The page check or the style check
enforces the ones marked (auto).

**Accessibility**
1. Buttons that switch a view use `aria-pressed`; `aria-selected` belongs only to `role="tab"`, `role="option"` and
   rows of a selectable list. Table rows never carry `aria-expanded` (auto). (The tracker, Image Explorer, Planetary
   Maps and the spacecraft list had both.)
2. Heading levels never skip: h1, then h2, then h3. A section with no visible heading gets `<h2 class="sr">`; a small
   heading inside a fact box, a step or a callout is an h3 (the theme gives it the small size) (auto).
3. A link inside running text is underlined (the theme does it for `p`, `li`, `figcaption`, `.note` and `.caption`);
   never tell a link from text by colour alone (auto).
4. Every table heading has text (an `.sr` label for a column of buttons); a chart is `role="img"` with an
   `aria-label`; `role="tabpanel"` goes on a `div` around a list, never on the list; a `div` with an `aria-label` has a
   `role` (auto for headings).

**Layout**
5. Every value of a table that becomes cards on a phone carries its label (`data-l` on `.table.stack`, `data-label` on
   `table.neo`); a cell that holds only a button needs none (auto).
6. Rules for links inside table cells (bigger tap areas) never apply to `.btn` or `.chip`.
7. Long column headings wrap (`th.r` is not kept on one line) and tables use tighter cells on tablets, so a wide
   table fits 768 px (auto: page wider than the screen).
8. A control kept beside a title (the reload button) stays on the title's line; the title gives way, and a note under
   it takes its own line only while it shows.
9. In the footer the " · email" part never breaks apart (`shared/footer.js` keeps it together).
10. A picture that cannot be loaded is hidden with its figure, never shown as its description in a frame
    (`shared/footer.js`, for every page without its own error handling; the figure goes too when the picture sits
    inside a link in it) (auto, since Nov 18, 2026: `brokenimg`).
11. A bar held at the bottom of the screen has a solid background behind its button; text never shows through.
12. A sideways row is scrolled on arrival only when its chosen item is out of view, measured against the row itself
    (auto).
13. Names copied from a source keep no codes meant for machines (CelesTrak's "[+]", "[-]" and "[P]" after a name).

**Loading and speed**
14. Nothing jumps as the page loads (layout shift under 0.1) (auto): tiles, stats and filter buttons that a script
    fills are written into the page first with "…" placeholders of the same size; a line that a script fills is
    written with a placeholder of about its final length; the class `loading` (the shared placeholder) is never put
    on `main` or a whole section.
15. Big parts load only when they are opened: Image Explorer's globe and three.js (about 2 MB) load with the Globe
    tab, not with the Earth map (auto: weight budget).
16. Animations draw only while they are on the screen and the tab is visible, and move thousands of points no more
    often than the eye needs (Orbit Watch's globe: up to ten times a second at normal speed).

**Words**
17. When a tool goes live, every "coming soon", "in preparation" or "as it goes live" about it goes in the same change
    (`dev/check_docs.py` checks the project lists; the words on the Space Watch page are read in step 2).

**The checks themselves**
18. The page check measures each page fresh (a change of `#view` alone does not reload a page) and with reduced
    motion (sections that rise into view are otherwise empty in the screenshots).
19. Whatever marks the current page or view (the footer, a tab bar) follows a switch of view inside the page, not only
    the address the page was opened at (auto: the page check switches views and compares the footer's mark).
