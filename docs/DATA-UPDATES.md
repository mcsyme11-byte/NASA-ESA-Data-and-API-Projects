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
| Asteroid data (`asteroid-data.yml`) | 06:17 and 14:47 daily; after a fetch script changes. A second job, "Within reach", about once a month (see below) | NASA/JPL CAD, SBDB, Horizons, Sentry; ESA NEOCC; NASA NeoWs (key: `NASA_API_KEY`); monthly: NASA/JPL NHATS and SBDB physical data | `asteroid-tracker/data/` (monthly: `reach.json`, `phys.json`) | `asteroid-data.json` |
| Spacecraft data (`spacecraft-data.yml`) | 05:23 and 17:53 daily; after a change to the catalogue or the past missions | NASA/JPL Horizons, CelesTrak; link check once a day; reads `spacecraft/catalogue.json` and `spacecraft/past.json` (both edited by hand) | `spacecraft/data/` (`positions.json`, `tle.json`, `links.json`, `routes.json`) | `spacecraft-data.json` |
| Astronaut photos (`astronaut-photos.yml`) | 07:41 and 19:11 daily | NASA Gateway to Astronaut Photography of Earth (key: `EOL_API_KEY`, or the public Latest ISS Imagery set) | `image-explorer/data/astronaut.json` | `astronaut-photos.json` |
| Mars data (`mars-data.yml`) | 09:23 Mondays and Thursdays | NASA PDS (Curiosity REMS, Perseverance MEDA); ESA PSA (Mars Express MaRS) | `mars-data/data/` | `mars-data.json` |
| Place and map lists (`build-places.yml`) | 03:37 on January, April, July and October 2; by hand with "names only" for just the Moon and Mars names | GeoNames; Natural Earth; the IAU's planetary names from NASA Solar System Treks or the USGS Gazetteer | `image-explorer/data/` (features, globe places, map lines, countries, names); `planet-maps/data/names-mars.json`, `names-moon.json` | `build-places.json` |
| Orbit data (`orbit-data.yml`) | 11:13 and 23:13 daily (at least five hours from Spacecraft data, which also reads CelesTrak's active list) | CelesTrak: elements (CSV) of the active satellites and three debris clouds, the satellite catalogue (`pub/satcat.csv`), SOCRATES Plus close passes | `orbit-watch/data/` (`objects.json`, `heights.json`, `close.json`) | `orbit-data.json` |
| Exoplanets data (`exoplanets-data.yml`) | 11:43 Tuesdays and Wednesdays; the measurements (`exoplanets-build.yml`) only by hand | NASA Exoplanet Archive (TAP, `pscomppars`) | `exoplanets/data/planets.json`, `summary.json` | `exoplanets-data.json` |
| Rover routes (`rover-routes.yml`) | 08:29 and 20:59 daily | NASA/JPL "Where is the rover?" files (mars.nasa.gov/mmgis-maps), one source per rover | `planet-maps/data/routes.json` | `rover-routes.json` |
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
10. **Sources on a longer cycle** (since Nov 17, 2026). A source updated monthly or less often runs as its own job
    in the same workflow, after the daily job has saved (`needs:`), so the daily data never waits for it. In
    `dev/data_jobs.json` it has `every_days` (how often), `retry_days` (how soon after a failure) and `max_age_days`
    (the longest time allowed since its last success). Its job first asks `python3 dev/datajob.py --due JOB SOURCE…`
    and runs only when a source is due, so a late or skipped run never makes it miss a cycle. The first such sources
    are "Within reach" (`reach`, `phys`; every 28 days, allowed 45), in the Asteroid data workflow's job `reach`,
    which can also be started by hand (Run workflow › "reach").

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
- A source with `every_days` also has `last_run` and `last_ok` (when it last ran, and last succeeded).
- `notes` are lines from the run's log that match the job's `--watch` pattern (the spacecraft job keeps every
  "not found" line).
- The file changes only when a state or a note changes or data is saved, so it does not add a commit to every run.

## The outside clock

Decided Nov 17, 2026; set up Nov 17 and 18, 2026. GitHub's own `schedule` runs here 4 to 10 hours late (median about
7 hours), so free timers at cron-job.org start each job at its cron times instead, through GitHub's API: one timer per
cron time (11 so far; Orbit data and Exoplanets data still to add), each in UTC, sending `POST /repos/mcsyme11-byte/NASA-ESA-Data-and-API-Projects/actions/workflows/<file>/dispatches`
with the body `{"ref":"main"}` and the headers `Accept: application/vnd.github+json`, `X-GitHub-Api-Version:
2022-11-28`, `Content-Type: application/json` and `Authorization: Bearer <token>`. A run started this way begins within
about a minute. GitHub's own `schedule` stays in every workflow as the backup; a second run on the same data changes
nothing, because `dev/datajob.py` commits only when a file changed.

- **The token:** a fine-grained personal access token ("NEDAP data job starter"), Actions read and write on this
  repository only, nothing else. It lives only in the timers at cron-job.org, never in the repository. It expires
  Nov 17, 2027; `clock.token_expires` in `dev/data_jobs.json` holds the date, and the health check lists it to review
  30 days before and reports a problem once it has expired. To renew: GitHub › Settings › Developer settings ›
  Fine-grained tokens › NEDAP data job starter › Regenerate token; paste the new value into each timer's
  Authorization header (Edit › Advanced › Headers); set `token_expires`.
- **Adding a job or changing a time:** change the workflow's `cron` and `dev/data_jobs.json` together, as before, then
  add or change the matching timer (Clone an existing timer, then set its title, address and schedule; a clone starts
  switched off, so switch it on with "Enable job" and save). Timer titles read "NEDAP <Job> <hh:mm> UTC".
- **Stopping it:** switch the timers off at cron-job.org, or delete the token on GitHub; the jobs then run on
  GitHub's own schedule only.

## The daily health check

`dev/data_health.py`, run by `data-health.yml` at 22:07 UTC, reports:

- **Problems:** a data workflow switched off (GitHub switches off schedules in a repository with no activity for 60
  days); no successful run within `max_age_hours`; a latest run that failed; a source failed for longer than its
  `grace_hours`; a source on a longer cycle not updated within its `max_age_days`; a schedule in
  `dev/data_jobs.json` that differs from its workflow.
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
| Rover routes | 30 | 48 |
| Orbit data | 30 | 24 |
| Exoplanets data | 192 | 0 |

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

## The control room

`control-room/` (since Nov 17, 2026; unlisted: not in the menus or the footer, `noindex`) is the developer's view of
the data updates: what needs attention, with a "Copy for the chat" message for the Data updates chat whenever a job
failed, a source is failing, a job is late, a monthly source is past its allowed age or the `data-health` issue is
open; the last 7 days at a glance (runs, successes, the median delay of GitHub's timer and of the outside clock, data
commits); every job and source, with the monthly sources' next due dates; the latest runs, scheduled against started
and who started them; recent data saves; refusals, log notes and broken catalogue links; and what is coming up
(next runs, cycles, reviews, the outside clock and its token). It reads the same files as the live data status, and
GitHub's public lists of runs, commits and the `data-health` issue, kept 3 to 15 minutes in the tab.

Technical parts (added Nov 17, 2026): **Jobs in detail**, a table of each job's workflow file, cron times (UTC),
limits (`max_age_hours`, `grace_hours`, monthly cycles), latest run and links (workflow file, its runs, status file,
data, scripts), with a **Copy report** under each job; **The system** (repository and hosting, runners and minutes
used, what starts the jobs, the data-job standard, the health check, the page's GitHub request limit and style
version); and **Where everything lives** (links on GitHub and to the rules and records). The reports are plain text for
the Data updates chat: the job's state, workflow and limits, latest run with its failed steps (read from GitHub's list
of the run's jobs, once per finished run), every source's record, the log notes, and the status file, data and
scripts. **Copy for the chat** copies the problem summary with the report of each job named; **Copy full report**
copies every job. The data folders and scripts shown come from `data` and `scripts` in each job's entry in
`dev/data_jobs.json`.

## Tasks done by hand

Listed under `reviews` in `dev/data_jobs.json`; the health check lists each one when it is due. After doing one, set
its `last_done` to that date.

| Task | Every |
|---|---|
| Spacecraft catalogue (`spacecraft/catalogue.json`): ended missions taken off, new missions added | 90 days |
| Data sources (`docs/DATA-SOURCES.md`): addresses, limits and credit lines still match the agencies' documentation | 180 days |
| Orbit Watch figures (`orbit-watch/facts.json`): NASA's Satellite Box Score, ESA's Space Environment Statistics and yearly report | 90 days |

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
