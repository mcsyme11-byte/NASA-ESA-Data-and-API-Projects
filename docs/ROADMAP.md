# Roadmap

What's next, as of November 8, 2026. Every pending to-do lives here; items are done at the developer's own pace.
Everything finished moves to [CHANGELOG.md](../CHANGELOG.md).

## 0. Repository (set up Nov 8, 2026)

- [ ] The developer pastes the description and instructions of `docs/CLAUDE-PROJECT-SETUP.md` (updated Nov 18, 2026)
  into the Claude project's settings; the project's description there still names only three projects.
- [ ] Before any trademark filing: a trademark search on "NEDAP" (a company called Nedap N.V. exists) and advice from
  a trademark lawyer on the name and the patch (`brand/patch/README.md`).
- [ ] **Ideas for the look and feel, for the General chat (proposed Nov 18, 2026; each needs a mock-up the developer
  approves):**
  - A site search (opened with `/` or Ctrl+K): every page, project and tool, and later an asteroid or mission by
    name, as a panel over the page.
  - The "On this page" bar of Space Weather (shared `.tabs`, staying under the top bar) as a shared option for every
    long page (the Asteroid Tracker's overview, Mars Data, Planetary Maps' place list).
  - Smooth changes between pages (the browser's View Transitions between documents), the top bar staying in place.
  - A "Copy link to this section" button beside each section heading, for sharing one part of a page.
  - Keyboard shortcuts in the tools (arrows for the previous and next period, numbers for tabs), listed in a small
    panel opened with `?`.
  - Loading shapes matched to what is loading (a chart's outline, a table's rows, a tile's number) instead of one
    shimmer for everything.
  - A small dot in the menu for tools published since the visitor's last visit (kept in the browser only; Privacy
    page first).
  - Preview cards for shared links (an Open Graph picture and text per page), in the NEDAP look.
- [ ] Reload buttons (shared component, Nov 18, 2026; Space Weather has them): each project chat adds them to its own
  pages with live or updated data, following `docs/DESIGN.md` ("Reload buttons") and the handoff of Nov 18, 2026.

## 1. Asteroid Tracker (version 1 live Nov 8, 2026)

- [ ] **Developer testing, Sky Finder outdoors at night** (everything else in the Nov 12–13, 2026 additions passed
  on Nov 14, 2026): calibration on the Moon or a planet and the Calibrate button's dot turning green; the markers
  lining up with the real Moon, planets and bright stars; an asteroid's diamond and path; switching target with the
  row of names in the camera view; the ISS or Tiangong passes.
- [ ] Spacecraft map: Tianwen-1 (Horizons id -9901491 holds only its cruise, to Feb 10, 2021), Tianwen-2 and
  Chang'e 7 are not in Horizons now, and CelesTrak does not return TESS; they appear by themselves if either service
  lists them later. All four are known notes in `dev/data_jobs.json` (Chang'e 7 since Nov 15, 2026), so the health
  check leaves them out.
- [ ] Spacecraft map, more past missions as they end or as Horizons adds routes (for example Swift and other
  Earth-orbit craft have no route in Horizons; Chandrayaan-1's route there begins only in 2016).
- [ ] When the `data-health` issue reports the "risk-lists" source failing (ESA calls its automated access
  experimental, so a change of format stops the step and the previous files are kept), fix `fetch_risk.py`.
- [ ] Optional: if ESA's credit form or terms for the NEOCC figures are in doubt, ask the NEOCC by email
  (`neocc@esa.int`) and record the answer in `docs/DATA-SOURCES.md`.
- [ ] Hera: once ESA confirms the arrival at Didymos, update its line in `MISSIONS` (`asteroid-tracker/reach.js`).

## 2. Image Explorer (version 1 live Nov 9, 2026; home page Nov 12)

- [ ] Picture library: tune the ranking further as the developer reviews searches (the weights are in `scoreOf` in
  `image-explorer/app.js`; second and third rounds applied Nov 17, 2026).
- [ ] Further rounds of changes to the globe, as the developer reviews it.

## 3. Mars Data (live Nov 12, 2026)

Plan confirmed Nov 11, 2026 (see PROJECT-NOTES.md): three missions, updated automatically by a GitHub Actions job.

**Data and analysis**
- [ ] After the first scheduled run of the "Mars data" job succeeds: delete the one-off probe (`mars-data/probe/`),
  the branch workflows (`mars-probe.yml`, `mars-chunks.yml`, `mars-meda.yml`, `mars-mex.yml`, on the `mars-probe`
  branch) and the `mars-probe` branch itself.
- [ ] Optional: ask ESA (data.licences@esa.int) to confirm the spelling of the Mars Express MaRS credit line
  ("M. Plätzold, K. Pieter" on ESA's terms page; the archive names Martin Pätzold).
- [ ] Mars Express MaRS profiles (ESA): waiting for ESA's archive (down for maintenance since at least Nov 12, 2026; no
  return date published as of Nov 15); then run `run_mex.py`. NASA's PDS Geosciences Node holds a copy (checked Nov
  15, 2026, not used; see DATA-SOURCES.md).
- [ ] When the first real Mars Express profiles are read: check them against `CLEANING-MEX.md` and the report, confirm
  from the AIX label what the height column is measured from (geopotential height; reference surface to be stated
  in the chart's notes), then set `MEX_LIVE = true` in `mars-data/charts/index.html`, open the home page's "Above the
  surface" card and add the Mars Express row to its data table, and add the source to `CREDITS.md` and the Credits
  page in the same change.

**Automatic updates**
- Reducing the job to weekly is listed under Data updates (section 4).

**Page**
- [ ] Developer review of the Nov 18 additions (the dust storm section, humidity at two sites, the rovers' climbs, the
  home page's Explore cards), at the developer's own pace.

## 4. Data updates (since Nov 14, 2026)

The standard and the jobs are in [DATA-UPDATES.md](DATA-UPDATES.md); the daily Data health check reports problems in
one GitHub issue labelled `data-health`.

- [ ] Confirm the outside clock's timers over the next few days: each job's runs should be started by
  `workflow_dispatch` within a minute of its cron time (the control room's "Started by" column shows "Outside clock").
  Set up Nov 17 and 18, 2026; confirmed so far: Spacecraft data 05:23 UTC (fired 05:23:10 on Nov 18, 2026) and
  Astronaut photos 19:11 UTC (fired 19:11:11 on Nov 18, 2026).
- [ ] Spacecraft data: stop at the first CelesTrak timeout, share one download of the active list with Orbit data,
  and read CelesTrak's CSV (six-digit catalogue numbers); changes to `spacecraft/fetch_spacecraft.py` and
  `shared/sats.js` handed to the Image Explorer chat (`docs/handoffs/2026-11-18 - data updates - spacecraft
  CelesTrak.md`). Then `spacecraft-data.yml` runs `orbit-watch/fetch_orbits.py --keep` first and passes the folder.
- [ ] Confirm the first runs started by the newest timers: Orbit data (11:13 and 23:13 UTC), Exoplanets data
  (11:43 UTC Tuesdays and Wednesdays, first Nov 24, 2026) and Space weather data (12:37 and 00:37 UTC), all set up
  Nov 18, 2026. Confirmed so far: Spacecraft data 05:23, Astronaut photos 19:11 and Rover routes 20:59 (Nov 18, 2026).
- [ ] Confirm the first scheduled runs of **Orbit data** (`orbit-data.yml`, 11:13 and 23:13 UTC) and **Exoplanets
  data** (`exoplanets-data.yml`, 11:43 UTC Tuesdays and Wednesdays), both added Nov 18, 2026. First runs by hand on
  Nov 18, 2026: Orbit data read every source (16,917 active satellites and 2,682 debris objects with elements, 71,365
  objects in the catalogue at `https://celestrak.org/pub/satcat.csv`, address confirmed; 15 close passes kept);
  Exoplanets data read 6,470 confirmed planets (files unchanged since the build of Nov 17).
- [ ] Confirm the first scheduled runs of **Rover routes** (`rover-routes.yml`, 08:29 and 20:59 UTC, added Nov 17,
  2026). First runs by hand on Nov 17, 2026: both rovers read (Curiosity sol 5073, Perseverance sol 2022,
  `routes.json` 123 KB), and the Moon and Mars place names built (1,783 Mars and 7,982 Moon names).

- [ ] Confirm over the first days: the Astronaut photos 19:11 backup run and a daily Data health run. Results so far:
  - Astronaut photos backup (19:11 UTC): ran and succeeded for Nov 15 (started 23:21 UTC) and Nov 16 (started
    02:26 UTC on Nov 17). The morning run (07:41 UTC) also succeeded each day but started 7 to 9 hours late, so the
    backup is the run that keeps the photos current within the day.
  - Data health (22:07 UTC): ran and succeeded for Nov 15 (started 01:51 UTC on Nov 16; opened issue #2) and Nov 16
    (started 04:25 UTC on Nov 17; nothing to report). GitHub starts it 4 to 6 hours late; still one run a day.
  - Mars data: the scheduled Monday run on Nov 16 succeeded (started 19:42 UTC, about 10 hours late).
  - Next check: Nov 20, 2026; the item is closed if the runs keep coming daily.
- [ ] Confirm the monthly refresh of `asteroid-tracker/data/famous.json` on December 1, 2026 (the "Asteroid data" log
  shows "famous.json written").
- [ ] Confirm the first scheduled run of "Place and map lists" on January 2, 2027.
- [ ] "Within reach" (monthly, since Nov 17, 2026): confirm its first scheduled run, due about December 15, 2026 (28
  days after the files were built by hand): the Asteroid data run's job "reach" ran, saved `reach.json` and
  `phys.json` (or found them unchanged), and the status file shows both parts ok.
- [ ] Developer testing of the control room (`control-room/`, live since Nov 17, 2026): the page on a phone and a
  computer, and the "Copy for the chat" message when something is wrong.
- [ ] Mars data: reduce the job to weekly once it has run without trouble for a few weeks (from about December 10,
  2026); change `mars-data.yml` and `max_age_hours` in `dev/data_jobs.json` (to 192) together.

## 5. Orbit & Space Watch (planned Nov 17, 2026; all four tools live since Nov 17)

Four tools in a new section of the site, each built by its own chat in its own folder, and the asteroid mining view
(section 1). Plan approved Nov 17, 2026; the decisions are in `docs/PROJECT-NOTES.md` and the handoff of the same
day. Every piece: sources confirmed against the agency's current documentation and recorded in `docs/DATA-SOURCES.md`
first; a mock-up approved before building; only the shared components; credits, and the Privacy page for any service
a visitor's browser contacts, in the same change; data jobs handed to the Data updates chat.

**Section, menu and shared parts (general chat)**
- [ ] The section page's live figures (objects tracked, flares, storm level, planets), added once the tools publish
  them.

**Shared map and globe:** done Nov 17, 2026 (`shared/globe.js`, `shared/flatmap.js`; how to use them in
`docs/PROJECT-NOTES.md`, "Shared map and globe"). Planetary Maps and Orbit Watch can build on them.

**5a. Orbit Watch (`orbit-watch/`)**: live since Nov 17, 2026 (home page, What's in orbit, Close calls and
collisions, Cleaning up; see `orbit-watch/README.md`).
- [ ] Data updates chat: build the Orbit data job from `docs/handoffs/2026-11-17 - orbit watch - data jobs.md`
  (`fetch_orbits.py` twice a day, one CelesTrak download shared with the spacecraft job, `orbit-watch/data/` in
  `paths-ignore`, a quarterly review task for `facts.json`). Until then the pages show "not copied yet".
- [ ] Developer testing, on a phone and a computer, once the first data has arrived: the globe (turning, zoom, tapping
  a dot, search, speeds, the kind switches), a close approach's "Watch" replay, the calculator and the model.
- [ ] Confirm on the job's first run that `https://celestrak.org/pub/satcat.csv` is the satellite catalogue's address.
- [ ] Ask CelesTrak whether elements for every catalogued object can be had in one file; until then the globe shows
  the working satellites and the three debris clouds published as groups, and the heights chart counts everything.
- [ ] Spacecraft map (its owner): read CelesTrak's CSV instead of two-line elements, so craft catalogued since
  Jul 11, 2026 (six-digit numbers) are found (handoff, section 3); its Earth-orbit fleet switch to link to Orbit Watch.
- [ ] Possible later: "Can I see it tonight?" for any object (Sky Finder predicts passes of the space stations only).
- [ ] General chat (suggestion, Nov 18, 2026): the map card (`.mapcard`, `.mapframe`, `.ovl-*`, `.mbtn`, `.mapbar`,
  `.selcard`, `.legendbox`) is now in two project style sheets (the Asteroid Tracker's map and Orbit Watch's globe);
  it could become a shared component, after a mock-up.

**5b. Space Weather (`space-weather/`)**: live since Nov 17, 2026
- [ ] Developer testing of the reload buttons (added Nov 18, 2026): the page head's button and each panel's, on a
  phone and a computer.
- [ ] Check on the live site, in a browser (the build environment could not reach the services; the page was checked
  against sample answers built from the real readings of Nov 17, 2026): the live readings arrive, the three pictures
  and NOAA's aurora map load, the place search works, and the page reads well on a phone.
- [ ] Once the Data updates chat has built the job: the "Since 2010" button appears, and the page falls back to the
  saved copy when NASA cannot be reached.
- [ ] Later, if wanted: a short animation of the last day's SOHO pictures (SOHO offers movies, not checked yet); the
  section page's live figures (flares, storm level) once the section page shows live figures.

**5c. Exoplanets (`exoplanets/`)**: live Nov 17, 2026 (`exoplanets/README.md`)
- [ ] Developer testing of Exoplanets (built and published Nov 17, 2026): the overview (counts, the light-curve
  buttons, "Make a transit", the two catalogue charts and their tooltips, the nearest planets), How they are found
  (the 51 Pegasi wobble, the microlensing "Around the planet" view, the tables), and Every planet (search, the method
  filter, "Habitable zone", "About Earth's size", sorting, "Show more", a planet's page and the browser's Back).
- [ ] Data updates chat: the weekly Exoplanets job (handoff `2026-11-17 - data updates - Exoplanets data.md`); until it
  runs, `planets.json` is refreshed by running "Exoplanets data, built by hand".
- [ ] ESA Gaia Data Release 4 (due Dec 2, 2026): check its exoplanet candidate catalogue (address, format, terms), add
  the candidates apart from the confirmed planets, credited "ESA/Gaia/DPAC", and send the Data updates chat a
  hand-off.
- [ ] ESA CHEOPS (approved Nov 17, 2026): check the mission archive's address, format, terms and credit line, then add
  one CHEOPS light curve beside the TESS and Kepler ones.
- [ ] Direct imaging: a real picture of HR 8799's planets in the section (from NASA's picture library or ESA/Webb,
  with its credit), in place of the link to the Image Explorer.
- [ ] Where each host star is in the sky: a small sky map on a planet's page (`shared/sky.js` and the star list), and
  a link to Sky Finder for stars visible to the eye or with binoculars.
- [ ] ESA PLATO (launch planned January 2027): its card's note to be updated once it flies.

**5d. Planetary Maps (`planet-maps/`)**: live Nov 17, 2026 (`planet-maps/README.md`)
- [ ] Developer testing on a phone and a computer: the Globe, North and South views (added Nov 17, 2026), both tabs, the three Mars maps, the close-ups (Apollo 11's
  "Zoom into the close-up", Jezero's "Zoom to Perseverance"), search by name and by coordinates, the grid and the place
  card's links to Mars Data.
- [ ] Links to it: Image Explorer's globe ("Moon and Mars maps", Image Explorer chat); Mars Data's "Two craters"
  chart (Mars Data chat); the spacecraft map's Moon and Mars orbiters.
- [ ] Artemis landing regions on the South view, once NASA publishes a current list (DATA-SOURCES.md, Planetary Maps).
  A scheduled task checks NASA's position on the 1st of each month (from Dec 1, 2026) and reports; it changes nothing.
