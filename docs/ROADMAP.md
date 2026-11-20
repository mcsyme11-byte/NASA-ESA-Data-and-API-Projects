<p align="center"><img src="../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Roadmap

What's next, as of November 20, 2026. Every pending to-do lives here; items are done at the developer's own pace.
Everything finished moves to [CHANGELOG.md](../CHANGELOG.md).

## 0. Repository (set up Nov 8, 2026)

- [ ] Developer testing of the site tools of Nov 19, 2026: the computer cases (D1 to D10) passed on Nov 20, 2026;
  the phone cases (M1 to M3) and the outdoor case (F1) of the site tools test plan remain
  (`docs/documents/2026-11-20 - Site tools test plan.pdf`; the live doc is linked in `docs/documents/README.md`), with
  results recorded in the doc and any failed case sent to the General/Files/Repo chat.
- [ ] Developer testing of the maps, credits and lists of Nov 20, 2026, on a phone and a computer: each of the eight
  maps (size, + − ⟲, full screen and back, the arrows, dragging, the side column), a "Credits" box opening, and the
  tracker's risk list scrolling inside its box.

## 1. Asteroid Tracker (version 1 live Nov 8, 2026)

- [ ] **Developer testing, Sky Finder outdoors at night** (everything else in the Nov 12–13, 2026 additions passed
  on Nov 14, 2026): calibration on the Moon or a planet and the Calibrate button's dot turning green; the markers
  lining up with the real Moon, planets and bright stars; an asteroid's diamond and path; switching target with the
  row of names in the camera view; the ISS or Tiangong passes.
- [ ] ESA NEOCC's answer on the credit line and on downloading the risk list twice a day: email to `neocc@esa.int`
  drafted Nov 19, 2026, sent by the developer; record the answer in `docs/DATA-SOURCES.md`.

## 2. Image Explorer (version 1 live Nov 9, 2026; home page Nov 12)

- [ ] Picture library: tune the ranking further as the developer reviews searches (the weights are in `scoreOf` in
  `image-explorer/app.js`; second and third rounds applied Nov 17, 2026).
- [ ] Further rounds of changes to the globe, as the developer reviews it.

## 3. Mars Data (live Nov 12, 2026)

Plan confirmed Nov 11, 2026 (see PROJECT-NOTES.md): three missions, updated automatically by a GitHub Actions job.

**Data and analysis**
- [ ] Developer: delete the `mars-probe` branch on GitHub (Branches page, the bin icon beside it). It held the
  one-off workflows used to process the whole record; the update job has run on its own since Nov 16, 2026.
- [ ] ESA's answer on the Mars Express MaRS credit line ("M. Plätzold, K. Pieter" on ESA's terms page; the archive names
  Martin Pätzold): email to data.licences@esa.int drafted Nov 19, 2026, sent by the developer; record the answer in
  `docs/DATA-SOURCES.md`.
- [ ] When the first real Mars Express profiles are read: check them against `CLEANING-MEX.md` and the report, confirm
  from the AIX label what the height column is measured from (geopotential height; reference surface to be stated
  in the chart's notes), then set `MEX_LIVE = true` in `mars-data/charts/index.html`, open the home page's "Above the
  surface" card and add the Mars Express row to its data table, and add the source to `CREDITS.md` and the Credits
  page in the same change.

**Automatic updates**
- Reducing the job to weekly is listed under Data updates (section 4).

**Page**
- [ ] Developer testing of the reload buttons (added Nov 19, 2026) on the Mars Data home page and the charts page, on a
  phone and a computer: the icon spins, then "Updated hh:mm"; the charts keep the period and sol on view. With them,
  the "On this page" bars, ← and → on "One sol", and the loading shapes (Nov 19, 2026).
- [ ] Developer review of the Nov 18 additions (the dust storm section, humidity at two sites, the rovers' climbs, the
  home page's Explore cards), at the developer's own pace.

## 4. Data updates (since Nov 14, 2026)

The standard and the jobs are in [DATA-UPDATES.md](DATA-UPDATES.md); the daily Data health check reports problems in
one GitHub issue labelled `data-health`.

- [ ] Confirm the CelesTrak fix of Nov 20, 2026: Orbit data's sources ok again (CelesTrak answering), a run within two
  hours of the last request shows "not asked this run" in its log, and GitHub's late starts show "so it is skipped".
- [ ] CelesTrak's active list from GitHub's machines (first run with the fix, Nov 20, 2026, 22:18 UTC): CelesTrak
  answered the spacecraft script's smaller lists but timed out on the active list and one debris list, whose use
  CelesTrak limits. GitHub's runners share their addresses with many other projects, so the limit may be used up by
  others too. If Orbit data's elements stay failed for several days, choose between keeping the last copy (the globe
  shows older elements), building the list from CelesTrak's smaller groups (a change to `orbit-watch/fetch_orbits.py`,
  the Orbit Watch chat), or another source (a decision for the developer).
- [ ] `actions/cache/restore@v4` and `save@v4` run on Node.js 20, which GitHub runs on Node.js 24 with a warning; move
  `orbit-data.yml` and `spacecraft-data.yml` to the version that targets Node.js 24 when it is confirmed.
- [ ] Confirm the first run started by the Exoplanets data timers (11:43 UTC Tuesdays and Wednesdays, first Nov 24,
  2026). Every other timer is confirmed (Nov 18 and 19, 2026): Spacecraft data 05:23, Astronaut photos 19:11, Rover
  routes 20:59, Data health 22:07, Orbit data 23:13 and Space weather data 00:37 UTC each started its job within
  11 seconds.
- [ ] Confirm the first scheduled runs of **Orbit data** (`orbit-data.yml`, 11:13 and 23:13 UTC) and **Exoplanets
  data** (`exoplanets-data.yml`, 11:43 UTC Tuesdays and Wednesdays), both added Nov 18, 2026. First runs by hand on
  Nov 18, 2026: Orbit data read every source (16,917 active satellites and 2,682 debris objects with elements, 71,365
  objects in the catalogue at `https://celestrak.org/pub/satcat.csv`, address confirmed; 15 close passes kept);
  Exoplanets data read 6,470 confirmed planets (files unchanged since the build of Nov 17).
- [ ] Confirm the first scheduled runs of **Rover routes** (`rover-routes.yml`, 08:29 and 20:59 UTC, added Nov 17,
  2026). First runs by hand on Nov 17, 2026: both rovers read (Curiosity sol 5073, Perseverance sol 2022,
  `routes.json` 123 KB), and the Moon and Mars place names built (1,783 Mars and 7,982 Moon names).

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


**Shared map and globe:** done Nov 17, 2026 (`shared/globe.js`, `shared/flatmap.js`; how to use them in
`docs/PROJECT-NOTES.md`, "Shared map and globe"). Planetary Maps and Orbit Watch can build on them.

**5a. Orbit Watch (`orbit-watch/`)**: live since Nov 17, 2026 (home page, What's in orbit, Close calls and
collisions, Cleaning up; see `orbit-watch/README.md`).
- [ ] Developer testing, on a phone and a computer, once the first data has arrived: the globe (turning, zoom, tapping
  a dot, search, speeds, the kind switches), a close approach's "Watch" replay, the calculator and the model.
- [ ] CelesTrak's answer: one file of elements for every catalogued object, the twice-a-day schedule, and the credit
  line. Email drafted Nov 19, 2026 (CelesTrak publishes no email address: the developer sends it through T.S. Kelso's
  public contact, for example Bluesky @tskelso.bsky.social). Until then the globe shows the working satellites and the
  three debris clouds published as groups, and the heights chart counts everything.
- [ ] Spacecraft map (its owner): its Earth-orbit fleet switch to link to Orbit Watch. (CelesTrak's CSV, for
  six-digit catalogue numbers, is read since Nov 19, 2026.)
- [ ] Possible later: "Can I see it tonight?" for any object (Sky Finder predicts passes of the space stations only).

**5b. Space Weather (`space-weather/`)**: live since Nov 17, 2026
- [ ] Developer testing of the reload buttons (added Nov 18, 2026): the page head's button and each panel's, on a
  phone and a computer.
- [ ] The developer's own look on a phone, at his own pace (the live site was checked in a browser on Nov 18, 2026:
  live solar wind, Kp, X-rays and DONKI events arrive, the SDO, SOHO and NOAA pictures load, the place search and
  the aurora verdict work, "Since 2010" shows).
- [ ] The data job runs since Nov 18, 2026 (`space-weather-data.yml`; first run by hand wrote `latest.json` with 31
  flares and 145 solar wind points, and `archive.json` with 200 months from April 2010). Check on the live site: the
  "Since 2010" button appears, and the page falls back to the saved copy when NASA cannot be reached.
- [ ] Later, if wanted: a short animation of the last day's SOHO pictures (SOHO offers movies, not checked yet).

**5c. Exoplanets (`exoplanets/`)**: live Nov 17, 2026 (`exoplanets/README.md`)
- [ ] Developer testing of Exoplanets (built and published Nov 17, 2026): the overview (counts, the light-curve
  buttons, "Make a transit", the two catalogue charts and their tooltips, the nearest planets), How they are found
  (the 51 Pegasi wobble, the microlensing "Around the planet" view, the tables), and Every planet (search, the method
  filter, "Habitable zone", "About Earth's size", sorting, "Show more", a planet's page and the browser's Back).
- [ ] Developer testing of the additions of Nov 18, 2026: the Webb picture of HR 8799 and its table (How they are
  found), and "Where it is in the sky" on a planet's page (the star map, the best month, the heights).
- [ ] Developer testing of the additions of Nov 19, 2026: the CHEOPS light curve of WASP-189 b on the overview, and the
  "Reload the planet list" button on the three pages.

**5d. Planetary Maps (`planet-maps/`)**: live Nov 17, 2026 (`planet-maps/README.md`)
- [ ] Developer testing on a phone and a computer: the Globe, North and South views (added Nov 17, 2026), both tabs, the three Mars maps, the close-ups (Apollo 11's
  "Zoom into the close-up", Jezero's "Zoom to Perseverance"), search by name and by coordinates, the grid and the place
  card's links to Mars Data.
- [ ] Links to it: Image Explorer's globe ("Moon and Mars maps", Image Explorer chat); Mars Data's "Two craters"
  chart (Mars Data chat); the spacecraft map's Moon and Mars orbiters.

## 6. Waiting on outside sources (kept Nov 19, 2026)

Work that waits for an agency or service to publish, return or change something. Each item names where to look; any
chat that sees one become available tells the owning chat (named in bold), which does the work and removes the
item. The Mars Express archive and Gaia are checked first, as the soonest likely.

- [ ] **Spacecraft map:** Tianwen-1 (Horizons id -9901491 holds only its cruise, to Feb 10, 2021), Tianwen-2 and
  Chang'e 7 are not in Horizons now, and CelesTrak does not return TESS; they appear by themselves if either service
  lists them later. All four are known notes in `dev/data_jobs.json` (Chang'e 7 since Nov 15, 2026), so the health
  check leaves them out.
- [ ] **Spacecraft map:** more past missions as they end or as Horizons adds routes (for example Swift and other
  Earth-orbit craft have no route in Horizons; Chandrayaan-1's route there begins only in 2016).
- [ ] **Asteroid Tracker:** When the `data-health` issue reports the "risk-lists" source failing (ESA calls its automated access
  experimental, so a change of format stops the step and the previous files are kept), fix `fetch_risk.py`.
- [ ] **Asteroid Tracker:** Hera: once ESA confirms the arrival at Didymos, update its line in `MISSIONS` (`asteroid-tracker/reach.js`).
- [ ] **Mars Data:** Mars Express MaRS profiles (ESA): waiting for ESA's archive (down for maintenance since at least Nov 12, 2026; no
  return date published as of Nov 15); then run `run_mex.py`. NASA's PDS Geosciences Node holds a copy (checked Nov
  15, 2026, not used; see DATA-SOURCES.md).
- [ ] **Exoplanets:** ESA Gaia Data Release 4 (due Dec 2, 2026): check its exoplanet candidate catalogue (address, format, terms), add
  the candidates apart from the confirmed planets, credited "ESA/Gaia/DPAC", and send the Data updates chat a
  hand-off.
- [ ] **Exoplanets:** ESA PLATO (launch planned January 2027): its card's note to be updated once it flies.
- [ ] **Planetary Maps:** Artemis landing regions on the South view, once NASA publishes a current list (DATA-SOURCES.md, Planetary Maps).
  A scheduled task checks NASA's position on the 1st of each month (from Dec 1, 2026) and reports; it changes nothing.
