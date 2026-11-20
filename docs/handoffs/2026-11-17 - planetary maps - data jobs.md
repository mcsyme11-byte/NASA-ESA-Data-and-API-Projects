<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff: Planetary Maps data jobs (Nov 17, 2026)

From the Planetary Maps chat to the Data updates chat. Sources are recorded in `docs/DATA-SOURCES.md` ("Planetary
Maps"). The map tiles themselves need no job: visitors' browsers read them from NASA's Trek.

## Confirmed answers (Nov 17, 2026)

- **The rovers' routes are updated daily** (the developer, Nov 17, 2026). This replaces the roadmap's earlier note
  that the routes would be added to the Mars data job (Mondays and Thursdays).
- The developer plans a project-owned replacement for GitHub's scheduled runs later, because scheduled runs start
  hours late; until then the jobs follow `docs/DATA-UPDATES.md` as it stands.
- The place names come from Trek's catalogue, or from the USGS Gazetteer of Planetary Nomenclature where Trek's do
  not cover them (USGS approved by the developer, Nov 17, 2026).

## 1. Rovers' routes, daily

| | |
|---|---|
| Sources | NASA/JPL "Where is the rover?" files: `https://mars.nasa.gov/mmgis-maps/MSL/Layers/json/MSL_traverse.json` and `MSL_waypoints_current.json` (Curiosity); `https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_traverse.json` and `M20_waypoints_current.json` (Perseverance). No key. |
| Size | About 3 MB together (Nov 17, 2026), growing with each drive |
| Output | `planet-maps/data/routes.json` (format below), expected under 300 KB |
| Status file | as the Data updates chat names the job |
| Schedule | daily, with the standard second run; NASA updates the files after drives, not on a fixed timetable |
| Fetch script | `planet-maps/fetch_routes.py` (ready since Nov 17, 2026; standard library only; `--test` runs it on sample data without the network). Prints one line per rover, with "not found" or "check failed" when a rover keeps its previous entry; exits 1 only when no rover could be read; leaves the file untouched when no rover has moved. The workflow, `dev/data_jobs.json` entry and status are the Data updates chat's |

Options for the workflow, for the Data updates chat to choose: a new job (for example "Rover routes",
`rover-routes.yml`), or a daily step in an existing daily job. The Mars data job runs twice a week and would need to
become daily for this.

Format of `routes.json` (one entry per rover, each step a separate source so one rover's failure keeps its previous
entry):

```json
{
  "updated": "2026-11-17T20:00:00Z",
  "rovers": {
    "curiosity": {
      "name": "Curiosity", "site": "Gale Crater", "sol": 5073, "lat": -4.826023, "lon": 137.388886,
      "elev_m": -3472.1, "driven_m": 38638,
      "route": [[137.4417, -4.5895], ["… lon, lat pairs, east longitude, 6 decimals"]]
    },
    "perseverance": { "name": "Perseverance", "site": "Jezero Crater", "sol": 2022, "…": "…" }
  },
  "source": "NASA/JPL-Caltech, mars.nasa.gov/mmgis-maps"
}
```

- The drives are joined into one line per rover in order of sol, and thinned (points closer than about 1 m to the
  line dropped) so the file stays small; positions keep 6 decimals (about 6 cm on Mars).
- Checks before saving: both rovers present; the sol and the distance driven never decrease; every position inside
  its crater's area (Gale: 136–139° E, 7–3° S; Jezero: 76.5–78.5° E, 17.5–19.5° N). A failed check keeps the previous
  file.
- Known: the older file name `MSL_waypoints.json` no longer answers; the files are not a published data product and
  may move. A "not found" note in the log names the file.

## 2. Place names, built once, then quarterly

- `planet-maps/tools/build_names.py` (ready since Nov 17, 2026; `--test` for sample data) writes `planet-maps/data/names-moon.json` and
  `names-mars.json`: each official feature's name, kind (crater, mons, vallis …), position and size, from Trek's
  catalogue (`nomenclature` items) or the USGS Gazetteer.
- Format: `{"updated", "source", "names": [[name, kind, latitude, longitude], …]}`. A body whose list cannot be read,
  or that comes back with under half the previous count, keeps its previous file; exits 1 only when both fail.
- Built once (the first run of the job, or Actions by hand); then refreshed quarterly with the Place and map lists job (`build-places.yml`,
  January, April, July and October 2), which already rebuilds the GeoNames and Natural Earth lists.

## For the Data updates chat

- Add `planet-maps/data/` to `paths-ignore` in `project-record.yml`, and each job to `dev/data_jobs.json` and the tables in
  `DATA-UPDATES.md`.
- Both scripts are ready, and the page is live (Nov 17, 2026). Until the first runs, the page shows "the daily copy is
  not available yet" for the routes and searches only the marked places, and the browser logs a "not found" for each
  of the three missing files. Neither script has been run against the live services yet (the Planetary Maps chat's
  machine cannot reach them); the first run by hand is the check, and its log lines show the counts.
