# Data sources

Every NASA source the projects use or may use, with how to reach it, what it needs, and its limits.
Checked November 8, 2026 (Image Explorer sources: November 9, 2026). Each project's chat confirms the details again before building on them.

## Keys at a glance

| Source | Key needed? | Used by |
|---|---|---|
| api.nasa.gov (NeoWs and others) | Visitors: no (daily copy). The data job: the developer's key, repository secret `NASA_API_KEY` | Asteroid Tracker |
| JPL SSD APIs (close approaches, small-body database) | No | Asteroid Tracker |
| PDS Atmospheres Node (Mars weather) | No (file downloads) | Mars Data |
| GIBS (satellite imagery tiles) | No | Image Explorer |
| NASA Image and Video Library | No | Image Explorer |
| NASA Solar System Treks (Moon and Mars map tiles) | No | Planetary Maps |
| NASA CCMC DONKI and iSWA (space weather events and live readings) | No | Space Weather |
| SDO, SOHO and NOAA SWPC pictures | No | Space Weather |

## api.nasa.gov

- **Sign up:** api.nasa.gov, free, the key arrives by email. One key works for every api.nasa.gov service.
- **Passing it:** as the `api_key` query parameter.
- **Limits:**
  - `DEMO_KEY` (NASA's shared key for trying things out): **30 requests an hour, 50 a day**, per connection (IP).
  - A personal key: **1,000 requests an hour**.
  - Every answer carries `X-RateLimit-Limit` and `X-RateLimit-Remaining` headers; going over returns **429**.
- **In this repository:** no key is committed. Since Nov 12, 2026 the daily data job (`fetch_neows.py`) uses the
  developer's key from the repository secret `NASA_API_KEY` (GitHub › Settings › Secrets and variables › Actions) to
  copy the NeoWs data most visitors see into `asteroid-tracker/data/neows/`, so visitors need no key. A key cannot be
  shared through the pages instead: anything in a public page is readable by anyone, and all visitors would share one
  key's limit. For weeks and asteroids outside the copy, web pages use `shared/nasa.js` with `DEMO_KEY`, whose limit
  is counted per visitor's connection (the pages no longer offer to store a visitor's own key). Python scripts run
  by hand read `NASA_API_KEY` from `.env`.
- **DONKI is no longer on api.nasa.gov (found Nov 17, 2026).** `https://api.nasa.gov/DONKI/<type>` answers 404 since
  DONKI moved to the Community Coordinated Modeling Center's own address on Sep 30, 2026 (the 404 names the path
  `/DONKI-API/get/<type>/`). The new address needs no key; see "Space Weather" below.

### Daily copy of NeoWs (`asteroid-tracker/data/neows/`, since Nov 12, 2026)

- **What:** the `feed` for the current week (Sunday to Saturday, UTC) and the two weeks before and after it
  (`week-YYYY-MM-DD.json`), and `neo/{id}` for every asteroid in those weeks (`neo/<id>.json`), in NeoWs's own shape,
  trimmed to the fields the pages use (Earth approaches only); `index.json` lists the weeks, the asteroids, when each
  was fetched and whether the developer's key was used.
- **Requests:** a first run about 5 + 600; later runs only asteroids new to the window, plus copies older than 14
  days, at most 750 a run; the script stops when NASA reports fewer than 25 requests left. Without the secret it uses
  `DEMO_KEY` for the weeks only.
- **If it fails:** the step is marked with a warning, the previous copy is kept, and the pages ask NASA directly.
- **Pages:** `asteroid-tracker/neows.js` reads the copy first; the week view and the asteroid page ask NASA only for
  what the copy does not hold.

## Asteroid Tracker

### NeoWs (Near Earth Object Web Service)

Base: `https://api.nasa.gov/neo/rest/v1/`

| Endpoint | What it returns |
|---|---|
| `feed?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` | Every object with a close approach in the range, grouped by date. **At most 7 days per request.** |
| `neo/{id}` | One object: its orbit and all its known close approaches |
| `neo/browse?page=n&size=20` | The whole catalogue, a page at a time |

Useful fields per object: `name`, `estimated_diameter` (min and max, in km, m, miles and feet),
`is_potentially_hazardous_asteroid`, and in `close_approach_data`: `close_approach_date_full`,
`relative_velocity.kilometers_per_hour`, `miss_distance.kilometers` and `miss_distance.lunar`.

Example: one week's feed
```
https://api.nasa.gov/neo/rest/v1/feed?start_date=2026-11-01&end_date=2026-11-07&api_key=DEMO_KEY
```

Checked Nov 8, 2026 (live requests from the published site):
- **Browsers may call it** (CORS allowed), so the Asteroid Tracker requests the week's feed from the page.
- **The rate-limit headers are not readable from a web page** (NASA does not expose them to browsers), so the page
  cannot show "requests left"; it shows which key is in use and that key's limits instead.
- `close_approach_data[].epoch_date_close_approach` is the close-approach time in milliseconds, UTC
  (1794183300000 = 2026-11-09 00:15 UTC, matching `close_approach_date_full`). Speed used:
  `relative_velocity.kilometers_per_second`.
- `estimated_diameter.meters` gives min and max; the range corresponds to albedos of about 0.25 and 0.05 (see the
  size rule below).
- A typical week: 42 close approaches, 5 flagged potentially hazardous (Nov 8–14, 2026).

`neo/{id}`, checked Nov 8, 2026 (used by the Asteroid Tracker's page for one asteroid, 1 request per page):
- Top level: `id`, `neo_reference_id`, `name`, `designation`, `absolute_magnitude_h`, `estimated_diameter`,
  `is_potentially_hazardous_asteroid`, `is_sentry_object`, `nasa_jpl_url`, `close_approach_data`, `orbital_data`.
- `close_approach_data`: every computed approach, 1900–2200 (for example 36 for 1998 VE31, all to Earth); same fields
  as in the feed.
- `orbital_data` (numbers given as strings): `semi_major_axis` (au), `eccentricity`, `inclination`,
  `ascending_node_longitude`, `perihelion_argument`, `mean_anomaly` (degrees, J2000 ecliptic), `mean_motion`
  (degrees per day), `epoch_osculation` (Julian date of these elements), `perihelion_distance`, `aphelion_distance`,
  `orbital_period` (days), `minimum_orbit_intersection` (MOID, au), `orbit_class` (type, description, range),
  `observations_used`, `first_observation_date`, `last_observation_date`, `data_arc_in_days`,
  `orbit_determination_date`, `orbit_uncertainty` (0 best to 9).
- **Ids:** an unnumbered object has a 7-digit id (3092201 for 1998 VE31); a numbered asteroid's id is
  2,000,000 + its number (433 Eros = 2000433).

### JPL Close-Approach Data API

`https://ssd-api.jpl.nasa.gov/cad.api` (no key). Close approaches over any date range, past and future, filtered by
distance (`dist-max`, for example `10LD`) and date (`date-min`, `date-max`). Suited to "the closest approaches of
the year" and to history beyond NeoWs's 7-day window.

Checked Nov 8, 2026 against the API's documentation (version 1.5) and live answers:
- **No CORS headers:** browsers block a web page from calling it. The Asteroid Tracker therefore reads files,
  `asteroid-tracker/data/YYYY.json` (one per year, 2000 to next year, approaches within 10 LD) and
  `asteroid-tracker/data/years.json` (the years and their counts within 1, 5 and 10 LD), written by
  `asteroid-tracker/fetch_close_approaches.py` on GitHub Actions (`.github/workflows/asteroid-data.yml`): daily for
  this year and next year and any missing year; every year when run by hand with "all".
- **Defaults:** `date-min=now`, `date-max=+60` (days), `dist-max=0.05` (au), NEOs only, Earth, sorted by date.
- **Useful options:** `diameter=true`, `fullname=true`, `sort` (`date`, `dist`, `-dist`, …), `limit`,
  `total-only=true` (the count only).
- **Each row is an array** in the order given by `fields`: `des`, `orbit_id`, `jd`, `cd` (calendar time, TDB, about
  69 s from UTC), `dist`, `dist_min`, `dist_max` (au), `v_rel`, `v_inf` (km/s), `t_sigma_f`, `h` (absolute
  magnitude), then `diameter` and `diameter_sigma` (km, usually null) and `fullname` when asked for.
- An empty answer is HTTP 200 with `count` 0. Errors: 400, 405, 500, 503.
- Counts for the whole of 2026, as known on Nov 8, 2026: 1,053 close approaches within 10 LD and 144 within 1 LD
  (about 50 KB as the daily file); 1,558 within 0.05 au.

### JPL Sentry API (impact monitoring), checked Nov 9, 2026

`https://ssd-api.jpl.nasa.gov/sentry.api` (no key; documentation at `https://ssd-api.jpl.nasa.gov/doc/sentry.html`,
API version 2.0). NASA/JPL's automatic impact-monitoring list: every object with a calculated, non-zero chance of
hitting Earth within the next 100 years or so.
- **Summary (no parameters):** one row per object: `des`, `fullname`, `ip` (cumulative impact probability), `ps_cum`,
  `ps_max` (Palermo), `ts_max` (Torino), `n_imp` (number of possible impacts), `range` (years), `h`, `diameter` (km),
  `v_inf` (km/s), `last_obs`. Numbers are sent as strings.
- **`all=1`:** every possible impact of every object (`des`, `date`, `ip`, `ps`, `ts`); used to find each object's most
  likely impact date.
- **No CORS header** in the replies recorded by the data job, so pages read `asteroid-tracker/data/risk.json`, written
  by `asteroid-tracker/fetch_risk.py` on GitHub Actions (twice a day, with the close-approach job).
- A speed or other figure can arrive as `nan`; the job keeps only finite numbers and refuses to write NaN, because a
  browser cannot read JSON containing it.
- Count on Nov 9, 2026: 2,242 objects. Credit: "NASA/JPL (Sentry)".

### Planet positions (JPL approximate elements)

`https://ssd.jpl.nasa.gov/planets/approx_pos.html`, Table 1 (valid 1800–2050, mean ecliptic and equinox J2000),
checked Nov 8, 2026 and copied into `asteroid-tracker/orbit.js`: each planet's a, e, I, L, ϖ, Ω and their rates per
century, with the procedure (elements at the date → ω = ϖ − Ω and M = L − ϖ → Kepler's equation → in-plane
coordinates → rotation into the ecliptic). The orbit diagram therefore covers 1900–2050.

Checks of `orbit.js` (Nov 8, 2026): Earth 0.98330 au from the Sun at the 2026 perihelion and 1.01670 au at aphelion;
1998 VE31 0.1785 au from Earth on 2026-11-09 00:15 UTC (NeoWs: 0.1784980 au), with the computed closest moment within
half an hour of NASA's. A century from the elements' epoch the two-body model drifts (1927 approach: 0.190 au
computed against 0.151 au), which the page states as "good", "approximate" or "rough" for the date shown.

### Size from brightness (when no measured diameter is given)

```
D (km) = 1329 ÷ √p × 10^(−H ÷ 5)
```
- H: absolute magnitude (brightness; a larger H means a smaller object). p: albedo (how much light the surface
  reflects).
- **p = 0.25** (bright surface) gives the **smallest** likely size; **p = 0.05** (dark) the **largest**.
- Example: H = 22 → 106 m to 237 m. This is the range NeoWs reports; the Asteroid Tracker applies the same rule to
  JPL's data (`asteroid-tracker/format.js`).

## Mars Data

Checked Nov 11, 2026, from GitHub's servers (the project's cloud workspace cannot reach these archives) and against
each archive's own documentation. Decided Nov 11, 2026: three missions are followed (PROJECT-NOTES.md).

### Curiosity's weather station (REMS), NASA PDS Atmospheres Node — in use

- **Address:** `https://atmos.nmsu.edu/PDS/data/mslrem_1001/` (volume `MSLREM_1001`, PDS3). No key, no account, free.
  Plain directory pages; folders `DATA/SOL_<first>_<last>/SOL<nnnnn>/`, one folder per sol, 42 chunk folders on
  Nov 11, 2026, the newest `SOL_04710_04843` (sol 4843, March 22, 2026). The REMS web page still gives sol 4488 as the
  newest; the folders are newer.
- **Files per sol:** `RME_<clock>RMD<sol>…TAB` (MODRDR: environmental values, corrected; the set used), `…RNV…` (ENVRDR),
  `…RTL…` (TELRDR), `…ADR…` (ancillary: rover position and Sun geometry), each with a PDS3 `.LBL` and a PDS4 `.xml`
  label. File sizes grow over the mission: sol 1, 0.3 MB (750 rows); sol 4843, 8.5 MB (22,793 rows). Sols 1–89 with
  their ADR files: 164 files, 1.0 GB.
- **Format:** comma-separated ASCII, fixed-length rows, 40 columns, one row per second of measurement; text fields in
  quotes. Column definitions: `LABEL/MODRDR6.FMT`; ADR: `LABEL/ADR_GEOM6.FMT`. Each ADR file holds two tables one after
  the other: corrections (4 columns), then geometry (16 columns, including `ROVER_POSITION_Z`, metres above the landing
  site, +Z up).
- **Missing values:** `-999.00` or `-9.990E+02` since the release of September 30, 2024 (`ERRATA.TXT`); earlier files
  used `UNK` or `NULL`.
- **Wind:** the processed wind columns are always missing (the sensor was damaged during landing).
- **Quality flags:** a string per sensor, one character per check (`1` good, `0` bad, `X` unknown); not every
  character is a quality check (for pressure, the first character only says which oscillator was used). The rules
  used are in `mars-data/analysis/CLEANING.md`.
- **Not the season:** the ADR column `SOLAR_LONGITUDE_ANGLE` is the Sun's direction relative to the rover, not Ls. Ls is
  calculated from the date (`mars-data/analysis/mars_time.py`, Allison and McEwen 2000) and matches the archive's stated
  values within 0.2° (sol 1: Ls 151.0, Mars Year 31; sol 4488: Ls 60.1, Mars Year 38).
- **Index:** `INDEX/INDEX.TAB` lists products only up to sol 4133 (last updated September 2024), so the folders, not the
  index, are read to find new sols. Up to sol 4133, 140 sols have no data (for example sols 2–8 and 200–221).
- **Known events:** `DOCUMENT/DATA_EVENTS.TXT` lists sols with no activity, missing hours and calibrations.
- **Releases:** in batches every few months (`ERRATA.TXT` lists each release, its sols and any re-released files).
- **Citation (from the archive's catalog):** Gomez-Elvira, J., Mars Science Laboratory Rover Environmental Monitoring
  Station RDR Data V1.0, MSL-M-REMS-5-MODRDR-V1.0, NASA Planetary Data System, 2013.
- **Credit shown on the page:** "Data courtesy of NASA/JPL-Caltech and the REMS team (Centro de Astrobiología), NASA
  Planetary Data System."
- **Terms:** NASA data; generally not under copyright in the United States.

### Perseverance's weather station (MEDA), NASA PDS Atmospheres Node — in use

Checked Nov 12, 2026, from GitHub's servers.

- **Address of the data files:** `https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda/data_derived_env/`
  (PDS4), folders `sol_<first>_<last>/sol_<nnnn>/`, 16 chunk folders, sols 0–1859 on Nov 12, 2026 (May 13, 2026). No
  key, free. The release folders at `https://pds.nasa.gov/data/pds4/releases/atmos/mars2020_meda-<YYYYMMDD>/` hold only
  the labels and inventories.
- **Files per sol (derived level):** `WE__<sol>___________DER_<SENSOR>___…_P<nn>.CSV` with a PDS4 `.xml` label, for
  PS (pressure), RHS (humidity), TIRS (ground temperature and radiation) and ANCILLARY (rover position, Sun geometry).
  Air temperature (ATS) exists only at the calibrated level. One file spans one sol.
- **Format:** comma-separated ASCII with a header row; an empty value means not reliable for science (bundle
  `readme.txt`); `9999999999` marks an invalid value in some columns.
- **Coverage:** about 12 hours a sol at 1 Hz, even hours on even sols and odd hours on odd sols, with longer coverage
  on some sols. Humidity before sol 63 and wind before sol 36 are not reliable (readme).
- **Clock:** `SCLK`, seconds from noon on January 1, 2000; sol 1 falls on February 19, 2021 (Ls 6.2°, Mars Year 36),
  matching NASA's stated start. The ancillary column `SOLAR_LONGITUDE_ANGLE` is the Sun's azimuth, not Ls (as for REMS).
- **Rules:** `mars-data/analysis/CLEANING-MEDA.md`.
- **Citation:** J.A. Rodriguez-Manfredi et al. (2021), The Mars Environmental Dynamics Analyzer, MEDA, NASA Planetary
  Data System, DOI 10.17189/1522849.
- **Credit shown on the page:** "Data courtesy of NASA/JPL-Caltech and the MEDA team (Centro de Astrobiología), NASA
  Planetary Data System."

### Mars Express radio occultation profiles (MaRS), ESA Planetary Science Archive — waiting for ESA

- **Address:** `https://archives.esac.esa.int/psa/ftp/MARS-EXPRESS/MRS/` (PDS3). No key, free. Level 5 (derived) data
  sets on Nov 11, 2026: `MEX-M-MRS-5-OCC-9101-V1.0` and `-V2.0`, `-9102-V1.0`, `-9103-V1.0`, `-9107-V1.0`,
  `-9124-V1.0` (one per occultation season; 9124 covers May 6 to June 21, 2022).
- **Files:** `DATA/<day>/LEVEL04/` with `…AIX….TAB` (atmosphere: temperature, pressure and number density against
  radius, latitude and longitude; 26 columns), `…IID…`/`…IIX…` (ionosphere), each with a `.LBL` and a `.TXT` description.
- **Citation (from the archive's catalog):** M. Paetzold, Mars Express MRS Level 5 data, Experimental Data acquired from
  Occultation <season>, Version V1.0.
- **Terms:** data in ESA's Space Science Archives are distributed under the CC BY-NC 3.0 IGO licence (free use with
  the credit line; commercial use needs ESA's authorisation, `data.licences@esa.int`); ESA's Science Data Centre terms
  page, `cosmos.esa.int/web/esdc/terms-and-conditions`.
- **Access (Nov 12, 2026):** the simplified site `archives.esac.esa.int/psa/ftp/` answered "401 Unauthorized" while
  ESA's archive was down for maintenance (psa.esa.int: "The PSA is currently down for maintenance"). ESA's other
  documented routes, the web view `psaftp.esac.esa.int` (an interactive application) and anonymous SFTP (a password
  prompt), are not usable from a script without credentials, so the profiles wait until the simplified site returns.
  The reader (`run_mex.py`) and its rules (`CLEANING-MEX.md`) are ready. **Checked Nov 15, 2026:** psa.esa.int still
  shows "down for maintenance", with no return date published; the update job's test run on Nov 12 reached
  `psaftp.esac.esa.int` but found no data sets listed.
- **NASA's copy (checked Nov 15, 2026, not used):** through a cooperative agreement between ESA and NASA, the PDS
  Geosciences Node hosts a copy of the MaRS archive (`pds-geosciences.wustl.edu/missions/mars_express/mars.htm`),
  including the reduced occultation profiles, `mex-m-mrs-5-occ-v1`, with one volume per occultation season (for
  example `MEX-M-MRS-5-OCC-9102-V1.0`, the same data set identifiers as ESA's). Seasons listed: April–August 2004,
  December 2004–January 2005, July–December 2005, April–June 2007 and May–June 2022. Its file layout, completeness
  against ESA's list and credit have not been checked; ESA's archive stays the source unless a decision is made to
  use the copy.
- **Credit line, exactly as ESA's terms page gives it:** "Credit: ESA, M. Plätzold, K. Pieter". The archive itself names
  the principal investigator as Martin Pätzold (written "Paetzold"); the line is used as ESA gives it unless ESA confirms
  a corrected form.

### Other candidates (not followed)

| Source | Covers | Note |
|---|---|---|
| InSight weather (TWINS, pressure sensor) | Elysium Planitia, sols 1–1188 (2018–2022) | The mission has ended; a fixed set |
| Viking Lander meteorology | 1976–1982 | For a then-and-now comparison |
| ExoMars Trace Gas Orbiter (ACS, NOMAD), ESA | Since 2018 | Archived mainly as calibrated spectra; gas amounts would need retrievals |

### SBDB Query API (every near-Earth object), checked Nov 8–9, 2026

`https://ssd-api.jpl.nasa.gov/sbdb_query.api` (no key; no CORS headers, so it is fetched by
`asteroid-tracker/fetch_map_data.py` on GitHub Actions and saved as `asteroid-tracker/data/neos.json`).
- Query used: `sb-group=neo`, `full-prec=true`, `fields=spkid,full_name,pdes,a,e,i,om,w,ma,epoch,H,diameter,pha,class,first_obs`.
- Answer: `fields` and `data` (one array per object, numbers as strings) and `count`. 43,186 objects on Nov 8, 2026,
  2,552 of them potentially hazardous; 209 are comets (classes JFc, JFC, HTC, ETc, …), the rest asteroids (APO 24,454,
  AMO 14,979, ATE 3,505, IEO 39). Nearly all share one epoch of osculation (2461200.5); a few thousand have their own.
- `first_obs` is the first observation found, which can be older than the discovery (precovery in archive images):
  Eros 1893, discovered 1898. The "year found" in `neos.json` is therefore the year in the provisional code
  (2004 MN4 → 2004, A898 PA → 1898), and `first_obs` only where there is no such code (survey codes such as
  6344 P-L); comets have no year found.
- **Ids:** SBDB's `spkid` is 20,000,000 + number for numbered asteroids (Apophis 20099942) and an 8-digit id for the
  others (1998 VE31 = 50092224). NeoWs (`neo/{id}`) uses 2,000,000 + number for numbered asteroids (2099942) and
  accepts the 8-digit id for the others (checked: 50092224 returns 1998 VE31). NeoWs does not cover comets; the pages
  link comets to JPL's lookup page instead.
- Size: about 5.5 MB as JSON, about 1.8 MB as GitHub Pages sends it (compressed).

### NHATS API (round trips, the "Within reach" page), checked Nov 17, 2026

`https://ssd-api.jpl.nasa.gov/nhats.api` (no key; documentation `https://ssd-api.jpl.nasa.gov/doc/nhats.html`, version
1.3; assumptions at `https://cneos.jpl.nasa.gov/nhats/caveats.html`). Fetched by `asteroid-tracker/fetch_reach.py` into
`asteroid-tracker/data/reach.json`; read by `mining.html` and the asteroid pages (`reach.js`).
- **What NHATS counts:** an asteroid is listed if at least one round trip from Earth meets all of: Earth departure
  between 2020-01-01 and 2045-12-31; departure C3 at most 60 km²/s²; total delta-v at most 12 km/s, made of the
  departure from a circular 400 km Earth orbit, matching the asteroid's speed on arrival, leaving it, and, if needed, a
  burn to keep the Earth entry speed in check; round trip at most 450 days; at least 8 days at the asteroid; entry
  speed at most 12 km/s at 125 km altitude. Trajectories are Lambert solutions on 8-day grids (patched conics, JPL
  Horizons ephemerides); mid-course burns, gravity assists and electric propulsion are left out, so NASA states the
  list is not complete and is not a mission selection.
- **List (mode S, no parameters):** `count` and `data`, one object per asteroid: `des`, `fullname`, `h`, `min_size`
  and `max_size` (m, from H), `size` and `size_sigma` (m, measured, for some), `occ` (orbit condition code),
  `min_dv` and `min_dur` (each `{dv km/s, dur days}`: the cheapest and the shortest trip), `n_via_traj`, and the next
  optical and radar opportunities. Numbers come as strings. Nov 17, 2026: 7,219 asteroids; 132 at 4.5 km/s or less,
  729 at 6 or less, 3,183 at 9 or less; 1,247 up to at least 100 m across.
- **One asteroid (mode O, `des=` plus optional `launch=`):** adds `computed` (the date NHATS last worked it out, for
  example 2021-08-14 for Bennu) and `min_dv_traj` and `min_dur_traj`: `launch`, `dur_out`, `dur_at`, `dur_ret`,
  `dur_total`, `dv_total`, `dv_dep_park` (leaving Earth orbit), `vrel_arr_neo`, `vrel_dep_neo`, `vrel_arr_earth`,
  `v_arr_earth` (entry speed), `c3`, `tid`. The four burns add up to `dv_total` (2000 SG344: 3.246 + 0.137 + 0.166 +
  0.000 = 3.549 km/s). `launch` takes NHATS's five-year periods (2020-2025 … 2040-2045); a period's cheapest trip can
  fall in its last year, which the next period can return as well (Bennu: 2030-03-21 in both 2025-2030 and
  2030-2035), so the launch windows are de-duplicated by `tid`. An asteroid not on the list answers
  `{"error": "specified NHATS object not found"}` (for example 65803 Didymos).
- **Limits:** none documented. Observed Nov 17, 2026: about 800 requests in about a minute (three at a time) were
  answered with HTTP 403 from JPL's load balancer for the rest of that session. The script therefore asks one at a
  time, one a second, stops at the first 403 or 429, and keeps the previous windows of asteroids not reached.
- **Launch windows** are fetched for numbered asteroids, asteroids with measured physical data, asteroids at least
  300 m across, and asteroids at least 10 m across with a round trip of 4.5 km/s or less (about 600 on Nov 17, 2026;
  four requests each). The others link to JPL's page, `https://cneos.jpl.nasa.gov/nhats/details.html#?des=<des>`.
- **CORS:** none (a request from the live site failed on Nov 17, 2026), so visitors' browsers never contact JPL; no
  change to the Privacy page.
- **Credit line:** "Round trips: NASA/JPL CNEOS, NHATS (Near-Earth Object Human Space Flight Accessible Targets
  Study)". JPL's Solar System Dynamics group asks data to be referenced as "Solar System Dynamics. (Downloaded …).
  (Title of the page). https://ssd.jpl.nasa.gov"; the source line and `CREDITS.md` name JPL and the service.

### SBDB Query API: physical data (the "Within reach" page), checked Nov 17, 2026

The same API as above (`https://ssd-api.jpl.nasa.gov/sbdb_query.api`, version 1.0; field list in
`https://ssd-api.jpl.nasa.gov/doc/sbdb_filter.html`), asked by `fetch_reach.py` for
`fields=spkid,pdes,spec_B,spec_T,rot_per,albedo,density,diameter,extent`, `sb-group=neo` and
`sb-cdata={"OR":["spec_B|DF","spec_T|DF","rot_per|DF","albedo|DF"]}` (DF: the value is defined). Written to
`asteroid-tracker/data/phys.json` (about 175 KB).
- Fields: `spec_B` SMASSII spectral type, `spec_T` Tholen spectral type, `rot_per` synodic rotation period (hours),
  `albedo` geometric albedo, `density` (g/cm³), `diameter` (km), `extent` (km, tri- or bi-axial, as text).
- Nov 17, 2026: 3,040 near-Earth objects; 313 with an SMASSII type, 37 with a Tholen type, 2,189 with a rotation
  period, 1,209 with an albedo, 10 with a density. Among NHATS's 7,219 asteroids, 23 have a measured type. Types
  carry `:` when uncertain (`S:`) and Tholen's mixed classes (`SMU`, `TCG:`). Examples: Bennu B, 4.296 h, albedo
  0.044, 1.194 g/cm³, 0.484 km; Ryugu Cb, 7.63 h, 1.19 g/cm³; Didymos S, 2.2593 h, 2.17 g/cm³, 0.78 km.
- The page groups types by rule (`reach.js`): C group (B, C, Cb, Cg, Ch, F, G…), S group (S, Sq, Q, K, L, A…), X group
  split by albedo as Tholen's E, M and P, V, D and T, others rare.

### "Within reach": comparisons and mission facts, checked Nov 17, 2026

- **Moon comparisons:** a round trip to lunar orbit needs about 5 km/s and to the lunar surface about 9 km/s, from
  NASA's NHATS team ("Putting Accessibility Into Context", NASA Technical Reports Server 20150009390), measured the
  same way as NHATS's totals.
- **Mission facts** (`MISSIONS` in `asteroid-tracker/reach.js`, edited by hand): OSIRIS-REx returned 121.6 g from
  Bennu on Sept 24, 2023, the largest asteroid sample collected in space (NASA, Feb 2024); Hayabusa2 (JAXA) returned
  5.4 g from Ryugu in December 2020, figures from NASA's own reports (NASA, Bennu sample exchange with JAXA; decided
  Nov 17, 2026: NASA's reports are used rather than JAXA's site); Psyche launched Oct 13, 2023 and arrives in 2029,
  the asteroid about 280 km at its widest (NASA, JPL press kit); Hera launched Oct 7, 2024, arrival at Didymos planned
  for November 2026 (ESA, "Hera targets early arrival"). Once ESA confirms Hera's arrival, the line is updated.
- **Not used:** ESA NEOCC's physical properties, available only one asteroid at a time through an interface ESA marks
  experimental, with no catalogue file found; and any price or "worth" of an asteroid (no agency publishes one).

### Horizons API (spacecraft), checked Nov 8–9, 2026

`https://ssd.jpl.nasa.gov/api/horizons.api` (no key; no CORS headers; fetched by `fetch_map_data.py`).
- Query: `COMMAND='<id>'`, `EPHEM_TYPE=VECTORS`, `CENTER='500@10'` (the Sun), `OUT_UNITS=AU-D`,
  `REF_PLANE=ECLIPTIC`, `REF_SYSTEM=ICRF`, `VEC_TABLE=1` (position only), `CSV_FORMAT=YES`, `STEP_SIZE='<n> d'`.
  The table is between `$$SOE` and `$$EOE`; each line gives the Julian date, the calendar date, then x, y, z in au.
- Ids used: Voyager 1 −31, Voyager 2 −32, New Horizons −98, Parker Solar Probe −96, Lucy −49, Psyche −255,
  OSIRIS-REx/APEX −64, Hera −91, James Webb Space Telescope −170, Europa Clipper −159, Juno −61. On Nov 1, 2026
  Voyager 1 was 172 au from the Sun, Voyager 2 145 au, New Horizons 66 au.
- When a range starts before a spacecraft's data, Horizons answers with the first date it covers; the script then
  retries from that date. Each spacecraft is sampled every 4 to 30 days from launch to a year ahead, and Parker Solar
  Probe every 6 hours (`STEP_SIZE='6 h'`; stored as a step of 0.25 days), since near the Sun it moves about 16 million
  km a day while passing about 7 million km from it (about 600 KB in all).
- The International Space Station and Hubble are not on the map: 400–540 km above Earth, they sit inside Earth's dot
  at any scale it shows.

### Horizons API (famous close passes), checked Nov 9, 2026

- Same endpoint, written monthly (on the 1st, or with `--all`, or when the list of passes changes) to
  `data/famous.json` (about 780 KB, eight passes) by `fetch_map_data.py`. For each pass: the asteroid, Earth (`399`) and the Moon (`301`), with `VEC_TABLE=2`
  (position and velocity), `CENTER='500@10'`, ecliptic, au and au/day.
- Small bodies are named with a trailing semicolon: `'99942;'` for a numbered asteroid, `'DES=2020 QG;'` for one
  known only by its code.
- Samples: every 10 minutes within 12 hours of closest approach, hourly within 3 days, daily within 40 days
  (339 per body). The page joins them with cubic Hermite interpolation (positions and velocities).
- Check: the distance from Earth's centre at closest approach matches the JPL close-approach figures to within
  16 km for all five passes; 2024 YR4's pass by the Moon gives 22,940 km against JPL's 22,938 km. Close-approach
  distances are measured from the centre of Earth (or the Moon), not the surface.
- Since Nov 9, 2026 each pass also stores `cad`: NASA/JPL close-approach data for that date (`cad.api`, `des`,
  `body=Earth` or `Moon`, `dist-max=0.2`, dates ±3 days): `cd` (UTC time), `km` (from the centre) and `v_rel` (km/s).
  The tour and its card use these. They differ slightly from earlier published figures because orbits are refined
  (for example 2020 QG: 9,317 km in 2026, 9,302 km as first published).

### soon.json (home page), added Nov 9, 2026

- Written daily by `fetch_map_data.py` from the close-approach year files: every pass within 10 Moon distances from a
  day before the run to 15 days after it, as `[name, time_ms_utc, distance_ld, h, neows_id, designation]`. The NeoWs
  id is 2,000,000 + number for numbered asteroids, otherwise the SBDB `spkid`; comets get none. The home page shows
  the closest pass between the moment it is opened and 7 days later, in the visitor's time zone.

### sky.json ("Visible from here" and Sky Finder), added Nov 12, 2026

- Written daily by `asteroid-tracker/fetch_sky.py` (a step of the Asteroid data workflow). Close-Approach Data
  (`cad.api`, `date-min` yesterday, `date-max` 30 days ahead, `dist-max=0.2`, `fullname=true`, `diameter=true`)
  gives the passes; each is kept when its estimated magnitude at closest approach, V ≈ H + 5·log10(Δ) + 2.5 (Δ in
  au, r taken as 1 au, +2.5 for a typical phase angle), is 16 or brighter; at most 40, brightest first.
- For each, Horizons vectors as seen from Earth's centre: `COMMAND='DES=<des>;'` (or `'<number>;'`), `CENTER='500@399'`,
  `REF_PLANE=FRAME`, `REF_SYSTEM=ICRF` (the J2000 equator), `OUT_UNITS=KM-S`, `VEC_TABLE=1`, from 6 days before to 6
  days after closest approach (within yesterday to 31 days ahead), every hour when the pass is within 0.02 au and
  every 3 hours otherwise. Stored as whole kilometres.
- The pages (`shared/sky.js`, `shared/passes.js`) turn these into altitude and azimuth for the visitor's own place:
  precession to the date (IAU 1976), the observer's position on the WGS84 ellipsoid subtracted (parallax matters for
  close passes), refraction (Bennett), and the magnitude from the IAU H, G system (G = 0.15). Checked against Astropy
  at 40 random places and times on Nov 12, 2026: worst errors Sun 0.01°, Moon 0.018°, Jupiter 0.09°, bright stars
  0.008°.
- The visitor's place never leaves the browser: the file is the same for everyone.

### Asteroid names (Minor Planet Center rules)

Used by `decodeCode()` in `asteroid-tracker/search.js`:
- **Provisional code** `YYYY XYn`: the year found; X the half-month (A = Jan 1–15, B = Jan 16–31, … Y = Dec 16–31;
  I and Z not used); Y and n the order in that half-month: 25 letters A–Z without I, n the number of times the
  alphabet was used up, so order = n × 25 + position of Y. Example: 2024 YR4 = Dec 16–31, 2024, 4 × 25 + 17 = 117th.
- Old-style codes before 1925 begin with A and the last three digits of the year (A898 PA = 1898).
- Survey codes `nnnn P-L` (Palomar–Leiden survey, 1960) and `nnnn T-1/T-2/T-3` (Trojan surveys, 1971, 1973, 1977).
- A permanent **number** follows once the orbit is secure, then possibly a **name** approved by the IAU; the full
  name keeps all three: 99942 Apophis (2004 MN4).
- Checked against known discovery dates: Eros Aug 13, 1898 (A898 PA); Apollo Apr 24, 1932 (1932 HA); Phaethon
  Oct 11, 1983 (1983 TB); Bennu Sep 11, 1999 (1999 RQ36); Apophis Jun 19, 2004 (2004 MN4); 2024 YR4 Dec 27, 2024.

## Image Explorer

### GIBS (Global Imagery Browse Services)

- **What:** over 1,000 satellite imagery layers of Earth, as map tiles, by date (1,332 layers on Nov 9, 2026).
- **No key.** Tile URL pattern (WMTS, REST):
  ```
  https://gibs.earthdata.nasa.gov/wmts/{projection}/best/{Layer}/default/{YYYY-MM-DD}/{TileMatrixSet}/{z}/{y}/{x}.{jpg|png|mvt}
  ```
- **Layer list and dates:** the GetCapabilities document of each projection, for example
  `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/wmts.cgi?SERVICE=WMTS&REQUEST=GetCapabilities`.
- **Required acknowledgement** (NASA asks every user of GIBS to show it):
  > We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of
  > NASA's Earth Science Data and Information System (ESDIS).

Checked Nov 9, 2026 (live requests from the published site):
- **Browsers may call it** (CORS allowed): tiles and the GetCapabilities documents load from a web page.
- **Projections:** `epsg4326` (the world as a flat grid of latitude and longitude, 1,332 layers), `epsg3857` (web
  map, 1,332 layers), `epsg3413` (Arctic, 303 layers) and `epsg3031` (Antarctic, 263 layers).
- **The fire layers only work in `epsg4326`** (and the polar projections): they are vector tiles (`.mvt`, points),
  listed in `epsg3857` but every `epsg3857` request returned 404 (eight tiles at zoom 0–7, two dates), while the
  same tiles in `epsg4326` returned data. **The Image Explorer therefore uses `epsg4326`**, as NASA Worldview does.
- **`epsg4326` tile sets:** 512 px tiles from the top-left corner (−180°, 90°); level 0 is 0.5625° per pixel (2 × 1
  tiles), each level halves it. Deepest level: `250m` 8, `500m` 7, `1km` 6, `2km` 5. Tile path order is
  `{level}/{row}/{column}`.
- **Answers:** a tile outside a layer's dates returns 404 (true colour on 1990-01-01; the MUR layers on a day not yet
  processed); a level deeper than the layer's set returns 400. The page treats these as "no picture here", not as
  errors.
- **Size of the layer list:** the `epsg3857` GetCapabilities document is about 5.8 MB, too large to load on every
  visit; each layer's dates are also available on their own (the `…/all/--{TimeEnd}.xml` and `{TimeStart}--{TimeEnd}`
  templates under each layer's `ResourceURL`).
- **A layer's days (used since Nov 10, 2026):** `https://gibs.earthdata.nasa.gov/wmts/{projection}/best/1.0.0/{Layer}/default/{TileMatrixSet}/all/--{YYYY-MM-DD}.xml`
  returns, in about 0.1 s and well under 1 kB, the runs of days the layer has up to that date, in `<Domain>`, for
  example `2002-06-01/2021-02-19/P1D,2021-02-22/2022-11-08/P1D,…`; an unknown layer returns 404. Checked Nov 10, 2026:
  MUR sea temperature misses six short runs of days (newest day two days back), true colour misses nine runs in
  2000–2022; MODIS layers end on the current, still incomplete UTC day. Browsers may read it.
- **Colour maps (used since Nov 10, 2026 for the colour keys):** each `ColorMap` in the v1.3 XML has a `Legend`
  (`continuous`, `discrete` or `classification`) with `LegendEntry` elements in order (`rgb`, `tooltip`, and on some
  `showTick`, `showLabel` and `label`), `minLabel` and `maxLabel`, and the map's `title` and `units` (for example °C,
  %, K). A "No Data" map lists the colour for missing values. Browsers may read them.
- **Colour keys:** each coloured layer lists an SVG legend (`https://gibs.earthdata.nasa.gov/legends/{name}_H.svg`,
  dark text on a light background) and a colour map (`https://gibs.earthdata.nasa.gov/colormaps/v1.3/{name}.xml`).

The eight layers chosen (Nov 9, 2026), with their tile sets in `epsg4326` and first dates:

| On the page | GIBS layer | Tile set · format | From |
|---|---|---|---|
| True colour | `MODIS_Terra_CorrectedReflectance_TrueColor` | 250m · jpg | 2000-02-24 |
| Night lights | `VIIRS_NOAA20_DayNightBand` | 1km · png | 2018-01-05 |
| Sea temperature | `GHRSST_L4_MUR_Sea_Surface_Temperature` | 1km · png | 2002-06-01 |
| Fires | `MODIS_Combined_Thermal_Anomalies_All` | 1km · mvt (points) | 2002-07-04 |
| Snow | `MODIS_Terra_NDSI_Snow_Cover` | 500m · png | 2000-02-24 |
| Clouds | `MODIS_Terra_Cloud_Top_Temp_Day` | 2km · png | 2000-02-24 |
| Smoke and dust | `MODIS_Terra_Aerosol` (aerosol optical depth, land and ocean) | 2km · png | 2000-02-24 |
| Sea ice | `GHRSST_L4_MUR_Sea_Ice_Concentration` | 1km · png | 2002-06-01 |

- Most layers have gaps in their dates (several ranges in the layer list); the page reads them rather than assuming
  every day exists.
- **Newest day:** on Nov 9, 2026 the MODIS and VIIRS layers reached Nov 8 or 9; the two MUR layers (sea temperature,
  sea ice) reached Nov 7.
- **Night lights:** `VIIRS_Black_Marble` (cloud-free city lights) exists only for 2012 and 2016, so the daily
  day/night band is used; it also shows moonlit cloud and fires.
- `Reference_Features_15m` and `Reference_Labels_15m` (coastlines, borders and names from OpenStreetMap) are
  available as overlays if wanted later; they require the OpenStreetMap credit.

### NASA Image and Video Library

- `https://images-api.nasa.gov/search?q=...&media_type=image` (no key).
- Filters: `q` (keywords), `center` (for example JPL, GSFC), `year_start`, `year_end`, `keywords`, `page`.
- Each result has a title, description, date, NASA centre and keywords; `asset/{nasa_id}` lists the image sizes.

Checked Nov 9, 2026 (live requests from the published site):
- **Browsers may call it** (CORS allowed), for searches, `asset/{nasa_id}` and the image files. One search request
  failed to connect and worked when repeated, so the page retries once before showing an error.
- **Answer:** `collection.items[]`, each with `data[0]` (`title`, `description`, `date_created`, `center`,
  `keywords`, `media_type`, `nasa_id`, and sometimes `photographer`, `secondary_creator`, `location`, `album`,
  `description_508`) and `links[]` (image sizes with width and height; `rel: "preview"` is the thumbnail);
  `collection.metadata.total_hits`; `collection.links` with `next` and `prev` pages.
- **Paging:** 100 results per page by default; `page_size` sets it (for example 24). **At most 10,000 results** per
  search: page 100 of 100 works, page 101 returns 400 ("Maximum number of search results have been displayed").
- `center` ignores letter case (`gsfc` = `GSFC`); `media_type=image,video` returns both. Examples: "hubble" 4,960
  results, 598 from GSFC, 249 from 1990–1995; "apollo" 5,940 images and 222 videos.
- **`date_created` is the date in NASA's records,** sometimes not the date the picture was taken (an Apollo picture
  from 1967 carries 2008-07-11); the caption usually gives the real date.
- **`location` is where the picture was published or taken** (for example "Greenbelt, MD" for Goddard), not a map
  position: no result has coordinates. Searching by place therefore searches the words in titles, captions and
  keywords.
- **File names:** `https://images-assets.nasa.gov/image/{nasa_id}/{nasa_id}~{thumb|small|medium|large|orig}.jpg`.
  A listed size can fail to load for a while (`GSFC_20171208_Archive_e000775`: `thumb` and `medium` failed and `small`
  loaded on Nov 9, 2026; all three loaded an hour later), so the page tries the next size before showing "Picture
  unavailable".
  `asset/{nasa_id}` and older records give `http://` links; the page always uses `https://`.

### Blue Marble (the globe's surface), checked Nov 9, 2026

- `BlueMarble_NextGeneration` (also `BlueMarble_ShadedRelief` and `BlueMarble_ShadedRelief_Bathymetry`): NASA's
  cloud-free composite of the whole Earth. Not listed in the GetCapabilities documents, but the tiles load:
  `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/default/500m/{level}/{row}/{column}.jpeg`
  (`default` in place of a date; levels 0–7 of the `500m` set).
- The globe joins level 2 (15 tiles, 2,560 × 1,280 pixels, about 16 km a pixel) and then level 3 (50 tiles,
  5,120 × 2,560, about 8 km a pixel) where the graphics card accepts a picture that wide.

### EONET (Earth Observatory Natural Event Tracker), checked Nov 9, 2026

- `https://eonet.gsfc.nasa.gov/api/v3/events` (no key; **browsers may call it**). Categories (`/api/v3/categories`):
  drought, dust and haze, earthquakes, floods, landslides, manmade, sea and lake ice, severe storms, snow,
  temperature extremes, volcanoes, water colour, wildfires.
- Each event: `id`, `title`, `categories[]`, `sources[]` (the reporting agency's page), `closed`, and `geometry[]`
  (dated points, sometimes polygons, with `magnitudeValue` and `magnitudeUnit`, for example acres for fires).
- **Many events stay open long after their last report:** 7,236 open on Nov 9, 2026 (7,168 wildfires, 32 volcanoes,
  35 sea and lake ice, 1 storm), but only 35 with a report in the last 30 days. The globe asks for
  `status=open&days=30`.

### Sky: stars, galaxies, nebulae, clusters, constellations, checked Nov 9, 2026

- From the d3-celestial project (© 2015 Olaf Frohn, BSD 3-Clause licence, kept as
  `image-explorer/data/LICENSE-d3-celestial.txt`), npm package `d3-celestial`, folder `data/`.
- Positions are `[right ascension, declination]` in degrees, with right ascension from −180 to 180 (M42 the Orion
  Nebula: 83.85, −5.45; M57: −76.6, that is 283.4°); the repository's files store 0 to 360. Checked against known
  positions: Sirius 101.29, −16.72; M31 10.68, +41.27.
- Files used: `stars.6.json` (5,044 stars to magnitude 6, with colour index), `messier.json` (110 Messier objects with
  common names), `dsos.14.json` (15,809 deep-sky objects to magnitude 14, 10,336 of them galaxies),
  `dsonames.json` (724 common names), `constellations.json` and `constellations.lines.json` (88 constellations, plus
  Serpens drawn in two parts: 89 entries).
- **Chosen for the globe** (`image-explorer/tools/build_sky.py`): every Messier object, every object with a common
  name, and every galaxy of magnitude 13 or brighter: 3,265 objects (2,919 galaxies, 165 nebulae, 181 star clusters)
  since Nov 14, 2026. Until then the limit was magnitude 12 (bright enough for a backyard telescope; 1,347 objects);
  galaxies between magnitude 12 and 13 are drawn smaller and dimmer.
- Catalogue corrections made by the build: NGC 3372 named "Carina Nebula" (the catalogue says "η Car Nebula"),
  NGC 3132 "Southern Ring Nebula" (the catalogue gives the name "Eight-Burst Planetary Nebula" to NGC 3132 and
  "Southern Ring" to NGC 6563); objects split into several catalogue numbers (the Rosette Nebula, Stephan's Quintet)
  keep the name on the first part and the number on the others; dark nebulae lose their magnitude, which describes
  nothing visible.
- Four famous targets are not in the catalogue and are listed by hand (J2000, degrees): the Cartwheel Galaxy (9.421,
  −33.716), Westerlund 2 (155.992, −57.764), Cassiopeia A (350.85, +58.815) and the Rho Ophiuchi cloud complex
  (247.025, −24.542). **Checked Nov 9, 2026** against SIMBAD's values as published (Wikipedia's infoboxes, which cite
  SIMBAD, and NASA's Webb image page for the Cartwheel): the Cartwheel and Cassiopeia A were right; Westerlund 2 moved
  by 0.02°; Rho Ophiuchi had been placed on the star Rho Ophiuchi, 1.2° from the cloud complex named after it, and was
  corrected. SIMBAD itself did not answer requests from GitHub Actions within 3 minutes that night.

### Place names (GeoNames), checked Nov 9, 2026

- GeoNames (geonames.org, CC BY 4.0) through the npm package `all-the-cities` 3.1.0 (MIT), which holds the 135,233
  GeoNames places of 1,000 people or more with population and feature code.
- `image-explorer/data/places.json` (`tools/build_places.mjs`): every place of 10,000 people or more and every
  capital, 32,117 places (241 capitals), largest first, about 1.1 MB (about 0.5 MB as sent compressed). It loads the
  first time the place search or the map is used.
- Countries are found by their English names (the browser's `Intl.DisplayNames`) and shown around their capital.
- Mountains, lakes and rivers are not in this list.

### Astronaut photos of Earth (Gateway to Astronaut Photography of Earth), checked Nov 9, 2026

- `https://eol.jsc.nasa.gov`, Earth Science and Remote Sensing Unit, NASA Johnson Space Center: astronaut photos of
  Earth from 1961 to today. **Web pages cannot call it** (no CORS headers); `robots.txt` allows everything.
- **Photos Database API** (documented at `https://eol.jsc.nasa.gov/SearchPhotos/PhotosDatabaseAPI/`):
  `https://eol.jsc.nasa.gov/SearchPhotos/PhotosDatabaseAPI/PhotosDatabaseAPI.pl?query=…&return=…&key=…`, answering
  JSON (a list of records with `table.field` names). `query` is groups of `table|field|operator|value` (operators
  `gt ge lt le eq ne like`, joined with AND); `return` is groups of `table|field`. **A key is required**; keys are free
  and requested by email from jsc-earthweb@mail.nasa.gov.
- Tables: `frames` (cataloged photos: `mission`, `roll`, `frame`, `pdate` YYYYMMDD and `ptime` HHMMSS in UTC, `lat`
  and `lon` of the photo's centre to 0.1°, `nlat`/`nlon` of the point below the station, `cldp` cloud percentage,
  `tilt`, `geon` place name, `feat` features), `nadir` (photos not yet cataloged: only the point below the station),
  `images` (`directory`, `filename`, `width`, `height`, `filesize`; one record per image size).
- Images: `https://eol.jsc.nasa.gov/DatabaseImages/{directory}/{filename}`, for example
  `https://eol.jsc.nasa.gov/DatabaseImages/ESC/small/ISS073/ISS073-E-100000.JPG`; `ESC/small/…` and `ESC/large/…`.
  Photo pages: `https://eol.jsc.nasa.gov/SearchPhotos/photo.pl?mission=ISS073&roll=E&frame=100000`.
- **Credit** (the site's conditions of use): "Image courtesy of the Earth Science and Remote Sensing Unit, NASA
  Johnson Space Center", with the photo number (mission-roll-frame) and the site's address.
- In this repository: `image-explorer/fetch_astronaut_photos.py`, run daily by `.github/workflows/astronaut-photos.yml`
  with the key from the repository secret `EOL_API_KEY`, writes `image-explorer/data/astronaut.json` (the newest 400
  cataloged photos of the last 90 days, or the last year if fewer than 60, with 50% cloud or less). Without the
  secret the job changes nothing and the globe hides the astronaut photos.
- Since Nov 14, 2026 each run adds its photos to those already saved, so the pins build up over time: a photo seen
  again takes its newest details (a photo first placed below the Station moves to its centre point once cataloged),
  one photo is kept a day for each 1° square, and photos older than a year or beyond the newest 2,000 are dropped. The
  file's format is unchanged.

### Astronaut photos without a key: the "Latest ISS Imagery" set, checked Nov 11, 2026

- `https://eol.jsc.nasa.gov/SearchPhotos/PhotoIdSets/PhotoIdSets.pl?set=Latest_ISS_Imagery&view=1` sets a session
  cookie and forwards to `ShowQueryResults-Lightcycle.pl?results=Latest_ISS_Imagery`. With that cookie,
  `GetTSVFromQueryResults.pl?results=Latest_ISS_Imagery` returns the newest 1,000 Space Station photos as tab-separated
  text (ISO-8859-1), no key needed: `mission, roll, frame, Photo Date (YYYYMMDD), Photo Time GMT (HHMMSS), Center
  Point Lat/Lon, Nadir Lat/Lon, Spacecraft Altitude (nautical miles), Lens mm, geon, feat, Clouds Percentage, …,
  camera, RecordType`. Most are "NotCataloged": no centre point, place or cloud cover yet, only the point below the
  Station (nadir). `frame` has a leading space. `temp/Latest_ISS_Imagery.json` is the gallery's own listing.
- Used since Nov 11, 2026 by `fetch_astronaut_photos.py` when the repository has no `EOL_API_KEY`. Photos without a
  centre point are placed below the Station and say so on the globe.

### Image and Video Library: videos, checked Nov 9, 2026

- A video's files are under `https://images-assets.nasa.gov/video/{nasa_id}/` (images are under `image/`):
  `~orig.mp4`, and usually `~large.mp4` or `~medium.mp4`, `~small.mp4`, `~preview.mp4`, `~mobile.mp4`, plus stills
  (`~thumb.jpg`, `~small.jpg`, `~medium.jpg`, numbered frames `~thumb_1.jpg` …) and subtitles (`{nasa_id}.vtt`).
  `asset/{nasa_id}` lists them (with `http://` links that also work as `https://`).
- Sizes for three Apollo 11 films: `~mobile.mp4` 118–177 MB, `~small.mp4` 534–799 MB, `~orig.mp4` 1.5–5.3 GB. The
  page plays the smallest version listed and links the largest.
- The video files send no CORS headers: they play in a page, but a player cannot attach subtitles from another site.
  Checked again Nov 17, 2026: the subtitle files listed by `asset/{nasa_id}` (`.srt` on the videos checked, for
  example "Artemis Origins"; `.vtt` on others) can be read with `fetch` from this site (status 200) at their `https://` address (the list gives `http://`, which an `https` page blocks, so the page changes it; checked live Nov 18, 2026 on an `.srt` and a `.vtt`), so the page
  reads the file, makes it WebVTT and attaches its own copy (a `blob:` address). A file that cannot be read is
  skipped and the video plays without subtitles.
- "apollo 11": 71 videos.

### Image and Video Library: what the results are, checked Nov 9, 2026

- NASA's own order puts launches, people and events first for most mission names: of the first results for "james
  webb", nearly all are testing, launch, people or illustrations. NASA's library holds only about 5 Webb science
  pictures (for example `carina_nebula`, `southern_ring_nebula`, `webb_first_deep_field`, `PIA26702`).
- Clues recorded with each result, used for the page's ranking: `nasa_id` starting `PIA` (Planetary Photojournal),
  `center` `STScI` or `STScI (Webb)` (Space Telescope Science Institute), `nasa_id` of mission frames (`AS11-…`
  Apollo, `iss0…e…` Space Station) point to pictures of space or of Earth from space; `nasa_id` starting `NHQ`, `KSC`
  or `jsc`, and photographers credited "NASA/…", point to event photography.
- NASA's APOD API answered 503 on Nov 9, 2026.

### ESA/Webb and ESA/Hubble picture archives, checked Nov 9, 2026

Decided Nov 9, 2026: ESA's data is added alongside NASA's. The Image Explorer adds ESA's two telescope picture
archives to the Picture library. Checked with requests from GitHub's servers and ESA's published terms.

- **Sites:** `https://esawebb.org/images/` (703 pictures) and `https://esahubble.org/images/` (5,511 pictures), the
  same archive software. No key and no JSON API.
- **Browsers may read them:** every archive page, picture page, feed and picture file answers with
  `access-control-allow-origin: *`.
- **Search:** `/images/?search={words}`, 50 results a page; further pages `/images/page/{n}/?search={words}`; newest
  first with `&sort=-release_date`. The page states the count ("Showing 1 to 50 of 166"); a search with no match has
  no count and no list. Examples: Webb "nebula" 166, "crab" 7, "hubble" 212; Hubble "andromeda" 116, "saturn" 131,
  "crab nebula" 47.
- **Results** are in the page's script as `var images = [ { id, title, width, height, src, url, potw }, … ]`:
  `src` is the 300 px-high thumbnail, `url` the picture's page, `potw` the date for a Picture of the Week or Month
  (empty otherwise). No date, credit or caption in the list.
- **A picture's page** (`/images/{id}/`) holds the title (`<h1>`), the caption, the credit line (`<div
  class="credit">`), and tables "About the Image" (Id, Type such as Observation, Release date, Size) and "About the
  Object" (name, type, constellation, category, distance), plus coordinates (RA, Dec, field of view). The markup
  differs slightly between the two sites (table classes, headings `h3` or `h4`).
- **Files:** `https://cdn.esawebb.org/archives/images/{size}/{id}.jpg` and `https://cdn.esahubble.org/…`, sizes
  `thumb300y`, `screen` (1280 px wide), `large`, `publicationjpg`, and others; originals are TIFF, up to 135 MB.
- **Licence:** Creative Commons Attribution 4.0 (CC BY 4.0) for pictures, videos and web texts. Each picture has
  its own credit line, to be shown in full, unchanged and beside the picture, with active links online. ESA/Webb and
  ESA/Hubble logos need written consent; the material must not suggest endorsement. Music, papers and code are not
  under CC BY 4.0.
- **Videos (used since Nov 10, 2026):** `/videos/?search={words}` and `/videos/page/{n}/?search={words}` on both sites,
  50 a page, "Showing 1 to … of N" as for pictures, but no list in the page's script: each result is a thumbnail
  `https://cdn.{site}/archives/videos/videoframe/{id}.jpg` whose `alt` is the title (on esawebb.org prefixed "Video
  thumbnail for"). A video's page (`/videos/{id}/`) has the title, caption, credit line (`<div class="credit">`, often
  with a music credit) and a table with Id, Release date, Duration and Category. Files:
  `archives/videos/medium_podcast/{id}.mp4` (small), `hd_1080p25_screen/{id}.mp4` (full HD), `ultra_hd/{id}.mp4` (Webb);
  a Hubblecast in full HD is about 86 MB. The videos are under CC BY 4.0 except their music, which has its own terms.
  Checked Nov 10, 2026 from a web page: listing pages, video pages and files load from a browser. A first video search
  on esahubble.org took about 30 s (3 s when repeated), so the page waits at most 12 s for each ESA archive.
- **Used since Nov 9, 2026** by the Image Explorer's Picture library and the globe's selected card (live search,
  thumbnails `thumb300y`, viewer `screen`, "Open large size" `large`). A page past the last answers 404 and is treated
  as empty.
- Example credit lines: weic2622c (Cat's Head Nebula) "NASA, ESA, CSA, STScI. Image Processing: J. Depasquale
  (STScI)"; heic1907a "NASA, ESA, and STScI".

### GIBS polar views, checked Nov 9, 2026

- `epsg3413` (Arctic, 303 layers) and `epsg3031` (Antarctic, 263 layers). Tile grid: 512 px tiles from
  (−4,194,304 m, 4,194,304 m), 8,192 m a pixel at level 0, halving each level; deepest level `250m` 5, `500m` 4,
  `1km` 3. Map projections: polar stereographic, EPSG:3413 `+lat_ts=70 +lon_0=-45`, EPSG:3031 `+lat_ts=-71 +lon_0=0`.
- Of the eight layers: true colour (`250m`), night lights (`1km`), snow (`500m`) and clouds (`1km`, newest day a day
  behind) exist in both; fires (`MODIS_Combined_Thermal_Anomalies_All`, vector tiles) only in the Arctic view; sea
  ice comes from `MODIS_Terra_Sea_Ice` (`1km`, daily, from 2000) because the MUR sea-ice layer is world view only;
  sea temperature and smoke and dust are world view only. Test tiles for each answered 200 with CORS allowed.
- Blue Marble (`BlueMarble_NextGeneration`, `BlueMarble_ShadedRelief_Bathymetry`) is listed in both polar layer lists,
  unlike the world list.
- Checked with live imagery Nov 9, 2026: on Nov 8 the true-colour picture has a black area over the North Pole (polar
  night; MODIS is a camera); on Aug 15 the Arctic is covered. `MODIS_Terra_Sea_Ice` is a classification layer whose
  only coloured class is sea ice (rgb 255, 100, 100; colour map `MODIS_L2_Sea_Ice.xml`). GIBS's microwave sea-ice
  layers, which work in the dark, end in Aug 2021 (`SSMIS_Sea_Ice_Concentration`) and Sep 2025
  (`AMSRU2_Sea_Ice_Concentration_12km`).
- Polar night (checked Nov 17, 2026 against both polar GetCapabilities documents): GIBS lists no newer microwave
  sea-ice layer (no AMSR3). `VIIRS_NOAA21_Ice_Surface_Temp_Night` (Ice Surface Temperature, Night, VIIRS, NOAA-21;
  `1km`, PNG, daily from Feb 10, 2023 to the present; colour map `MODIS_Ice_Surface_Temp`) is a heat-camera layer
  that shows the ice in the dark: on Nov 16, 2026 it covered 17.7% of the Arctic view's level-1 tiles, against 0.2%
  for `MODIS_Terra_Sea_Ice` (the pole in darkness); around Antarctica (spring) 9.7% against 9.0%. The polar views'
  Sea ice uses it from October to March in the Arctic and from April to September around Antarctica (dates from Feb
  10, 2023), and `MODIS_Terra_Sea_Ice` the rest of the year.
- OpenLayers note: `source.refresh()` did not fetch new tiles after the date changed; `setTileUrlFunction(fn, key)`
  with a new key does.

### Place-name services not used

### Natural features (Natural Earth), checked Nov 9, 2026

- Natural Earth 1:10m (naturalearthdata.com, **public domain**), GeoJSON files from the `nvkelso/natural-earth-vector`
  repository on GitHub: `ne_10m_lakes`, `ne_10m_rivers_lake_centerlines`, `ne_10m_geography_regions_points`,
  `ne_10m_geography_regions_elevation_points`, `ne_10m_geography_regions_polys`, `ne_10m_geography_marine_polys`.
- `image-explorer/data/features.json` (`tools/build_features.py`): 3,978 named features (1,063 rivers, 627 mountains
  with their heights, 453 lakes, 405 islands, 219 reservoirs, 214 mountain ranges, 158 island groups, 71 seas,
  61 gulfs, 60 bays, 58 deserts and others), each with a label point, an importance (Natural Earth's `scalerank`) and,
  for areas and rivers, a bounding box so the map can show all of it. About 250 KB.
- Natural Earth gives some lakes a short English name ("Superior", "Nyanza" for Lake Victoria); the build uses the
  full local name when it starts with "Lake" or contains the short name.
- Small features (Lake Louise in Alberta, the Bow River) are below Natural Earth's 1:10m scale and are not included.

### Place-name services not used

- **OpenStreetMap's Nominatim service** forbids search-as-you-type and allows at most 1 request a second (usage
  policy, checked Nov 9, 2026), so the place list is a file in the repository instead.

### Earth map lines, names and countries (Natural Earth 1:50m), added Nov 11, 2026

- From the GeoJSON copies at `github.com/nvkelso/natural-earth-vector/tree/master/geojson`: `ne_50m_coastline`,
  `ne_50m_admin_0_boundary_lines_land`, `ne_50m_rivers_lake_centerlines` (rivers only), `ne_50m_admin_0_countries`
  (outlines and `LABEL_X`, `LABEL_Y`, `MIN_LABEL`; property names in capitals) and `ne_10m_populated_places_simple`
  (`scalerank` up to 7). Built by `tools/build_shapes.py` into `data/shapes.json` (1.2 MB, 0.37 MB compressed),
  `data/countries.json` (0.25 MB compressed) and `data/labels.json` (5,766 names). Public domain.
- The tap card finds the country by point-in-outline; outlines are simplified to about 2 km, so a spot within a few
  kilometres of a coast or border can be given the neighbouring country or the sea.

### Earthquakes (US Geological Survey), checked Nov 11, 2026

- `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson`: earthquakes of magnitude 4.5 or more in
  the past 7 days (101 on Nov 11, 2026), GeoJSON; each with `mag`, `place`, `time` (ms), `url`, and coordinates
  [lon, lat, depth km]. `access-control-allow-origin: *`; no key. Public domain (US Government).

### Blue Marble under the Earth map, checked Nov 11, 2026

- `BlueMarble_NextGeneration` (`default` time, `500m`, JPEG) exists in EPSG:4326, EPSG:3413 and EPSG:3031 and loads from a
  browser. It is drawn under the day's pictures so the gaps between a satellite's passes show the land.

## Spacecraft map (`spacecraft/`), added Nov 12, 2026

### The catalogue (`spacecraft/catalogue.json`)

- Written by hand: each craft's name, agencies, kind, launch date and rocket, a short description, a timeline and
  links to the agencies' own pages, with where its position comes from. Facts checked Nov 12, 2026 against the
  agencies' pages and news. Missions that ended before then are not included (for example MAVEN, lost in 2026;
  Swift, which re-entered on Nov 4, 2026; Gaia, retired in 2025; INTEGRAL, whose science ended in 2025).
- Military satellites are included only where the orbit is published by CelesTrak (for example WSF-M1);
  communication and navigation constellations (Starlink, GPS and similar) are left out, decided Nov 11, 2026.

### Horizons API (spacecraft map), checked Nov 12, 2026

- `spacecraft/fetch_spacecraft.py`, twice a day (workflow `spacecraft-data.yml`). Same query as above, but
  `OUT_UNITS=KM-S`, whole kilometres, and the centre chosen by where the craft is:
  `500@10` (the Sun; every 2–30 days, Parker Solar Probe every 6 hours; from launch or a few years back to a year
  ahead), `500@399` (Earth; craft near L1 and L2 every 6 hours, 60 days back to 120 ahead), `500@301` (the Moon) and
  `500@499` (Mars; orbiters every 5 minutes, rovers every 30, half a day back to a day and a half ahead).
- Ids: as listed in the catalogue (`src.horizons`); craft whose id is not fixed there are looked up by name
  (`src.horizons_name`): the script asks Horizons for the name and takes the id from "Target body name … (−nnn)" or,
  when several match, the line naming the craft. The run log lists every id found and every craft not found.
- The page adds each craft's position to its parent's: the Sun at the origin, Earth and the planets from JPL's
  approximate elements, the Moon from Meeus (chapter 47) moved to the J2000 ecliptic.

- First run (Nov 12, 2026): every Horizons craft found except Tianwen-1 and Tianwen-2 (no Horizons target by those
  names), which stay off the map. Roman resolved to −211, Aditya-L1 to −156, IMAP to −43 and ESCAPADE to −9 (Blue).
  Perseverance's Horizons trajectory ends on Feb 19, 2026, so the map places it at a fixed point in Jezero crater
  (18.44° N, 77.45° E) and turns it with Mars (IAU rotation model: pole α₀ = 317.269°, δ₀ = 54.433°, prime meridian
  W = 176.050° + 350.8919824° a day).

### Past missions' routes (Horizons), added Nov 14, 2026

- `spacecraft/past.json` lists 35 past missions with Horizons ids, checked against the Horizons list of spacecraft
  (`COMMAND='MB'`) on Nov 14, 2026. For each, the job asks Horizons once for the route from launch (or `route.from`)
  to the end (or `route.to`, the landing for the Mars landers and the arrival for orbiters whose orbits would only be
  a tangle at this scale), `STEP_SIZE='600'` (600 equal steps), relative to the Sun or, for missions near Earth and
  the Moon, to Earth; written to `spacecraft/data/routes.json` and kept while the mission's entry is unchanged.
- Coverage found on Nov 14, 2026: Hayabusa from Jan 26, 2009 only; WMAP to Apr 7, 2009; Mariner 2 to Dec 31, 1962;
  Stardust to Mar 12, 2011; Artemis II from Apr 2, 2026 (after leaving Earth orbit); Chandrayaan-1 only from
  Jul 2, 2016 (the radar track that found it again), so it has no route on the map. For craft still circling the Sun,
  Horizons follows Pioneer 10 and 11, Ulysses, Spitzer, Kepler, Herschel, Planck and Gaia today; Mariner 2, Deep
  Space 1, Stardust, Deep Impact and WMAP are no longer followed and are not drawn.
- Landing sites on Mars (degrees, east longitude): Mars Pathfinder 19.13 N 326.78 E; Spirit −14.60 175.52 E (its
  last place); Opportunity −2.28 354.53 E (its last place, Perseverance Valley); Phoenix 68.22 N 234.25 E; InSight
  4.50 N 135.62 E.

### CelesTrak orbital elements, checked Nov 12, 2026

- `https://celestrak.org/NORAD/elements/gp.php?GROUP=<group>&FORMAT=tle` (no key), the groups `stations`, `science`,
  `weather`, `resource`, `noaa`, `goes`, `military`, `geodetic`, `active`, read in turn until every craft is found by
  its exact CelesTrak name (`src.tle`, several spellings allowed); otherwise `?NAME=<name>&FORMAT=tle`.
- A name can also be a catalogue number (`#43435` asks `?CATNR=43435`): CelesTrak does not list TESS by name.
  First run (Nov 12, 2026): all found except TESS, SPHEREx and WSF-M1. SPHEREx (catalogue number 63182) and WSF-M1
  (59481, listed by CelesTrak as "WSF-M") were added by number the same day; TESS (43435) is not returned by CelesTrak
  at all and stays off the map.
- Usage policy (celestrak.org/usage-policy.php): data are updated about every 2 hours, and the same request repeated
  within that time is refused (HTTP 403). The job asks twice a day. Credit: "CelesTrak".
- Written to `spacecraft/data/tle.json`: name, the two lines, NORAD catalogue number and the elements' epoch.
  Positions are worked out in the browser with SGP4 (satellite.js 7.2.0); low-orbit positions drift by kilometres a
  day as the elements age.

### Link check

- Once a day (when the last check is 20 hours old or more, and after every catalogue change), every catalogue link is
  requested (HEAD, then GET); links answering 404 or 410 are written to `spacecraft/data/links.json` and left off the
  page. Other answers (403, 429, timeouts) keep the link. Until Nov 14, 2026 the check ran only on a run starting
  before 12:00 UTC; GitHub started the morning run after midday on Nov 13 and 14, so the check was skipped. The daily
  Data health check lists every broken link (docs/DATA-UPDATES.md).

## Orbit Watch (`orbit-watch/`), checked Nov 17, 2026

Sources approved Nov 17, 2026 (CelesTrak by the developer's decision, as a source that is neither NASA nor ESA). The
data job (built by the Data updates chat) runs `orbit-watch/fetch_orbits.py`, which writes `orbit-watch/data/`; the
figures copied by hand are in `orbit-watch/facts.json`, each with its source and date. Visitors' browsers read only
this site's files, apart from NASA GIBS for the Earth's picture on the globe.

### CelesTrak orbital elements (OMM), checked Nov 17, 2026

- **Address:** `https://celestrak.org/NORAD/elements/gp.php?GROUP=<group>&FORMAT=csv` (no key, no account, free).
  Groups read: `active` (every satellite CelesTrak lists as working), `fengyun-1c-debris`, `cosmos-2251-debris`,
  `iridium-33-debris` (the debris groups listed on CelesTrak's "Current GP Element Sets" page on Nov 17, 2026).
- **Format:** CSV with the OMM keywords (`OBJECT_NAME`, `OBJECT_ID`, `EPOCH`, `MEAN_MOTION`, `ECCENTRICITY`,
  `INCLINATION`, `RA_OF_ASC_NODE`, `ARG_OF_PERICENTER`, `MEAN_ANOMALY`, `NORAD_CAT_ID`, `BSTAR`, `MEAN_MOTION_DOT`,
  `MEAN_MOTION_DDOT` and others). The CSV and JSON formats carry catalogue numbers of 6 digits and more; the
  two-line format does not. Five-digit catalogue numbers ran out on Jul 11, 2026, and objects catalogued since then are
  missing from two-line downloads, which is why Orbit Watch reads the CSV (satellite.js 7.2.0 builds the SGP4 record
  from these fields with `json2satrec`).
- **Not available:** one file of elements for every catalogued object. CelesTrak publishes elements in groups, so most
  dead satellites, rocket bodies and debris are counted (satellite catalogue, below) but not drawn on the globe. To be
  asked of CelesTrak (roadmap section 5a).
- **Usage policy** (celestrak.org/usage-policy.php, updated May 22, 2026): limits are enforced for the active list;
  software must stop at any answer other than HTTP 200 and report it; on a 50x answer queries stop at once. The script
  asks each address once per run, with no retries. The spacecraft job also reads the `active` group (two-line format):
  the two jobs are to share one download (hand-off of Nov 17, 2026).
- **Written to** `orbit-watch/data/objects.json`: for each object the catalogue number, name, international
  designator, kind (from the satellite catalogue), group or mega-constellation flag, epoch (ms), the elements, and the
  owner and launch date from the catalogue. About 2 to 3 MB.
- **Credit:** "CelesTrak".

### CelesTrak satellite catalogue (SATCAT), checked Nov 17, 2026

- **Address:** `https://celestrak.org/pub/satcat.csv` (the "Raw SATCAT Data (CSV)" link on celestrak.org/satcat/; the
  first run of the job confirms the address). Queries for parts of it: `https://celestrak.org/satcat/records.php`.
- **Fields** (satcat-format.php): `OBJECT_NAME`, `OBJECT_ID`, `NORAD_CAT_ID`, `OBJECT_TYPE` (`PAY`, `R/B`, `DEB`,
  `UNK`), `OPS_STATUS_CODE`, `OWNER`, `LAUNCH_DATE`, `LAUNCH_SITE`, `DECAY_DATE`, `PERIOD`, `INCLINATION`, `APOGEE`,
  `PERIGEE` (km), `RCS`, `DATA_STATUS_CODE`, `ORBIT_CENTER`, `ORBIT_TYPE`.
- **Operational status** (satcat/status.php): `+` operational, `-` nonoperational, `P` partially operational, `B`
  backup or standby, `S` spare, `X` extended mission, `D` decayed, `?` unknown. "Active" is `+`, `P`, `B`, `S` or `X`;
  Orbit Watch counts those payloads as working satellites and every other payload as dead.
- **In orbit:** no decay date and orbit centre `EA` (Earth). Each object is counted in the 50 km band of its mean
  height, (apogee + perigee) ÷ 2. CelesTrak's own count on Oct 15, 2026: 35,058 objects in orbit, 32,038 of them
  tracked (the rest restricted or lost).
- **Written to** `orbit-watch/data/heights.json`: counts by kind for each 50 km band from 0 to 2,000 km, and for the
  regions (low, medium, the geostationary band of 35,786 km ± 200 km, higher, coming down, height not published).

### CelesTrak SOCRATES Plus, checked Nov 17, 2026

- **Address:** `https://celestrak.org/SOCRATES/sort-minRange.csv`, the latest run, every predicted pass within 5 km
  over the next seven days, closest first (socrates-format.php).
- **Columns:** `NORAD_CAT_ID_1`, `OBJECT_NAME_1`, `DSE_1` (days since the elements' epoch), `NORAD_CAT_ID_2`,
  `OBJECT_NAME_2`, `DSE_2`, `TCA` (time of closest approach, UTC), `TCA_RANGE` (km), `TCA_RELATIVE_SPEED` (km/s),
  `MAX_PROB` (the largest collision probability the prediction allows), `DILUTION` (km).
- **Written to** `orbit-watch/data/close.json`: the 15 closest passes still to come and the 15 with the largest
  `MAX_PROB`, with each object's kind and whether both are on the globe (for the replay link).
- **Credit:** "CelesTrak SOCRATES Plus".

### NASA Orbital Debris Program Office, checked Nov 17, 2026

- **Satellite Box Score**, Orbital Debris Quarterly News, September 2026 (volume 30, issue 3,
  `https://orbitaldebris.jsc.nasa.gov/quarterly-news/pdfs/ODQNv30i3.pdf`): orbital elements as of Aug 4, 2026, 19,154
  spacecraft (working and dead) and 14,900 rocket bodies and debris, 34,054 in all. Copied by hand into `facts.json`;
  reviewed when a new issue appears (quarterly).
- **Past breakups**, Orbital Debris Quarterly News, February 2023 (volume 27, issue 1): pieces catalogued, Fengyun-1C
  3,532, Cosmos 2251 1,715, Iridium 33 657, Cosmos 1408 1,785. Masses for the 2009 collision (Iridium 33 560 kg,
  Cosmos 2251 about 900 kg) from the April 2009 issue (volume 13, issue 2).
- **How long debris stays up** (ODPO's FAQ and its overview for teachers): below 200 km a few days; 200 to 600 km a few
  years; 600 to 800 km decades; above 800 km centuries; geostationary practically for ever. Speeds in low orbit 7 to
  8 km/s, average collision speed about 10 km/s, up to about 15 km/s; most debris between 750 and 1,000 km.
- **NASA standard breakup model** (Johnson and others, "NASA's new breakup model of EVOLVE 4.0", Advances in Space
  Research 28 (9), 2001): ε = m_small · v² ÷ (2 m_big); above 40 J/g the collision is catastrophic and the fragmenting
  mass is M = m_big + m_small, otherwise M = m_small · v² with v in km/s; pieces larger than L metres:
  N = 0.1 · M^0.75 · L^−1.71. The non-catastrophic form was checked against two published uses of the model
  (arXiv 2111.12196 and 2407.18197), which agree.
- **Terms:** NASA material; NASA marks the newsletter as a work of the US Government, public use permitted. Credit
  "NASA Orbital Debris Program Office".

## Sky Finder (`sky-finder/`), added Nov 12, 2026

- Asteroids: `asteroid-tracker/data/sky.json` (above). Space stations: `spacecraft/data/tle.json`, the ISS and
  Tiangong; a pass is shown when the station is at least 10° up, in sunlight (outside Earth's shadow, taken as a
  cylinder) and the Sun at least 6° below the observer's horizon.
- Bright stars: `sky-finder/data/stars.json`, the 921 stars of magnitude 4.5 or brighter from d3-celestial's
  Hipparcos star file (`stars.6.json`), with the proper names of those of magnitude 2.6 or brighter (d3-celestial's
  `starnames.json`); BSD 3-Clause, © 2015 Olaf Frohn.
- Moon, planets and Sun: computed in the browser (`shared/sky.js`).
- Nothing is requested from any other service; the camera, location and motion readings stay on the device.

## Planetary Maps (`planet-maps/`), checked Nov 17, 2026

Moon and Mars map viewers (roadmap section 5d). Every source below was checked on Nov 17, 2026 against the service's
own capabilities files and catalogue, and loaded from a page on the project's site (`mcsyme11-byte.github.io`) to
confirm that visitors' browsers may read it. No key, no account, free.

### NASA Solar System Treks: Moon Trek and Mars Trek map tiles

- **What:** NASA's planetary map portals, run by the Solar System Treks team at JPL for NASA's Solar System Exploration
  Research Virtual Institute (SSERVI). The same tiles are listed on api.nasa.gov ("Vesta/Moon/Mars Trek WMTS").
- **Documentation:** `https://trek.nasa.gov/tiles/apidoc/trekAPI.html` (WMTS, REST). Each layer has a capabilities file
  at `https://trek.nasa.gov/tiles/<Body>/EQ/<Layer>/1.0.0/WMTSCapabilities.xml`.
- **Tile address:** `https://trek.nasa.gov/tiles/<Body>/EQ/<Layer>/1.0.0/default/default028mm/{z}/{row}/{col}.<jpg|png>`,
  `<Body>` `Moon` or `Mars`. The extension is the one in the layer's `ResourceURL` (JPEG or PNG; it differs by layer).
- **Grid:** equirectangular (simple cylindrical, planetocentric latitude, east longitude −180° to 180°), 256-pixel
  tiles, top-left corner (−180°, 90°). Level `z` is `2^(z+1)` tiles across and `2^z` down, so one pixel is
  `360 / (256 × 2^(z+1))` degrees. Level 0 is two tiles; regional layers use the same grid and have tiles only inside
  their bounding box ("If the image tile is missing, that means there is no data coverage in that area").
- **Polar views:** the service has north- and south-pole (stereographic) versions of some layers. The page does not use
  them: its North and South views (added Nov 17, 2026) reproject the equirectangular layers above in the browser
  (OpenLayers with proj4js; `+proj=stere +lat_0=±90 +lon_0=0` on a sphere of Trek's radius: Mars 3,396,190 m, the
  Moon 1,737,400 m), out to 65° of latitude. The same tiles, so no other source and no change to the Privacy page.
- **Artemis landing regions (not shown, decided Nov 17, 2026):** Trek's layer `A3_Named_regions` is the list of 13
  candidate regions NASA announced in August 2022. NASA published a list of nine in October 2024, and reports in
  2026 describe Artemis III changed to a test flight in Earth orbit, with the first landing moved to a later mission.
  The regions are left off the map until NASA publishes a current list; the craters and mountains named in it
  (Haworth, Mons Mouton, Malapert and others) are marked as places.
- **Catalogue:** `https://trek.nasa.gov/<moon|mars>/TrekServices/ws/index/eq/searchItems?key=<words>&start=0&rows=<n>`
  (JSON: layer name, title, description, bounding box; also landing-site bookmarks and IAU feature names). Readable
  from trek.nasa.gov's own pages only (no CORS header), so it is used by hand and by build scripts, never by the page.
- **CORS:** tile requests from the project's site succeed (`fetch` in CORS mode returned 200 for every layer below).
- **Limits:** none published. The page loads only the tiles on screen.
- **Terms and credit:** the Trek documentation states no licence or credit line ("© 2016 Trek" only). The tiles are NASA
  mission data; each layer is shown with its mission's usual credit (below) and "Map tiles: NASA Solar System Treks".
  Material credited to ESA keeps ESA's credit and licence.
- **Privacy:** visitors' browsers contact `trek.nasa.gov` for tiles, so it is added to the Privacy page before the page
  is published.

Layers chosen (all checked Nov 17, 2026; levels as listed in each capabilities file):

| Body | Layer (`<Layer>`) | What it is | Sharpness | Levels | Format | Credit line |
|---|---|---|---|---|---|---|
| Moon | `LRO_WAC_Mosaic_Global_303ppd_v02` | LRO Wide Angle Camera photo mosaic (Nov 2009 to Feb 2011) | 303 px/°, about 100 m a pixel | 0–8 | JPEG | NASA/GSFC/Arizona State University |
| Moon | `LRO_LOLA_ClrShade_Global_128ppd_v04` | LRO laser altimeter (LOLA) height, coloured and shaded | 128 px/°, about 237 m | 0–5 | PNG | NASA/GSFC (LOLA) |
| Moon | `LRO_NAC_Apollo11_Mosaic_p`, `LRO_NAC_Apollo12_Mosaic_p`, `LRO_NAC_Apollo15_Mosaic_p`, `LRO_NAC_Apollo16_Mosaic_p`, `M129086118.nd.gcs` (Apollo 17) | LRO Narrow Angle Camera close-ups of the Apollo landing sites | about 0.5 m | 0–14 to 0–16 | PNG | NASA/GSFC/Arizona State University |
| Mars | `Mars_Viking_MDIM21_ClrMosaic_global_232m` | Viking orbiters' colour mosaic (MDIM 2.1) | 232 m | 0–7 | JPEG | NASA/JPL/USGS |
| Mars | `Mars_MGS_MOLA_ClrShade_merge_global_463m` | Mars Global Surveyor laser altimeter (MOLA) height, coloured and shaded | 463 m | 0–7 | JPEG | NASA/JPL/GSFC (MOLA Science Team) |
| Mars | `Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw` | MOLA blended with ESA Mars Express's stereo camera (HRSC) heights | 200 m | 0–8 | JPEG | NASA/JPL/GSFC (MOLA); ESA/DLR/FU Berlin, CC BY-SA 3.0 IGO (HRSC) |
| Mars | `JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd` | HiRISE close-up of Jezero crater's floor and delta, made by USGS for Perseverance's landing | 25 cm | 0–17 | PNG | NASA/JPL-Caltech/University of Arizona; USGS |
| Mars | `JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0` | CTX mosaic of the Jezero area, made by USGS for Perseverance's landing | 6 m | 0–13 | PNG | NASA/JPL-Caltech/MSSS; USGS |
| Mars | `Gale_CTX_BlockAdj_dd` | CTX mosaic of Gale crater | about 6 m | 0–12 | PNG | NASA/JPL-Caltech/MSSS |

- Bounding boxes (degrees, east longitude): Jezero HiRISE 77.223–77.584 E, 18.307–18.669 N; Jezero CTX
  77.160–77.699 E, 18.211–18.721 N; Gale CTX 135.18–139.24 E, 6.57–2.81 S; Apollo 11 23.448–23.540 E,
  0.146–1.115 N; Apollo 12 23.445–23.357 W, 3.472–2.502 S; Apollo 15 3.581–3.689 E, 25.796–26.763 N;
  Apollo 16 15.379–15.555 E, 9.606–8.662 S; Apollo 17 30.686–30.844 E, 20.029–20.366 N. Trek has no Narrow Angle
  Camera mosaic of the Apollo 14 site.
- Seen on Nov 17, 2026: Perseverance (77.23 E, 18.44 N) has driven past the western edge of the 25 cm HiRISE mosaic;
  the 6 m CTX mosaic still covers it.
- **Not used (decided Nov 17, 2026):** `CTX_beta01_uncontrolled_5m_Caltech`, the 5 m CTX mosaic of all of Mars
  (preliminary, credited "NASA/JPL/MSSS/The Caltech Murray Lab/Esri"). The regional mosaics above cover both rovers.
- **USGS-made layers (approved Nov 17, 2026):** the Viking mosaic and the Jezero mosaics were produced by the US
  Geological Survey from NASA mission data and are served by NASA's Trek; the developer approved their use.

### Landing sites and the rovers' routes (NASA/JPL), checked Nov 17, 2026

- **What:** the maps on NASA's "Where is the rover?" pages read GeoJSON files from `mars.nasa.gov/mmgis-maps/`:
  - `https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json` (Curiosity's drives; 1,317 features,
    1.36 MB on Nov 17, 2026) and `MSL_waypoints_current.json` (its latest position);
  - `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json` (Perseverance's drives; 559 features,
    1.72 MB) and `M20_waypoints_current.json` (latest position); `M20_waypoints.json` (every stop, 603 KB).
  - `MSL_waypoints.json` (the older name) no longer answers.
- **Fields of the latest position:** `sol`, `site`, `drive`, `lat`, `lon` (degrees, east longitude), `elev_geoid` (m),
  `dist_total_m` (distance driven since landing). On Nov 17, 2026: Curiosity sol 5,073, 38,638 m driven, at
  4.826° S, 137.389° E; Perseverance sol 2,022, 45,246 m driven, at 18.436° N, 77.233° E.
- **Traverse:** `LineString`/`MultiLineString` features, one per drive (Perseverance's carry `sol`, `fromRMC`, `toRMC`,
  `length` in m).
- **CORS:** readable from the project's site. The page reads a small copy made by a data job instead (hand-off of
  Nov 17, 2026 to the Data updates chat), so visitors' browsers do not contact mars.nasa.gov and do not download 3 MB.
- **Terms:** NASA material, credit "NASA/JPL-Caltech". Not a published data product: the files may move without
  notice, so the job keeps the previous copy when they fail (DATA-UPDATES.md).
- **Places added Nov 17, 2026** (positions from Trek's IAU names): on the Moon Cabeus, Haworth, Faustini, Amundsen,
  Mons Mouton, Malapert, Peary and Hermite; on Mars Gusev, Endeavour, Korolev, Planum Boreum, Planum Australe and
  Utopia Planitia. Landing points from NASA's and the agencies' published values: Odysseus 80.13° S, 1.44° E;
  Chang'e 3 44.12° N, 19.51° W; Luna 9 7.08° N, 64.37° W; Lunokhod 1 38.32° N, 35.00° W.
- **Landing sites:** the coordinates in the place list are checked by hand against Trek's landing-site bookmarks and
  NASA's mission pages (Apollo 11, for example, 0.674° N, 23.473° E).

### Place names (IAU, via Trek and the USGS Gazetteer), approved Nov 17, 2026

- Official names of craters, mountains, valleys and plains are set by the International Astronomical Union's Working
  Group for Planetary System Nomenclature; the list is kept by the US Geological Survey (Gazetteer of Planetary
  Nomenclature). Trek's catalogue carries them as `nomenclature` items (name, kind, point; for example Gale, crater,
  137.811° E, 5.3672° S).
- Use: names are taken from Trek's catalogue, or from the USGS Gazetteer where Trek's do not cover them (approved by
  the developer, Nov 17, 2026), built once into `planet-maps/data/` and refreshed quarterly with Place and map lists
  (hand-off of Nov 17, 2026). Visitors' browsers do not contact either service. Credit: "Feature names: IAU Working
  Group for Planetary System Nomenclature (USGS Gazetteer of Planetary Nomenclature)".
- The Gazetteer's own address, format and terms are confirmed before the build script is written.

## Space Weather (`space-weather/`), checked Nov 17, 2026

Every source below was checked on Nov 17, 2026 against its documentation and by reading it from a page on the site's
own address (https://mcsyme11-byte.github.io) in a browser: each answered, and those read as data allowed it (CORS).
None needs a key. The page reads them live in the visitor's browser (decided Nov 17, 2026, because GitHub starts
scheduled runs hours late); a data job keeps only a fallback copy and the monthly record (`space-weather/data/`).

### NASA CCMC DONKI (flares, CMEs, storms, particle events, model runs)

- **What:** the Space Weather Database Of Notifications, Knowledge, Information, kept by NASA's Community Coordinated
  Modeling Center (CCMC) with the Moon to Mars (M2M) Space Weather Analysis Office.
- **Address (since Sep 30, 2026):** `https://ccmc.gsfc.nasa.gov/DONKI-API/get/<type>?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`;
  `https://ccmc.gsfc.nasa.gov/DONKI/WS/get/<type>` answers the same. The old `kauai.ccmc.gsfc.nasa.gov` address no
  longer answers web pages, and `api.nasa.gov/DONKI` answers 404 (see "api.nasa.gov" above). Documentation:
  https://ccmc.gsfc.nasa.gov/tools/DONKI/.
- **Types used:** `FLR` (flares: `peakTime`, `classType`, `activeRegionNum`, `sourceLocation`), `CMEAnalysis`
  with `mostAccurateOnly=true&catalog=ALL` (`time21_5`, `speed`, `halfAngle`, `longitude`, `latitude`, `type`), `GST`
  (storms: `startTime`, `allKpIndex[].kpIndex`), `SEP` (particle events), `WSAEnlilSimulations`
  (`isEarthGB`, `isEarthMinorImpact`, `estimatedShockArrivalTime`, `kp_18`, `kp_90`, `kp_135`, `kp_180`). Also
  available, not used: `CME`, `IPS`, `MPC`, `RBE`, `HSS`, `notifications`.
- **Limits:** a request may cover at most **60 days** (counting both ends); a longer range returns the text "API Error:
  Date range cannot exceed 60 days" instead of JSON. No rate limit is published; answers took 0.1 to 0.5 s.
- **Terms:** NASA research data. DONKI describes itself as preliminary "Experimental Research Information" and names
  NOAA's Space Weather Prediction Center as the official U.S. source of space weather forecasts; the page says so.
- **Credit:** "NASA Community Coordinated Modeling Center, DONKI (Moon to Mars Space Weather Analysis Office)".

### NASA CCMC iSWA, HAPI service (live readings)

- **Address:** `https://iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/` (HAPI 2.0): `catalog`, `info?id=…`,
  `data?id=…&time.min=…&time.max=…&parameters=…&include=header` (CSV with a JSON header; status 1406 means no data in
  the range). `iswa.ccmc.gsfc.nasa.gov` answers the same.
- **Data sets used** (freshness seen on Nov 17, 2026):
  - `imap_swapi` (`sw_proton_density`, `sw_proton_speed`) and `imap_mag` (`bz_gsm`, `b_magnitude`): NASA's IMAP
    spacecraft at L1, I-ALiRT real-time data, minutes old; about one reading every 4 to 12 seconds.
  - `goesp_xray_flux_P1M` (`Long_Wave`, the 0.1–0.8 nm channel that sets the flare class): NOAA's primary GOES
    satellite, minutes old.
  - `GFZ_Indices_P3H` (`Kp_observed`): GFZ's Kp nowcast, 3-hour blocks.
  - `NOAA_KP_P3H` (`Kp_predicted`): NOAA SWPC's Kp forecast, about 3 days ahead (`info` gives the `stopDate`).
- **Stopped (not used):** `WIND_SWE_P2M` and `WIND_MFI_P2M` (Wind real-time, last data Mar 8, 2026) and
  `Predicted_KP_P1M` (last data Mar 9, 2026).
- **Credits:** IMAP: "IMAP I-ALiRT", acknowledging the IMAP Mission Principal Investigator, Prof. David J. McComas of
  Princeton University; licence CC0 per NASA's CDAWeb records for `IMAP_IALIRT_L1_REALTIME`. GFZ Kp: CC BY 4.0,
  "GFZ Helmholtz Centre for Geosciences" (Matzka et al. 2021, doi:10.5880/Kp.0001); approved by the developer Nov 17,
  2026. NOAA (GOES X-rays, the Kp forecast): public domain, "Information from the Space Weather Prediction Center,
  Boulder, CO, NOAA, US Dept. of Commerce"; approved Nov 17, 2026.

### Pictures of the Sun (SDO and SOHO) and NOAA's aurora map

- **SDO** (NASA): `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_<512|1024>_<code>.jpg` with codes `HMIIC`
  (visible light), `HMIB` (magnetic field), `0171`, `0193`, `0304` (ultraviolet, Å). Loaded as pictures; reading them
  as data is not allowed (no CORS), which the page does not need. Credit "NASA/SDO and the AIA, EVE, and HMI science
  teams".
- **SOHO LASCO** (ESA and NASA): `https://soho.nascom.nasa.gov/data/realtime/<c2|c3>/512/latest.jpg`. New pictures
  arrive when a ground station is in contact, so the newest can be hours old. SOHO's terms: use for public education
  and non-commercial purposes needs no permission; credit "Courtesy of SOHO/LASCO consortium. SOHO is a project of
  international cooperation between ESA and NASA" (short form "SOHO (ESA & NASA)").
- **NOAA OVATION aurora forecast:** `https://services.swpc.noaa.gov/images/animations/ovation/<north|south>/latest.jpg`,
  a 30 to 90 minute forecast from the OVATION Prime model (gridded data: `/json/ovation_aurora_latest.json`, not used).
  Public domain; credited as NOAA SWPC.
- The page asks for each picture again every 15 minutes, with a query string that changes every 15 minutes so a
  browser's saved copy is not reused.

### The aurora rules and the geomagnetic pole

- NOAA SWPC, "Tips on viewing the aurora": the aurora's edge nearest the equator lies at about 66° geomagnetic
  latitude at Kp 0 and moves about 2° toward the equator for each step of Kp (48° at Kp 9); the relationship is an
  average. The aurora can be seen low on the horizon when its edge is 4 to 5° poleward of the viewer (4° used).
- NOAA NCEI, World Magnetic Model 2025: geomagnetic north pole 80.85° N, 72.76° W (geodetic) for 2025.0.
- NOAA space weather scales: G1 to G5 at Kp 5 to 9; R1 at M1, R2 at M5, R3 at X1, R4 at X10, R5 at X20; S1 to S5 at
  10 to 10⁵ particle flux units (≥10 MeV).

### Not used

- **ESA Space Weather Service Network** (swe.ssa.esa.int): products need a registered account and a token, and its
  terms allow passing data on only to people who accept those terms, which a public page cannot do (decided Nov 17,
  2026).

## Exoplanets (`exoplanets/`), checked Nov 17, 2026

None of the archives below sends CORS headers (tested from the published site on Nov 17, 2026: requests from a web page
are refused), so the pages read copies kept in `exoplanets/data/` and never call them. Visitors need no key.

### NASA Exoplanet Archive, TAP service

- Address: `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=<ADQL>&format=json` (documentation:
  exoplanetarchive.ipac.caltech.edu/docs/TAP/usingTAP.html). No key. Formats: json, csv, votable, ipac.
- Table: `pscomppars` (Planetary Systems Composite Parameters), one row per confirmed planet, each column the archive's
  chosen or calculated value. 6,470 planets on Nov 17, 2026: transit 4,799, radial velocity 1,205, microlensing 294,
  imaging 98, transit timing 29, eclipse timing 17, orbital brightness modulation 9, astrometry 8, pulsar timing 8,
  pulsation timing 2, disk kinematics 1. The archive adds planets in weekly updates.
- Columns used: `pl_name, hostname, discoverymethod, disc_year, disc_facility, pl_orbper, pl_orbsmax, pl_rade,
  pl_bmasse, pl_bmassprov, pl_orbeccen, pl_eqt, pl_insol, pl_trandep, pl_rvamp, st_teff, st_rad, st_mass, st_lum
  (log10 of solar units), sy_dist (parsecs), ra, dec, sy_pnum, sy_vmag`. `pl_trandep` is in percent; `pl_insol` in
  Earth units.
- Known limit: for planets without a measured radius (most radial-velocity planets) the composite table fills
  `pl_rade` from the mass with a mass–radius relation. `fetch_planets.py` marks such radii as estimates (`radius_kind`)
  and the pages show the mass instead. `pl_bmassprov` says whether a mass is a true mass (`Mass`), a minimum (`Msini`)
  or worked out from the radius (`M-R relationship`).
- Written by `exoplanets/fetch_planets.py` (standard library only) to `planets.json` (about 1.2 MB, 340 KB compressed)
  and `summary.json` (counts, discoveries by year). A reply with fewer than 5,000 planets or a missing column keeps
  the previous files.
- Acknowledgement (the archive's own wording): "This research has made use of the NASA Exoplanet Archive, which is
  operated by the California Institute of Technology, under contract with the National Aeronautics and Space
  Administration under the Exoplanet Exploration Program."

### NASA Exoplanet Archive time series (radial velocities, microlensing)

- Listed by the archive's bulk-download scripts, `https://exoplanetarchive.ipac.caltech.edu/bulk_data_download/`
  (`wget_RADIAL.bat`: 1,072 published radial-velocity curves; `wget_MICROLENSING.bat`). Files are IPAC tables
  (`\KEYWORD = value` lines, `|`-separated headers).
- Used: 51 Pegasi (HIP 113357, file `UID_0113357_RVC_001.tbl`): 256 velocities over 6.0 years, Butler et al. (2006,
  ApJ 646, 505); the fitted wobble is K = 56.3 m/s (the archive's value: 55.8 m/s). OGLE-2005-BLG-390
  (`UID_0300031_PLC_001.tbl`): 151 measurements from the Danish telescope; the planet's short brightening shows about
  ten days after the peak (Beaulieu et al. 2006).

### MAST: TESS and Kepler light curves

- MAST (the Mikulski Archive for Space Telescopes, at the Space Telescope Science Institute) is run for NASA and is
  counted as a NASA source (decided Nov 17, 2026). Read with astroquery (`astroquery.mast.Observations`): TESS 2-minute
  light curves from the SPOC pipeline (`provenance_name` SPOC, `t_exptime` 120, product `LC`) and Kepler long-cadence
  light curves (product `LLC`), PDCSAP flux, quality flag 0 only (Kepler's column is `SAP_QUALITY`).
- Built once by `exoplanets/tools/build_series.py` into `exoplanets/data/series/`: each transit cut out, divided by a
  straight line fitted to the light just before and after it, folded on the archive's period and mid-transit time,
  and averaged in 64 bins. Results on Nov 17, 2026: HD 209458 b, 15 TESS transits, dip 1.58% (archive 1.50%); Kepler-10
  b, 565 Kepler transits, dip 0.0184% (archive 0.0192%); TOI-700 d, 19 TESS transits, dip 0.0608% (archive 0.0613%).
- Acknowledgement: data "obtained from the Mikulski Archive for Space Telescopes (MAST) at the Space Telescope Science
  Institute"; funding for the TESS and Kepler missions is provided by NASA.

### The habitable zone

- **Rule 1, NASA's (decided Nov 17, 2026, the main rule):** the conservative habitable zone of the NASA Exoplanet
  Exploration Program's mission star list for the Habitable Worlds Observatory (Mamajek & Stapelfeldt 2023,
  exoplanetarchive.ipac.caltech.edu/docs/2645_NASA_ExEP_Target_List_HWO_Documentation_2023.pdf): 0.95 to 1.67 au for a
  solar twin, scaled by the square root of the star's luminosity. In starlight received (Earth = 1): 0.359 to 1.108.
- **Rule 2, with the star's temperature:** Kopparapu et al. (2013, ApJ 765, 131; 2014, ApJL 787, L29), the limits for
  a planet of one Earth mass, S_eff = S_sun + aT + bT² + cT³ + dT⁴ with T = Teff − 5780 K, valid for 2,600 to 7,200 K.
  Coefficients as in the authors' published calculator (`hzcalc.py`, personal.ems.psu.edu/~jfk4/ruk15/planets):
  recent Venus 1.776, 2.136e-4, 2.533e-8, −1.332e-11, −3.097e-15; runaway greenhouse 1.107, 1.332e-4, 1.580e-8,
  −8.308e-12, −1.931e-15; maximum greenhouse 0.356, 6.171e-5, 1.698e-9, −3.198e-12, −5.575e-16; early Mars 0.320,
  5.547e-5, 1.526e-9, −2.874e-12, −5.011e-16. Conservative: runaway to maximum greenhouse; optimistic: recent Venus to
  early Mars. Kopparapu is a NASA Goddard research scientist, and NASA's Kepler habitable-zone catalogue (Kane et al.
  2016, NASA Technical Reports Server) uses these limits.
- On Nov 17, 2026: 190 planets inside by rule 1 (19 about Earth's size), 185 inside the conservative zone by rule 2
  (18 about Earth's size), 279 inside the optimistic zone. TRAPPIST-1 (2,566 K) is outside rule 2's range.

### Approved, not yet used

- **ESA Gaia** (approved Nov 17, 2026): Gaia Data Release 4, due Dec 2, 2026, with an exoplanet candidate catalogue,
  from the Gaia Archive (TAP at `https://gea.esac.esa.int/tap-server/tap`; no CORS headers, so a copy is needed).
  Licence CC BY-NC 3.0 IGO (cosmos.esa.int/web/gaia-users/license); credit "ESA/Gaia/DPAC". Candidates are to be shown
  apart from the confirmed planets. The format of the release is to be checked after it is published.
- **ESA CHEOPS** (approved Nov 17, 2026, counted as an ESA source): its public light curves are kept in the CHEOPS
  mission archive, run for ESA by the CHEOPS Science Operations Centre at the University of Geneva. Address, format,
  terms and the exact credit line are to be checked against the mission's documentation before a CHEOPS light curve is
  added.
- **ESA PLATO**: launch planned for January 2027 (ESA); no data yet.

## Using NASA material

- NASA data and imagery are generally free to use and not under copyright in the United States, but NASA's insignia
  (the "meatball" logo) and logotype **may not be used** without permission. These projects use their own emblem.
- Pages say "Data courtesy of NASA" (and ESA where its data is used) and that the project isn't endorsed by NASA or
  ESA.

## ESA (the European Space Agency)

Decided Nov 9, 2026: ESA's data is added alongside NASA's where it helps. Each ESA source gets its own entry here (address,
key if any, limits, terms and the exact credit line), checked against ESA's current documentation before anything is
built on it. ESA sources in use: the ESA/Webb and ESA/Hubble picture archives (Image Explorer, entry above) and the
NEO Coordination Centre's risk lists and close approaches (Asteroid Tracker, entry below).

### Using ESA material, checked Nov 9, 2026

- **CC BY-SA 3.0 IGO:** where ESA expressly says so, its images, videos and other works are released under the Creative
  Commons Attribution-ShareAlike 3.0 IGO licence (esa.int › Services › CC BY-SA 3.0 IGO licence). They may be reproduced,
  shared and adapted without asking, provided the source is credited in ESA's form (for example "Credit: ESA/Rosetta/NavCam
  – CC BY-SA IGO 3.0", "ESA/DLR/FU Berlin, CC BY-SA 3.0 IGO"), the licence text is linked, changes are marked, and
  adaptations are shared under the same licence. Nothing may suggest that ESA endorses them.
- **Other ESA material:** ESA's website terms allow educational, editorial and informational use with ESA's credit
  (for example "©ESA", "ESA/NASA - SOHO/LASCO"); material credited to someone else needs that holder's terms
  (esa.int › ESA Multimedia › Terms and conditions).
- **ESA's logo** is ESA's property, protected under the Paris Convention; any use needs ESA's prior written permission,
  so it is never used. These projects use their own emblem.
- **ESA/Webb and ESA/Hubble** (esawebb.org, esahubble.org) publish their own picture terms (CC BY 4.0 for most images,
  with their own credit lines); check each archive's terms before using it.

### Mars Express HRSC on the Moon and Mars maps, checked Nov 17, 2026

Used by Planetary Maps (`planet-maps/`): the "Height, sharper" layer of the Mars map blends NASA's MOLA heights with
heights from ESA Mars Express's High Resolution Stereo Camera (HRSC), served by NASA's Mars Trek (see "Planetary
Maps"). Place cards may show a Mars Express picture of a place (for example Gale and Jezero craters).
- **Licence:** HRSC images are released by ESA, DLR and FU Berlin under CC BY-SA 3.0 IGO (since December 2014, applied
  to every HRSC image released before then too). Credit line: "ESA/DLR/FU Berlin, CC BY-SA 3.0 IGO", with a link to
  the licence, shown wherever the layer or a picture appears. A picture resized for the site keeps the same licence.
- **Pictures in use (checked Nov 17, 2026 on ESA's own pages):** ESA's website was reorganised in 2026; the older
  `esa.int/ESA_Multimedia/Images/…` addresses now open the home page, and each picture has a page at
  `https://www.esa.int/media/<name>` giving its credit and licence.
  - "Jezero crater and surrounds" (16 Feb 2021): credit "ESA/DLR/FU Berlin"; licence "CC BY-SA 3.0 IGO or ESA
    Standard Licence" (the site uses CC BY-SA 3.0 IGO). File: ESA's `fit_large` copy, WebP, 1210 × 1080 px.
  - "Gale Crater" (6 Aug 2012; colour-coded by height, 100 m a pixel): credit "ESA/DLR/FU Berlin (G. Neukum)";
    licence "ESA Standard Licence" (educational and informational use with the credit). File: `fit_large`, WebP,
    1660 × 933 px.
  - Both load in a page from another site as images (`<img>`); ESA's picture server sends no CORS header, so they are
    shown, not read by script. Visitors' browsers contact media.esa.int when a card with a picture is opened (on the
    Privacy page). The addresses are in `planet-maps/places.json` ("picture").

### ESA Space Debris Office: Space Environment Report and statistics, checked Nov 17, 2026

Used by Orbit Watch (home page and the cleanup page), beside NASA's figures.
- **Space Environment Statistics** (`https://sdup.esoc.esa.int/discosweb/statistics/`, "Space debris by the numbers",
  updated Nov 13, 2026): about 47,280 objects regularly tracked and catalogued; about 7,420 launches since 1957; about
  28,830 satellites placed in orbit, 19,760 still in space, 15,800 still working; more than 660 fragmentation events;
  more than 17,600 tonnes in orbit. MASTER-8 estimates (reference population February 2026): 68,450 objects over
  10 cm (including about 11,300 active payloads), 1.5 million from 1 to 10 cm, 230 million from 1 mm to 1 cm.
- **Space Environment Report 2026** (`https://www.esa.int/Space_Safety/Space_Debris/ESA_Space_Environment_Report_2026`;
  full report `https://www.sdo.esoc.esa.int/environment_report/Space_Environment_Report_latest.pdf`, dated Sep 8,
  2026; data to the end of 2025): more than 300 launches and over 4,000 new payloads in 2025, about ten a day; the
  Space Environment Health Index rose from about 4 to about 50 in a year; the long-term forecast now covers 100 years.
- **Format:** web pages and a PDF; no CSV or JSON download. Figures are copied by hand into `orbit-watch/facts.json`
  and reviewed when ESA updates them (review task in `dev/data_jobs.json`, hand-off of Nov 17, 2026). ESA's charts
  (PNG) are not copied; the site draws its own from the figures.
- **Terms and credit:** no licence of its own is stated; ESA's general terms for educational and informational use
  apply. Credit "ESA Space Debris Office". No ESA logo.
- **Not used:** ESA DISCOS and DISCOSweb (need an account; decided Nov 17, 2026).

### ESA NEO Coordination Centre (NEOCC): risk lists and close approaches, checked Nov 9, 2026

Used by the Asteroid Tracker (Impact risk tab, the asteroid page, the week's details and the map's "On a risk list"
filter), next to NASA's figures, never in place of them. Checked against ESA's "Automated data access" page
(`https://neo.ssa.esa.int/computer-access`) and live answers from GitHub's servers.
- **Address:** `https://neo.ssa.esa.int/PSDB-portlet/download?file=<name>`; no key, no account, free.
  - `esa_risk_list`: every object with a non-zero impact chance (Nov 9, 2026: 2,209 objects).
  - `esa_special_risk_list`: objects monitored separately because their impact dates are beyond the usual window
    (Nov 9, 2026: 101955 Bennu and 29075 (1950 DA)).
  - `esa_recent_close_app` and `esa_upcoming_close_app`: close approaches to Earth within 0.05 au over the past 30 days
    and the coming year (Nov 9, 2026: 364 together).
- **Format:** plain text. A `Last Update: YYYY-MM-DD HH:MM UTC` line, two heading lines, a format line starting `AAAA`,
  then one row per object with `|` between columns. The risk list gives designation and name, diameter (m, `*` when
  estimated), the most likely impact (date and time, IP max, PS max, TS), speed (km/s), the years of possible impacts,
  IP cum and PS cum. The close-approach lists give the date only (no time), the miss distance in km, au and LD,
  diameter, H, brightest magnitude, speed and ESA's CAI index.
- **Designations** have no space: `2008JL3` is "2008 JL3"; survey designations such as `6344PL` are "6344 P-L"; a
  numbered object is given by its number.
- **Status:** ESA describes this access as experimental and liable to change without notice. The job checks each
  table's headings and, if they change, keeps the previous file and stops with an error instead of writing wrong
  figures; the NASA part still runs.
- **Update times:** the risk lists change after each orbit update (the Nov 9, 2026 list was stamped 18:48 UTC); the job
  reads them twice a day (06:17 and 14:47 UTC).
- **CORS:** no `Access-Control-Allow-Origin` header (recorded in `risk.json`, `cors`), so visitors' browsers never
  contact ESA; pages read `asteroid-tracker/data/risk.json` and `asteroid-tracker/data/esa_close.json`. No change to
  the Privacy page is needed.
- **Terms:** the NEOCC portal has no licence of its own and refers to ESA's general terms: educational and
  informational use is allowed with ESA's credit. No ESA logo is used, and pages say the project isn't endorsed by
  NASA or ESA.
- **Credit line, shown wherever the figures appear:** "ESA NEO Coordination Centre (©ESA)", with the list's date. If
  ESA asks for a different form, it is changed in `index.html`, `object.html`, `map.html`, `risk.js`, `object.js`,
  `app.js`, `CREDITS.md` and the Credits page. Contact for questions: the NEOCC (`neocc@esa.int`).
