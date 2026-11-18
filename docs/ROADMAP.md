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

- [ ] **Asteroid mining view (Orbit & Space Watch plan, Nov 17, 2026):** `asteroid-tracker/mining.html`, a card on the
  Asteroid Tracker's home page and a line on each asteroid's page: how hard each near-Earth asteroid is to reach (JPL
  NHATS: total delta-v, round-trip time, launch windows) and what it is made of where measured (SBDB spectral type),
  built on the tracker's existing orbits, sizes (`compare.js`) and asteroid pages. No price or "worth" figures (no
  agency publishes them). Steps: confirm NHATS and the SBDB fields against JPL's documentation and record them in
  `docs/DATA-SOURCES.md`; mock-up; build; hand-off to the Data updates chat (NHATS added to the Asteroid data job,
  monthly); credits in the same change.

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

- [ ] **Important, Space Weather (noted Nov 17, 2026): scheduled runs are too late for data that changes within
  hours.** GitHub starts this repository's scheduled runs 4 to 10 hours late (seen Nov 15 to 17, 2026), which suits
  daily data but not space weather. Before any Space Weather data job is built, check whether its pages can read the
  source directly in the visitor's browser (CORS allowed, free, no key, within the source's limits), with a scheduled
  job keeping only a fallback copy for when the source is out of reach. Any source other than NASA or ESA (for example
  NOAA's Space Weather Prediction Center) needs the developer's decision first, and a source read by visitors'
  browsers goes on the Privacy page first. Decided with the Space Weather chat's hand-off.

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
- [ ] Mars data: reduce the job to weekly once it has run without trouble for a few weeks (from about December 10,
  2026); change `mars-data.yml` and `max_age_hours` in `dev/data_jobs.json` (to 192) together.

## 5. Orbit & Space Watch (planned Nov 17, 2026)

Four tools in a new section of the site, each built by its own chat in its own folder, and the asteroid mining view
(section 1). Plan approved Nov 17, 2026; the decisions are in `docs/PROJECT-NOTES.md` and the handoff of the same
day. Every piece: sources confirmed against the agency's current documentation and recorded in `docs/DATA-SOURCES.md`
first; a mock-up approved before building; only the shared components; credits, and the Privacy page for any service
a visitor's browser contacts, in the same change; data jobs handed to the Data updates chat.

**Section, menu and shared parts (general chat)**
- [ ] The site-map footer on every page, the menu with "Space Watch", the home page's "Orbit & Space Watch" section
  and the section page `space-watch/` (mock-ups of Nov 17, 2026; the footer, menu and redrawn Space Weather card
  awaiting approval). The section page's live figures come from the tools as each goes live; a tool appears in the
  footer, the menu's section page and the home page when it is built.
- [ ] Card illustrations for the four tools in `shared/art/` (drafts in the mock-ups).
- [ ] The new pages' names in `shared/footer.js` (Back button) as each goes live.

**Shared map and globe (Image Explorer chat, before Planetary Maps and Orbit Watch build theirs)**
- [ ] Move Image Explorer's map set-up (OpenLayers on an equirectangular tile grid) and its three.js globe into
  `shared/`, used unchanged by Image Explorer, then by Planetary Maps (Moon and Mars) and Orbit Watch (the Earth).

**5a. Orbit Watch (`orbit-watch/`)**
- [ ] Sources: CelesTrak (approved Nov 17, 2026) for the orbits of every tracked object; NASA Orbital Debris Program
  Office (counts by type, the breakup model, past collisions); ESA Space Debris Office's yearly Space Environment
  Report. Not used: ESA DISCOS (needs an account; its terms limit sharing).
- [ ] A globe of every tracked object around the Earth, coloured by kind (satellites, rocket bodies, debris), using
  `shared/sats.js` and the shared globe.
- [ ] A collision simulator (how one crash becomes a cloud of debris, from NASA's breakup model and real events).
- [ ] A space-junk cleanup explainer (the methods and missions, with NASA and ESA sources).
- [ ] Links: "Can I see it tonight?" opens Sky Finder; missions open on the spacecraft map, whose Earth-orbit fleet
  switch links here.
- [ ] Hand-off to the Data updates chat: the Spacecraft data job extended to the whole CelesTrak catalogue, written to
  `orbit-watch/data/` (CelesTrak asked once for both tools, twice a day); the yearly ESA figures as a review task.

**5b. Space Weather (`space-weather/`)**
- [ ] Sources: NASA DONKI (flares, eruptions, storms; its address reportedly moved on Sep 30, 2026, to be confirmed),
  NASA SDO and SOHO (ESA and NASA) pictures of the Sun, and NOAA's Space Weather Prediction Center (approved Nov 17,
  2026) for the live storm level, the 3-day forecast and the aurora map. Not used: ESA's Space Weather Service Network
  (most products need a registered account).
- [ ] The Sun's latest pictures, the week's flares and eruptions, storms on their way and when they arrive.
- [ ] The aurora chance for the visitor's place (`shared/place.js`, the same place as Sky Finder).
- [ ] Read live in the visitor's browser where the sources allow it (see the Space Weather item in section 4); a
  scheduled job only as a fallback copy.

**5c. Exoplanets (`exoplanets/`)**
- [ ] Sources: NASA Exoplanet Archive (every confirmed planet); MAST light curves from Kepler and TESS (run by STScI
  for NASA; counted as a NASA source, decided Nov 17, 2026); ESA Gaia and CHEOPS where they help.
- [ ] How each method works, each with a real measurement (the transit dip, the radial-velocity wobble, the direct
  picture, and others), then every confirmed planet by size, orbit and distance.
- [ ] Where each host star is in the sky (`shared/sky.js` and the star list).
- [ ] Hand-off to the Data updates chat: a weekly Exoplanets job.

**5d. Planetary Maps (`planet-maps/`)**
- [ ] Its own folder (decided Nov 17, 2026), on the shared map and globe moved out of Image Explorer.
- [ ] Sources: NASA Moon Trek and Mars Trek map tiles (LRO, MRO, Viking and ESA's Mars Express); landing sites and the
  rovers' routes (NASA, checked by hand); place names from Trek's own layers, or the IAU names kept by the US
  Geological Survey (approved Nov 17, 2026) where Trek's do not cover them.
- [ ] Moon and Mars maps from the whole world down to single craters, with height, names, every landing site and the
  rovers' routes.
- [ ] Links: Image Explorer's globe ("Moon and Mars maps"), Mars Data's "Two craters" chart (Gale and Jezero), and the
  spacecraft map's Moon and Mars orbiters.
- [ ] Hand-off to the Data updates chat: the rovers' routes added to the Mars data job; the place names built once,
  then refreshed quarterly with Place and map lists.
