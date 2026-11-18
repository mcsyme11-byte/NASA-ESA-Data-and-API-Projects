# Roadmap

What's next, as of November 8, 2026. Every pending to-do lives here; items are done at the developer's own pace.
Everything finished moves to [CHANGELOG.md](../CHANGELOG.md).

## 0. Repository (set up Nov 8, 2026)

- [ ] Before any trademark filing: a trademark search on "NEDAP" (a company called Nedap N.V. exists) and advice from
  a trademark lawyer on the name and the patch (`brand/patch/README.md`).


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

  Until it runs, launch windows are on this site for 184 asteroids and the rest link to JPL's page.
- [ ] Hera: once ESA confirms the arrival at Didymos, update its line in `MISSIONS` (`asteroid-tracker/reach.js`).

## 2. Image Explorer (version 1 live Nov 9, 2026; home page Nov 12)

- [ ] Astronaut photos: the free API key (requested by email from jsc-earthweb@mail.nasa.gov; no answer by Nov 11,
  2026) would add cataloged photos with their centre points. Without it the job uses the public Latest ISS Imagery set
  (since Nov 11, 2026). If the key arrives: repository secret `EOL_API_KEY`, then Actions › Astronaut photos › Run
  workflow.
- [ ] Picture library: tune the ranking further as the developer reviews searches (the weights are in `scoreOf` in
  `image-explorer/app.js`; second round applied Nov 17, 2026). Still seen after it: "Comet Scientists Honor
  Colleagues" stays second for "comet", because scores are capped at 4 when sorting and many pictures tie there.
- [ ] Polar views: a sea ice layer that works through the polar night. GIBS's microwave sea-ice records ended
  (SSMIS Aug 2021, AMSR2 Sep 2025); the current one is MODIS (a camera, daylight only). Ice surface temperature
  (`MODIS_Terra_Ice_Surface_Temp_Night`, thermal) is an option to consider.
- [ ] Further rounds of changes to the globe, as the developer reviews it.
- [ ] Picture library: subtitles for videos (NASA's files cannot be attached from another site; would need a copy).
- [ ] With reduced motion set, the globe does not turn by itself and moves without animation; to be rechecked on a
  phone.

## 3. Mars Data (third)

Plan confirmed Nov 11, 2026 (see PROJECT-NOTES.md): three missions, updated automatically by a GitHub Actions job.

**Data and analysis**
- [x] REMS, the whole record (sols 1–4843, August 7, 2012 to March 22, 2026; 4,703 sols with data), cleaned with rules
  1.2 in chunks; every cleaning report checked (Nov 12, 2026). Rule 11 removes the evening air-temperature glitch
  (34 sols); the set-aside list (`exclusions.csv`, rule 10) is empty.
- [x] Corrected UV (sols 1–3423, 35 files of about 1.2 GB): all done and checked (row counts match NASA's labels).
- [ ] After the first scheduled run of the "Mars data" job succeeds: delete the one-off probe (`mars-data/probe/`),
  the branch workflows (`mars-probe.yml`, `mars-chunks.yml`, `mars-meda.yml`, `mars-mex.yml`, on the `mars-probe`
  branch) and the `mars-probe` branch itself.
- [ ] Optional: ask ESA (data.licences@esa.int) to confirm the spelling of the Mars Express MaRS credit line
  ("M. Plätzold, K. Pieter" on ESA's terms page; the archive names Martin Pätzold).
- [x] Perseverance MEDA (Jezero Crater), sols 0–1859, cleaned with MEDA rules 1.0 (`CLEANING-MEDA.md`); every report
  checked (Nov 12, 2026). Reviewed, real weather: sol 1078 (+20 Pa step in the dusty season) and sol 1113 (11 hours
  measured).
- [x] Two-craters chart (Gale and Jezero pressure): approved and on the page (Nov 12, 2026).
- [ ] Mars Express MaRS profiles (ESA): waiting for ESA's archive (down for maintenance since at least Nov 12, 2026; no
  return date published as of Nov 15); then run `run_mex.py`. NASA's PDS Geosciences Node holds a copy (checked Nov
  15, 2026, not used; see DATA-SOURCES.md).
- [x] "Above the surface" section of the charts page (ESA Mars Express profiles): mock-up approved and built (Nov 15,
  2026). It reads `data/mex/profiles.csv` and `profiles.json` and shows a waiting note until then.
- [ ] When the first real Mars Express profiles are read: check them against `CLEANING-MEX.md` and the report, confirm
  from the AIX label what the height column is measured from (geopotential height; reference surface to be stated
  in the chart's notes), then set `MEX_LIVE = true` in `mars-data/charts/index.html`, open the home page's "Above the
  surface" card and add the Mars Express row to its data table, and add the source to `CREDITS.md` and the Credits
  page in the same change.

**Automatic updates**
- [x] GitHub Actions job "Mars data" (`.github/workflows/mars-data.yml`), live Nov 12, 2026: Mondays and Thursdays
  at 09:23 UTC (to be reduced to weekly once stable). It checks NASA's REMS and MEDA archives and ESA's Mars Express
  archive for new or replaced files, downloads only those (manifests of name, size and checksum), cleans and
  summarises them with the same code, runs `validate.py`, and commits only if every check passes.
- [x] Checks before saving (`validate.py`): expected columns, values within physical limits, sol count never
  decreasing, no duplicate sols, the season advancing, no single-hour glitch left (rule 11), no full sol with an air
  low below 170 K, and a cleaning report for every processed chunk.
- [x] Email notice: a run that finds new data opens a GitHub issue ("Mars data: new data …"), which GitHub emails to
  people watching the repository; a failed run is reported by the daily Data health check (since Nov 14, 2026).
- [x] The charts page shows "Data up to sol X … NASA's archive checked [date]".
- Reducing the job to weekly is listed under Data updates (section 4).

**Page**
- [x] Page live (Nov 12, 2026) with the whole record, sols 1–4843.
- [x] "What the record shows" (Nov 17, 2026): six short paragraphs on the clearest seasonal and daily patterns, each
  linked to its chart, first on the charts page. The record counts as complete for the rovers; a paragraph on ESA's
  Mars Express profiles is added when they go live.
- [x] `CREDITS.md` and the Credits page list REMS, MEDA and pandas; the Privacy page says the Mars Data pages read
  only this site's files (Nov 17, 2026). Mars Express is added to both when its data goes live.

## 4. Data updates (since Nov 14, 2026)

The standard and the jobs are in [DATA-UPDATES.md](DATA-UPDATES.md); the daily Data health check reports problems in
one GitHub issue labelled `data-health`.

- [ ] Confirm the first scheduled runs of **Rover routes** (`rover-routes.yml`, 08:29 and 20:59 UTC, added Nov 17,
  2026). First runs by hand on Nov 17, 2026: both rovers read (Curiosity sol 5073, Perseverance sol 2022,
  `routes.json` 123 KB), and the Moon and Mars place names built (1,783 Mars and 7,982 Moon names).

- [ ] **Space Weather (noted Nov 17, 2026; answered the same day): scheduled runs are too late for data that changes within
  hours.** GitHub starts this repository's scheduled runs 4 to 10 hours late (seen Nov 15 to 17, 2026), which suits
  daily data but not space weather. Before any Space Weather data job is built, check whether its pages can read the
  source directly in the visitor's browser (CORS allowed, free, no key, within the source's limits), with a scheduled
  job keeping only a fallback copy for when the source is out of reach. Any source other than NASA or ESA (for example
  NOAA's Space Weather Prediction Center) needs the developer's decision first, and a source read by visitors'
  browsers goes on the Privacy page first. Decided with the Space Weather chat's hand-off.
  Answered Nov 17, 2026: DONKI and iSWA allow web pages to read them, need no key and are read live by the page; the
  job keeps only a fallback copy and the monthly record. To do here: build the job from the hand-off
  (`docs/handoffs/2026-11-17 - data updates - Space Weather data.md`; `space-weather/fetch_space_weather.py` is ready).

- [x] The first `data-health` issue arrived by email: issue #2, opened Nov 16, 2026 at 01:51 UTC (four spacecraft
  catalogue items to review), resolved and closed automatically the same evening. Confirmed by the developer, who
  also reported the repository's Watch setting updated on Nov 16, 2026 so that later comments are emailed too.
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
- [ ] Outside clock (decided Nov 17, 2026): free timers at cron-job.org start the data jobs on time through GitHub's
  API (a fine-grained token limited to this repository's Actions); GitHub's own schedule stays as the backup. Waiting
  for the developer's cron-job.org account; then a 2 to 3 day trial on Spacecraft data, then every job.
- [ ] Mars data: reduce the job to weekly once it has run without trouble for a few weeks (from about December 10,
  2026); change `mars-data.yml` and `max_age_hours` in `dev/data_jobs.json` (to 192) together.

## 5. Orbit & Space Watch (planned Nov 17, 2026)

Four tools in a new section of the site, each built by its own chat in its own folder, and the asteroid mining view
(section 1). Plan approved Nov 17, 2026; the decisions are in `docs/PROJECT-NOTES.md` and the handoff of the same
day. Every piece: sources confirmed against the agency's current documentation and recorded in `docs/DATA-SOURCES.md`
first; a mock-up approved before building; only the shared components; credits, and the Privacy page for any service
a visitor's browser contacts, in the same change; data jobs handed to the Data updates chat.

**Section, menu and shared parts (general chat)**
- [ ] As each tool goes live (its own chat, in the same change): remove `soon: true` from its line in `SECTIONS` and add
  its name to `NAMES` in `shared/footer.js`; turn its card on `space-watch/` into a link (`a.card`, "Open") and its
  home-page card's "Coming soon" into its agencies (general chat, or the tool's chat with the same markup).
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

**5b. Space Weather (`space-weather/`)**: live since Nov 17, 2026
- [x] Sources checked and recorded in `docs/DATA-SOURCES.md` (Nov 17, 2026): DONKI's new address confirmed
  (`ccmc.gsfc.nasa.gov/DONKI-API/get/`, no key; `api.nasa.gov/DONKI` answers 404 since the move), NASA CCMC iSWA for
  IMAP solar wind, GOES X-rays, GFZ Kp and NOAA's Kp forecast (GFZ and NOAA approved by the developer Nov 17, 2026),
  SDO and SOHO pictures, NOAA's OVATION aurora map. Not used: ESA's Space Weather Service Network (account and token;
  its terms do not allow showing its data to the public).
- [x] Mock-up approved (Nov 17, 2026) and page built: right now, the Sun's pictures, the last 7, 30 or 60 days, what
  is heading for Earth, the solar wind, Kp, the aurora chance for the visitor's place (`shared/place.js`), who feels
  space weather, five rules. New shared component: the level scale. `shared/nasa.js` gained `nasaOpenGet`.
- [x] Read live in the visitor's browser; hand-off for the fallback copy and the monthly record written
  (`docs/handoffs/2026-11-17 - data updates - Space Weather data.md`).
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
