# Data updates

How the project's data is kept up to date automatically: the data jobs, the standard every job follows, the status
files and the daily health check. Decided Nov 14, 2026.

## Who looks after what

- **Decided Nov 14, 2026:** automatic data updates for the whole project are looked after in one place, the "Data
  updates" chat of the Claude project. It owns every scheduled data workflow in `.github/workflows/`, the shared tools
  in `dev/` (`datajob.py`, `data_health.py`, `data_jobs.json`), the status files in `shared/data/status/` and this
  document.
- Each project's chat keeps its own page code, its fetch and cleaning scripts (`fetch_*.py`, `mars-data/analysis/`,
  `image-explorer/tools/`) and its data sources (`docs/DATA-SOURCES.md`).
- A new data job, a change to a schedule, or a change to the format or place of a data file follows the standard
  below and is recorded here; schedules, failures and stale data are handled by the Data updates chat.

## The data jobs

| Job (workflow) | Runs (UTC) | Sources | Files written | Status file |
|---|---|---|---|---|
| Asteroid data (`asteroid-data.yml`) | 06:17 and 14:47 daily; after a fetch script changes | NASA/JPL CAD, SBDB, Horizons, Sentry; ESA NEOCC; NASA NeoWs (key: `NASA_API_KEY`) | `asteroid-tracker/data/` | `asteroid-data.json` |
| Spacecraft data (`spacecraft-data.yml`) | 05:23 and 17:53 daily; after a change to the catalogue or the past missions | NASA/JPL Horizons, CelesTrak; link check once a day; reads `spacecraft/catalogue.json` and `spacecraft/past.json` (both edited by hand) | `spacecraft/data/` (`positions.json`, `tle.json`, `links.json`, `routes.json`) | `spacecraft-data.json` |
| Astronaut photos (`astronaut-photos.yml`) | 07:41 and 19:11 daily | NASA Gateway to Astronaut Photography of Earth (key: `EOL_API_KEY`, or the public Latest ISS Imagery set) | `image-explorer/data/astronaut.json` | `astronaut-photos.json` |
| Mars data (`mars-data.yml`) | 09:23 Mondays and Thursdays | NASA PDS (Curiosity REMS, Perseverance MEDA); ESA PSA (Mars Express MaRS) | `mars-data/data/` | `mars-data.json` |
| Place and map lists (`build-places.yml`) | 03:37 on January, April, July and October 2 | GeoNames; Natural Earth | `image-explorer/data/` (features, globe places, map lines, countries, names) | `build-places.json` |
| Data health (`data-health.yml`) | 22:07 daily | the jobs above (reads only); also checks that each schedule in `dev/data_jobs.json` matches its workflow | the `data-health` GitHub issue | none |

Data built once and not refreshed, because its sources do not change: the town list (`places.json`, from the pinned
`all-the-cities` package), the sky catalogue (`sky.json`, `stars.json`, `constellations.json`) and the Asteroid
Tracker's list of famous passes (refreshed monthly by the Asteroid data job).

GitHub sometimes starts a scheduled run hours late or skips it (seen on Nov 9, 13 and 14, 2026); the second daily
time and the health check's allowance for age cover this.

## The standard every data job follows

1. **Two times a day for daily data.** A daily job has a second, later run that catches up when GitHub delays or
   skips the first. A run that finds nothing new commits nothing.
2. **Steps named by source.** Each source has its own step with an `id`. A source that may fail on its own without
   spoiling the others runs with `continue-on-error: true`, and its script keeps that source's previous file when it
   cannot read it.
3. **The previous good copy is kept.** Data is saved only when the job's required steps succeeded. Files of a part
   that failed half-way go back to their previous versions.
4. **One last step, `dev/datajob.py`, always runs** (`if: always()`). It:
   - checks every changed data file before it is saved (the **data guard**): JSON must read, a CSV must have a header
     and rows, no file may be emptied, a file over 2 KB may not shrink to under a fifth of its size (unless the job
     names it with `--allow-shrink`), and no more than half of a folder's files may disappear at once; a refused file
     is put back to its previous version and the run is marked failed;
   - writes the job's **status file**;
   - commits the data and the status in one commit with the job's standard message, and pushes it, taking in other
     work pushed meanwhile (up to five attempts; never a force push).
5. **Standard commit messages:** "<Job>: <what was updated>" for data (for example "Asteroid data: daily close-approach,
   impact-risk and NeoWs update"), and "<Job>: status" when only the status changed.
6. **Secrets only as repository secrets** (`NASA_API_KEY`, `EOL_API_KEY`), passed to the one step that needs them.
7. **Free and current.** Jobs run on `ubuntu-24.04` with the current major versions of GitHub's own actions
   (`actions/checkout@v6`, `actions/setup-python@v6`, `actions/setup-node@v6`), and use only free services.
8. **Data folders only.** A data job writes only inside its `data/` folders and its status file, so the Project Record
   is not rebuilt for data (`project-record.yml` ignores those paths).
9. **Listed for the health check.** Every data job has an entry in `dev/data_jobs.json` with its longest allowed time
   between successful runs (`max_age_hours`) and how long a source may stay failed before it is reported
   (`grace_hours`).

## Status files

`shared/data/status/<job>.json`, one per job, written by `dev/datajob.py`:

```json
{
 "job": "asteroid-data",
 "workflow": ".github/workflows/asteroid-data.yml",
 "last_data_change": "2026-11-15T06:40:12Z",
 "sources": {
  "risk-lists": {"state": "failed", "since": "2026-11-15T06:40:12Z", "note": "", "run": "https://github.com/…"},
  "close-approaches": {"state": "ok", "since": "2026-11-15T06:40:12Z", "note": ""}
 },
 "notes": []
}
```

- `state` is `ok` or `failed`; `since` is when that state began. A skipped step keeps its previous state.
- `checks` is the data guard's own entry; its note names any refused file and the reason.
- `notes` are lines from the run's log that match the job's `--watch` pattern (the spacecraft job keeps every
  "not found" line).
- The file changes only when a state or a note changes or data is saved, so it does not add a commit to every run.

## The daily health check

`dev/data_health.py`, run by `data-health.yml` at 22:07 UTC, reports:

- **Problems:** a data workflow switched off (GitHub switches off schedules in a repository with no activity for 60
  days); no successful run within `max_age_hours`; a latest run that failed; a source failed for longer than its
  `grace_hours`.
- **To review:** log notes not listed in `known_notes`; the spacecraft catalogue's links that no longer answer
  (`spacecraft/data/links.json`); review tasks that are due.

The report is kept in one GitHub issue labelled `data-health`. It is opened when there is something to report,
edited every day, given a comment when its list of items changes, and closed with a comment when the list is empty.
GitHub emails a new issue and each comment to the repository's owner, so an email arrives only when something has
changed. The Mars data job also opens its own issue when new Mars data is added or NASA's list of re-released files
changes.

| Job | `max_age_hours` | `grace_hours` |
|---|---|---|
| Asteroid data | 30 | 24 |
| Spacecraft data | 30 | 24 |
| Astronaut photos | 30 | 48 |
| Mars data | 108 | 0 |
| Place and map lists | 2400 | 0 |

## On the site: the live data status

Since Nov 14, 2026 the site shows the state of the data jobs to every visitor (`shared/datastatus.js`):

- **Every footer** ends with a live line (added by `shared/footer.js`): a status light and one sentence ("All data is
  up to date", "Updating spacecraft data now", "One source is failing"), linked to the page below.
- **How the data is collected** (`data-collection/`): a status board with every job's state, its sources, its last
  check, its newest data, a countdown to its next run and its latest runs; the day's schedule in the visitor's own
  time zone; what each job collects; and the safeguards.

The state is worked out in the browser from `dev/data_jobs.json` (names, schedules, sources), the status files, and
GitHub's public list of workflow runs (api.github.com, no key; 60 requests an hour per visitor, so the answer is kept
in the tab's session storage for 3 minutes). Without GitHub's list the status files are used alone. In order of
precedence: **failed** (the latest finished run failed), **partly failed** (a source failing; its previous data is
kept), **updating** (a run in progress or queued), **late** (no successful run within `max_age_hours`), **up to date**.

## Tasks done by hand

Listed under `reviews` in `dev/data_jobs.json`; the health check lists each one when it is due. After doing one, set
its `last_done` to that date.

| Task | Every |
|---|---|
| Spacecraft catalogue (`spacecraft/catalogue.json`): ended missions taken off, new missions added | 90 days |
| Data sources (`docs/DATA-SOURCES.md`): addresses, limits and credit lines still match the agencies' documentation | 180 days |

## Adding or changing a data job

1. Write or change the fetch script in the project's folder; it keeps the previous file when its source cannot be
   read, and prints a recognisable line (for example "not found") for anything a person should look at.
2. Give each source its own step with an `id`, and end the workflow with the `dev/datajob.py` step (see
   `asteroid-data.yml` as the model): `--job` (the workflow's file name without `.yml`), `--message`, `--paths`
   (only when the required steps succeeded), one `--source name=${{ steps.<id>.outcome }}` per source, and
   `--log`/`--watch` where notes are wanted.
3. Add the job to `dev/data_jobs.json` (its `cron` exactly as in the workflow, which the health check compares, and a
   label and agency for each source, which the site shows) and to the tables above.
4. Add the data folder to `paths-ignore` in `project-record.yml` if it is a new folder.
5. Record the source in `docs/DATA-SOURCES.md` and its credit in `CREDITS.md` and on the Credits page, as CLAUDE.md
   requires.
6. Run the workflow by hand once (Actions › the job › Run workflow), then Data health, and check both.

## Running by hand

```
python3 dev/data_health.py --dry-run        # the report, without touching the issue (needs gh and GH_TOKEN)
python3 dev/datajob.py --job <job> --message "<Job>: test" --paths <folder> --source <name>=success --no-push
```
