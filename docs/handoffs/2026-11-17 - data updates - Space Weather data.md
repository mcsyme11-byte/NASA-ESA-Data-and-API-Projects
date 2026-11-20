<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff: Space Weather data job (Nov 17, 2026)

From the Space Weather chat to the Data updates chat. The Space Weather page (`space-weather/`, published Nov 17,
2026) reads everything live in the visitor's browser; this job only keeps a fallback copy and the monthly record
behind the page's "Since 2010" view. Sources are recorded in `docs/DATA-SOURCES.md` ("Space Weather").

## Confirmed answers (Nov 17, 2026)

- **Live in the browser, the job as a fallback only** (roadmap section 4, decided with this hand-off): DONKI and iSWA
  answer web pages (CORS), need no key and were checked from the site's own address on Nov 17, 2026. GitHub starts
  scheduled runs 4 to 10 hours late, so the saved copy is a stand-in when NASA cannot be reached, not the main source.
- **Sources approved by the developer (Nov 17, 2026):** GFZ's Kp, NOAA's GOES X-rays and NOAA's Kp forecast, all read
  through NASA CCMC's iSWA service; NOAA SWPC itself (the aurora map) is loaded by the page as a picture only.
- **DONKI moved on Sep 30, 2026:** `https://ccmc.gsfc.nasa.gov/DONKI-API/get/<type>`; the old api.nasa.gov address
  answers 404. No key and no repository secret are needed.

## The job

| | |
|---|---|
| Sources | NASA CCMC DONKI (`ccmc.gsfc.nasa.gov/DONKI-API/get/…`, at most 60 days a request) and NASA CCMC iSWA (`iswa.gsfc.nasa.gov/IswaSystemWebApp/hapi/`). No key. |
| Fetch script | `space-weather/fetch_space_weather.py` (ready since Nov 17, 2026; standard library only). Two parts, one step each: `latest` and `archive`. Each keeps its previous file when its source cannot be read, prints a line saying so ("not read, previous copy kept") and exits 1. |
| Output | `space-weather/data/latest.json` (about 60 KB) and `space-weather/data/archive.json` (about 20 KB) |
| Suggested schedule | `latest`: twice a day like the other daily jobs (the copy only has to be recent enough to stand in); `archive`: once a week, or as a monthly source with `every_days` |
| Suggested name | "Space weather data", `space-weather-data.yml`; sources `latest` ("Fallback copy", NASA and NOAA) and `archive` ("Record since 2010", NASA) |

To do for the Data updates chat:

1. The workflow, with one step per part (`continue-on-error: true` on each) and the `dev/datajob.py` step, as in
   `docs/DATA-UPDATES.md`.
2. The entry in `dev/data_jobs.json`, and the job in the tables of `docs/DATA-UPDATES.md`.
3. `space-weather/data/` in `paths-ignore` in `project-record.yml`.
4. The first run by hand. **The script has been run only against sample answers built from real readings, not
   against the live services** (the build environment cannot reach them). The first `archive` run builds the whole
   record from April 2010: about 70 DONKI requests for each of three types, one second apart (about 4 minutes); later
   runs redo only the last three months. Check on the first run how complete DONKI's earliest years are (its
   flare and CME lists may start later than 2010); if they are thin, the record's start can be moved in the script
   (`START`).

## Formats

`latest.json`, the page's own model (`space-weather/live.js` describes each field; times in milliseconds since 1970,
UTC):

```json
{
  "updated": "2026-11-18T03:00:00Z",
  "ev": { "flares": [{"t": 1794940740000, "cls": "M1.7", "flux": 1.7e-5, "region": 14578, "loc": "S08E35", "link": "…"}],
          "cmes": [{"t": 0, "speed": 816, "half": 22, "lon": 68, "lat": -10, "type": "C", "link": "…"}],
          "storms": [{"t": 0, "kp": 6, "link": "…"}], "seps": [], "runs": [{"done": 0, "arrival": 0, "hit": false,
          "glancing": true, "cme": 0, "kp": [2, 3], "link": "…"}] },
  "wind": { "speed": [[1794967500000, 358.4]], "dens": [[0, 7.4]], "bz": [[0, -6.2]], "bt": [[0, 9.0]] },
  "xray": [[0, 1.73e-5]],
  "kp": [{"t": 0, "kp": 2, "kind": "obs"}, {"t": 0, "kp": 3.33, "kind": "pred"}]
}
```

`archive.json`:

```json
{ "updated": "2026-11-18T03:00:00Z",
  "months": [{"m": "2010-04", "C": 0, "M": 0, "X": 0, "cmes": 0, "fast": 0, "storms": 0, "maxKp": 0}] }
```

Until the job exists the page works without both files: the "Since 2010" button stays hidden, and a failed live
source shows an error notice instead of the saved copy.
