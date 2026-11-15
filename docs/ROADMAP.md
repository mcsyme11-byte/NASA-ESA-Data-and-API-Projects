# Roadmap

What's next, as of November 8, 2026. Every pending to-do lives here; items are done at the developer's own pace.
Everything finished moves to [CHANGELOG.md](../CHANGELOG.md).

## 0. Repository (set up Nov 8, 2026)

- [ ] Developer testing: the site-wide redesign of Nov 13, 2026 (version 2 of the look) on phone, tablet and
  computer, page by page, and the component page (`design/`).


## 1. Asteroid Tracker (version 1 live Nov 8, 2026)

- [ ] Developer testing: the Asteroid Tracker's home page (`asteroid-tracker/`) on phone, tablet and computer; each
  card's link; an old link such as `asteroid-tracker/#risk` opening the tracker.
- [ ] **Developer testing of the Nov 12, 2026 additions** (built and published Nov 12, 2026):
  - Asteroid Tracker, "Visible from here" tab: "Use my location" and a typed town; the passes list, the night chart,
    "Find it ›" opening Sky Finder; "Forget this place".
  - Sky Finder (`sky-finder/`), on a phone outdoors at night: add to the home screen (iPhone and Android); the safety
    notice; camera, location and motion prompts; calibration on the Moon or a planet; the markers lining up with the
    real Moon, planets and bright stars; an asteroid's diamond and path; red light; the ISS or Tiangong passes; the
    how-to page. Since the Nov 13, 2026 rework: tonight's figures strip, the list grouped by night, the row of names
    in the camera view for switching target, and the Calibrate button's green or amber dot.
  - Spacecraft map (`spacecraft/`) and the home page's new panel: the five views, search, agency and kind filters,
    the card for several craft, Follow, the path, Share, time controls; the asteroid map link under the panel.
- [ ] Spacecraft map: Tianwen-1 and Tianwen-2 are not in Horizons, and CelesTrak does not return TESS; add them if
  either service lists them later (listed as known notes in `dev/data_jobs.json`, so the health check leaves them out).
- [ ] When the `data-health` issue reports the "risk-lists" source failing (ESA calls its automated access
  experimental, so a change of format stops the step and the previous files are kept), fix `fetch_risk.py`.
- [ ] Optional: if ESA's credit form or terms for the NEOCC figures are in doubt, ask the NEOCC by email
  (`neocc@esa.int`) and record the answer in `docs/DATA-SOURCES.md`.

## 2. Image Explorer (version 1 live Nov 9, 2026; home page Nov 12)

- [ ] Astronaut photos: the free API key (requested by email from jsc-earthweb@mail.nasa.gov; no answer by Nov 11,
  2026) would add cataloged photos with their centre points. Without it the job uses the public Latest ISS Imagery set
  (since Nov 11, 2026). If the key arrives: repository secret `EOL_API_KEY`, then Actions › Astronaut photos › Run
  workflow.
- [ ] **Developer testing, one pass for everything added Nov 10–14, 2026** (computer and phone):
  - home page: the three "Open" buttons reach the right tab; the explorer's back button returns;
  - Earth map: colour keys and the other-day note; tapping a desert, the sea and a town; no black gaps between
    satellite passes; Map lines and names in all three views; place search for smaller places (Moraine Lake);
  - globe: zoomed in close (sharper Earth); Day and night; earthquakes, volcanoes, launch sites, wonders, astronaut
    photos; the fainter galaxies (small dim rings); keyboard (arrows, + and −, Home, N and P, Enter, Escape);
  - picture library: ESA videos with "Pictures and videos" or "Videos";
  - after a few days: the astronaut photo count on the globe grows instead of staying near 260.
- [ ] Picture library: tune the ranking further as the developer reviews searches (the weights are in `scoreOf` in
  `image-explorer/app.js`).
- [ ] Polar views: a sea ice layer that works through the polar night. GIBS's microwave sea-ice records ended
  (SSMIS Aug 2021, AMSR2 Sep 2025); the current one is MODIS (a camera, daylight only). Ice surface temperature
  (`MODIS_Terra_Ice_Surface_Temp_Night`, thermal) is an option to consider.
- [ ] Further rounds of changes to the globe, as the developer reviews it.
- [ ] Picture library: subtitles for videos (NASA's files cannot be attached from another site; would need a copy).
- [ ] Shared parts used by both projects (tabs, "How to read this", the big search box, the tooltip) moved from
  `asteroid-tracker/tracker.css` into `shared/theme.css`; the page still loads `tracker.css` for them.
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
- [ ] A short write-up on the page of what the patterns show, once the whole record is in.
- [ ] `CREDITS.md`, the Credits page and the Privacy page updated for the new sources in the same change.

## 4. Data updates (since Nov 14, 2026)

The standard and the jobs are in [DATA-UPDATES.md](DATA-UPDATES.md); the daily Data health check reports problems in
one GitHub issue labelled `data-health`.

- [ ] Developer: check that the first `data-health` issue arrives by email, whenever the check first finds
  something (its first run, on Nov 15, 2026, found nothing to report). If no email arrives: on GitHub, the
  repository's Watch button › All activity (or Custom › Issues).
- [ ] Confirm over the first days: the Astronaut photos 19:11 backup run and a daily Data health run. (Every job's
  first run on the new standard succeeded on Nov 15, 2026 and wrote its status file.)
- [ ] Confirm the monthly refresh of `asteroid-tracker/data/famous.json` on December 1, 2026 (the "Asteroid data" log
  shows "famous.json written").
- [ ] Confirm the first scheduled run of "Place and map lists" on January 2, 2027.
- [ ] Mars data: reduce the job to weekly once it has run without trouble for a few weeks (from about December 10,
  2026); change `mars-data.yml` and `max_age_hours` in `dev/data_jobs.json` (to 192) together.
- [ ] Developer testing of the live data status (Nov 14, 2026): the footer line on a few pages, on a phone and a
  computer; How the data is collected (`data-collection/`) at every width; the line turning brass while a job runs
  (Actions › any data job › Run workflow, then reload a page).
