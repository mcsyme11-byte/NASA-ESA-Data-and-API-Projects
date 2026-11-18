# Handoff: Exoplanets data (Nov 17, 2026)

From the Exoplanets chat to the Data updates chat. Exoplanets (`exoplanets/`) is live and reads files in
`exoplanets/data/`, built on Nov 17, 2026 by the hand-run workflow "Exoplanets data, built by hand"
(`.github/workflows/exoplanets-build.yml`, `workflow_dispatch` only, no schedule, no status file). Sources:
`docs/DATA-SOURCES.md`, "Exoplanets".

## Confirmed answers (Nov 17, 2026)

- A weekly Exoplanets job, as planned in the Orbit & Space Watch handoff. The NASA Exoplanet Archive adds planets in
  weekly updates.
- The scripts are the Exoplanets chat's: `exoplanets/fetch_planets.py` (standard library only) and
  `exoplanets/tools/build_series.py`. The workflow, schedule, status file and `dev/data_jobs.json` entry are the Data
  updates chat's, which may take over or replace `exoplanets-build.yml`.

## 1. Confirmed planets, weekly

| | |
|---|---|
| Runs | `python3 exoplanets/fetch_planets.py` (under a minute) |
| Source | NASA Exoplanet Archive TAP, table `pscomppars` (no key) |
| Writes | `exoplanets/data/planets.json` (about 1.2 MB) and `summary.json` (about 110 KB), only when something besides the time stamp changed |
| Schedule | weekly, with a second run as the standard asks; a quiet hour on a weekday |
| Guard | the script keeps both previous files and ends with exit code 1 when the reply has fewer than 5,000 planets or lacks a column |
| Age allowance | about 192 hours (8 days) |

## 2. Light curves and other measurements: no schedule

`exoplanets/tools/build_series.py` (NumPy, Astropy, astroquery; 5 to 15 minutes; downloads about 300 MB from MAST)
writes `exoplanets/data/series/`. The measurements do not change; it is rebuilt only when a target is added, by hand.
Each target is built on its own; one that fails keeps its previous file and the script ends with exit code 1.

## Also

- `exoplanets/data/` can go into `paths-ignore` in `project-record.yml`, like the other data folders.
- Gaia Data Release 4 (Dec 2, 2026) will add a file of planet candidates, built once per Gaia release; a further
  hand-off follows once its format is checked.
