# Spacecraft map

Where the active spacecraft are right now: crewed stations, telescopes, missions to the Sun, the Moon, Mars, Jupiter
and beyond, and satellites watching Earth. A utility of NASA and ESA Data Projects at `spacecraft/`, previewed on the
home page. Created by Malcolm Syme (mcsyme11@gmail.com), © 2026.

## Files

| File | What it is |
|---|---|
| `catalogue.json` | Every craft on the map, written by hand: name, agencies, kind, launch, description, timeline, links, and where its position comes from (`src`). Facts checked Nov 12, 2026. |
| `past.json` | Past missions (since Nov 14, 2026), written by hand: the same facts plus when and how each ended (`ended`, `end_word`, `end`), its route in Horizons (`route`) and where it rests now (`rest`: a planet or the Moon, a landing site on Mars, `"drift"` for craft still circling the Sun, or none). |
| `fetch_spacecraft.py` | The data job (workflow `spacecraft-data.yml`, twice a day): Horizons positions, CelesTrak orbital elements, past missions' routes, the link check. |
| `data/positions.json`, `data/tle.json`, `data/routes.json`, `data/links.json` | What the job writes. `tle.json` (since Nov 19, 2026): CelesTrak's OMM fields for each craft in Earth orbit, with its two-line set when the catalogue number has five digits. `routes.json`: each past mission's whole route (600 equal steps, worked out once and kept while its entry is unchanged) and, for drifting craft, their positions around today. |
| `spacemap.js` | The map: a subclass of the asteroid map's `SolarMap`, with the craft, their icons, groups and paths. |
| `app.js`, `index.html`, `spacecraft.css` | The page: views, filters, list, card, time, share links. |
| `preview.js` | The home page's preview. |

## Positions

Each craft is drawn at its parent's position plus its own position relative to that parent:

| Parent | Source | Samples |
|---|---|---|
| Sun | Horizons, `CENTER=500@10` | every 2–30 days (Parker Solar Probe every 6 hours) |
| Earth, near L1 and L2 | Horizons, `CENTER=500@399` | every 6 hours, 60 days back to 120 ahead |
| Earth orbit | CelesTrak elements, SGP4 in the browser (satellite.js) | any moment |
| Moon, Mars | Horizons, `CENTER=500@301` and `500@499` | every 5 minutes (rovers 30), about a day and a half |

Positions between samples follow a centripetal Catmull-Rom curve (as on the asteroid map). Satellite positions are
turned from Earth's equator to the ecliptic by the obliquity, 23.4393°.

## Groups and filters (since Nov 14, 2026)

- **Show:** active craft (on), past missions and the Earth-orbit fleet (craft marked `"fleet": true`: relay and
  weather satellites; off). **Mission:** big (`"size": "big"`: flagship-class missions and the crewed stations), small
  (`"size": "small"`: under about 500 kg at launch), satellites (everything worked out from CelesTrak's elements) and
  crewed (`"crewed": true`).
- **Replay its route:** a past mission's card draws its whole route from Horizons with a play bar (play and pause, a
  slider, 1 day to 1 year a second; about 40 seconds for the whole route at the speed chosen first). Every other craft
  is hidden during a replay; the planets and the Moon are drawn where they were on each date.

## Adding or removing a craft

1. Check the mission's status and facts on the agency's own pages.
2. Add or remove its entry in `catalogue.json` (`src`: a Horizons id, Horizons names to look up, or CelesTrak names).
   A mission that ends moves to `past.json` with how it ended, its Horizons route and where it rests.
3. Push: the "Spacecraft data" workflow runs and its log says whether the craft was found. A change to `past.json`
   alone is picked up by the next scheduled run.

Not endorsed by NASA, ESA or any other agency; no agency's logo is used.
