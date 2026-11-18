# Planetary Maps

Zoomable maps of the Moon and Mars from NASA's orbiters, with every landing site, the rovers' routes and the
best-known craters, volcanoes and valleys, and how the maps were made. A tool of the Orbit & Space Watch section of
NASA and ESA Data Projects, at `planet-maps/`. Created by Malcolm Syme (mcsyme11@gmail.com), © 2026.

Live since Nov 17, 2026. Built from the mock-up approved by the developer on Nov 17, 2026.

## Files

| File | What it is |
|---|---|
| `index.html` | The page: the Moon and Mars tabs, figures, the map with its controls, the place card, how the maps were made, sources |
| `app.js` | The four views (Map, Globe, North, South), the layers and close-ups, places, routes, search, the place card |
| `globe.js` | The Globe view (on `shared/globe.js`, three.js), loaded the first time it is chosen |
| `maps.css` | The inside of the map tool (layout beside the controls, the frame, the map's buttons, the key, the search list) |
| `places.json` | The 52 marked places (26 on each world), written by hand: name, kind, group, position, facts and a short explanation. Positions checked Nov 17, 2026 against NASA Trek's IAU feature names and landing-site areas |
| `fetch_routes.py` | The rovers' routes: reads NASA/JPL's "Where is the rover?" files and writes `data/routes.json` (daily data job) |
| `tools/build_names.py` | Every official feature name for the search box: writes `data/names-mars.json` and `data/names-moon.json` (built once, then quarterly) |
| `data/` | What the two data jobs write. The page works without these files: it shows a note for the routes and searches the marked places only |

## The maps

All tiles come from NASA's Solar System Treks (`trek.nasa.gov`), loaded by the visitor's browser; the layers, their
sharpness and credit lines are in `docs/DATA-SOURCES.md` ("Planetary Maps").

| | Moon | Mars |
|---|---|---|
| Photo | LRO Wide Angle Camera, 100 m a pixel | Viking orbiters' colour mosaic, 232 m |
| Height | LRO laser altimeter (LOLA), 237 m | MOLA, 463 m; "Sharper": MOLA with ESA Mars Express HRSC, 200 m |
| Close-ups, shown by themselves when zoomed in | Apollo 11, 12, 15, 16 and 17, about 0.5 m (LRO Narrow Angle Camera) | Jezero, 6 m (CTX) and 25 cm (HiRISE); Gale, about 6 m (CTX) |

- **Grid:** Trek's equirectangular grid (256-pixel tiles from −180°, 90°; level z is 2^(z+1) × 2^z tiles), set up with
  `FlatMap.worldGrid({ tileSize: 256, topRes: 180 / 256 })`. OpenLayers' zoom is one more than Trek's level.
- **Frame:** twice as wide as tall on computers and tablets, so the whole world shows; 380 px tall on phones, where
  the map pans sideways. The smallest zoom always fills the frame; resizing keeps the place and zoom.
- **Scale bar:** OpenLayers measures degrees on the Earth, so the page gives it each body's own size (Trek's spheres:
  Mars 3,396.19 km, the Moon 1,737.4 km). The bar is true north to south.
- **Views (added Nov 17, 2026):** Map (flat); Globe (`globe.js`: the body's picture from Trek level 2, then level 3
  where the graphics card allows, and `closeUp()` laying sharper Trek tiles over the part in view; the places and
  rovers drawn on a 2D layer above); North and South (polar stereographic on each body's sphere, out to 65°: the same
  Trek tiles reprojected by OpenLayers and proj4js in the browser, so no other source is used). Close-ups and the
  rovers' routes are shown on the flat map only; a place outside a pole view opens on the flat map.
- **The body and view are kept in the address** (`#mars`, `#moon`, `#moon-south`, `#mars-globe`, `#mars-north` …), so
  links can open any of them. A link may name a place instead (`#mars-gale`, `#mars-jezero`, `#moon-apollo11`: the
  place's `id` in `places.json`); the flat map opens on it with its card.

## States

| Situation | What the page shows |
|---|---|
| `data/routes.json` missing | The rover figures say "the daily copy is not available yet"; a note under the map; no route key |
| `data/names-*.json` missing | The search box finds the marked places and coordinates only |
| trek.nasa.gov out of reach | An error note under the map; the places are still drawn |
| WebGL not available (Globe view) | A note that the globe needs WebGL; the map views still work |
| `places.json` cannot be read | "The list of places could not be loaded" with Try again |

## Data jobs

Built by the Data updates chat from the hand-off of Nov 17, 2026 (`docs/handoffs/2026-11-17 - planetary maps - data
jobs.md`): the rovers' routes daily (decided Nov 17, 2026), the place names once and then quarterly with Place and map
lists. Both scripts run with the standard library only and have a `--test` mode that uses sample data.

## Rules for reading a map's sharpness

The page teaches these four rules ("How these maps were made"):

1. One degree of longitude at the equator = 2π × radius ÷ 360 (Moon 30.3 km, Mars 59.3 km).
2. Given in pixels per degree: metres per pixel = one degree in metres ÷ pixels per degree.
3. Given in metres per pixel: the smallest thing visible is about 3 pixels across.
4. Away from the equator, a degree of longitude is shorter by the cosine of the latitude.
