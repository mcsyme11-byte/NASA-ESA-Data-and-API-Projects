<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff: the "Within reach" data (Nov 17, 2026)

From the Asteroid Tracker chat to the Data updates chat. The Asteroid Tracker's mining view, "Within reach"
(`asteroid-tracker/mining.html`, with a section on every asteroid page), is live and reads two new data files. They
were built once by hand on Nov 17, 2026 from JPL's replies; from now on they need a scheduled step.

## Confirmed answers (Nov 17, 2026)

- NHATS is added to the Asteroid data job, monthly, as planned in the Orbit & Space Watch handoff.
- The script is written and owned by the Asteroid Tracker chat: `asteroid-tracker/fetch_reach.py` (standard library
  only, no key). The schedule, the workflow step, the status entry and `dev/data_jobs.json` are the Data updates
  chat's.

## What the step runs

`python3 asteroid-tracker/fetch_reach.py`, monthly (any quiet hour; about 40 minutes). It writes:

| File | Source | About |
|---|---|---|
| `asteroid-tracker/data/reach.json` | NASA/JPL NHATS API (version 1.3) | 640 KB; 7,219 asteroids on Nov 17, 2026, with launch windows for up to about 600 |
| `asteroid-tracker/data/phys.json` | NASA/JPL SBDB Query API (version 1.0) | 175 KB; 3,040 near-Earth objects with a spectral type, spin or albedo |

It reads `asteroid-tracker/data/neos.json` (for the asteroid pages' ids), so it runs after `fetch_map_data.py` when
both run in the same job.

## How it behaves

- Each file is written only when something besides its time stamp changed.
- A reply in another API version, or a list far shorter than expected (under 1,000 rows), stops that part and keeps
  the previous file; the script then ends with exit code 1 (the "reach" or "phys" part named in its output).
- **Rate limit:** on Nov 17, 2026 JPL answered HTTP 403 after about 800 quick requests from one address. The launch
  windows are therefore asked one at a time, one a second (about 2,400 requests), and the first 403 or 429 ends that
  part: asteroids not reached keep their previous windows (only launches still ahead), and the files are still
  written. A run that hits the limit is not a failure; the next month's run continues.
- Launch windows only ever cover launches from the run's date on; past ones are dropped.

## For the Data updates chat

- Add the step to `asteroid-data.yml` on a monthly condition, with
  `continue-on-error: true` so a JPL problem does not stop the daily asteroid data.
- `dev/data_jobs.json`: a "reach" source with a long allowed age (for example 45 days), and `phys` likewise.
- Data guard: both files are well over 2 KB; neither should shrink below a fifth.
- No secret, no new folder (`asteroid-tracker/data/` is already in `paths-ignore`).

## Still to do (in `docs/ROADMAP.md`)

- The scheduled step (Data updates chat).
- Developer testing of "Within reach" and the asteroid pages' new section.
