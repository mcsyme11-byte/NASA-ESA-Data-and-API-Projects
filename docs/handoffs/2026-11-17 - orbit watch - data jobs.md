# Handoff: Orbit Watch data jobs (Nov 17, 2026)

From the Orbit Watch chat to the Data updates chat. Orbit Watch (`orbit-watch/`) went live on Nov 17, 2026 without its
data files: its pages show "not copied yet" until the first run of the job below.

## 1. Orbit data, twice a day (with the Spacecraft data job)

- **Script:** `orbit-watch/fetch_orbits.py` (standard library only), owned by the Orbit Watch chat. It writes
  `orbit-watch/data/objects.json` (2 to 3 MB), `heights.json` and `close.json`. Exit code 1 when any source failed;
  the files of the sources that worked are written, and the others are left as they were. Each failure is a log line
  starting `  not found:`.
- **Sources** (CelesTrak, approved Nov 17, 2026; details in `docs/DATA-SOURCES.md`, "Orbit Watch"):
  `gp.php?GROUP=active|fengyun-1c-debris|cosmos-2251-debris|iridium-33-debris&FORMAT=csv`,
  `https://celestrak.org/pub/satcat.csv` and `https://celestrak.org/SOCRATES/sort-minRange.csv`. Six requests a run.
  The satellite catalogue address is the "Raw SATCAT Data (CSV)" link; please confirm it on the first run.
- **Schedule:** twice a day, as decided for section 5a of the roadmap. CelesTrak refuses a repeat of the `active` list
  within about two hours, and the Spacecraft data job already reads `active` (two-line format). Requested: one
  CelesTrak download shared by both tools, for example running `fetch_orbits.py --keep "$RUNNER_TEMP/celestrak"` in the
  same workflow as `fetch_spacecraft.py`, with the spacecraft script reading the kept `active.csv` instead of asking
  again (a change to `spacecraft/fetch_spacecraft.py`, for whoever owns the spacecraft map).
- **Options:** `--from DIR` reads saved copies instead of downloading; `--keep DIR` keeps each download;
  `--only gp,satcat,socrates` runs a part (for example the catalogue once a day only).
- **Paths:** add `orbit-watch/data/` to `paths-ignore` in `project-record.yml`, and to the data guard's paths.
- **Guard suggestions:** `objects.json` with at least 10,000 objects and `groups.active` at least 8,000;
  `heights.json` with a total of at least 25,000; `close.json` with at least one pass in `byRange`.

## 2. Review task: NASA's and ESA's figures (by hand)

- `orbit-watch/facts.json`: NASA's Satellite Box Score (each new Orbital Debris Quarterly News, quarterly), ESA's
  Space Environment Statistics (updated every few weeks) and ESA's yearly Space Environment Report. Please add a review
  entry in `dev/data_jobs.json` (quarterly), so the Data health check reminds when it is due.

## 3. Found while checking CelesTrak (for the spacecraft map's owner)

CelesTrak ran out of five-digit catalogue numbers on Jul 11, 2026: objects catalogued since then have six-digit numbers
and are **not in two-line (TLE) downloads**. `spacecraft/fetch_spacecraft.py` reads `FORMAT=tle`, so any craft
launched since July 2026 cannot be found. Reading the CSV or JSON format instead (satellite.js 7.2.0 builds the SGP4
record with `json2satrec`, as `orbit-watch/propagate.js` does) would fix it; `shared/sats.js` would need the same.
