# Orbit Watch

Part of **Orbit & Space Watch** in the NASA and ESA Data Projects (NEDAP). Satellites and space junk around the Earth:
where they are, how one crash becomes a cloud of debris, and how orbit could be cleaned up. Live since Nov 17, 2026.

© 2026 Malcolm Syme · mcsyme11@gmail.com

## Pages

| Page | File | What it shows |
|---|---|---|
| Orbit Watch | `index.html` | NASA's and ESA's headline figures (from `facts.json`), why their totals differ, the three tools, the sources |
| What's in orbit | `tracker.html` | Laid out like the Asteroid Tracker's solar system map (since Nov 18, 2026): a globe (`shared/globe.js`) in a map card with every object in `data/objects.json` moving in real time, by kind; the time and a search box over it; a tooltip with the name and height of the dot under the pointer; zoom and full-screen buttons; rows of controls (view, distance, time and speed, kinds shown, well-known satellites, Share this view); beside it the Selected card (live height and speed, orbit, owner, launch date, Follow it) and the legend; below, every catalogued object by height (`data/heights.json`) |
| Close calls and collisions | `collisions.html` | The closest predicted passes of the next seven days (`data/close.json`), each replayable on the globe; a collision calculator on NASA's breakup model; a teaching model of the Kessler syndrome; the biggest breakups so far |
| Cleaning up | `cleanup.html` | How long junk stays up at each height, the ways it can be removed, the real missions, why it matters |

## Files

| File | Role |
|---|---|
| `fetch_orbits.py` | Reads CelesTrak and writes `data/objects.json`, `data/heights.json` and `data/close.json` (standard library only). Run by the data job; by hand: `python3 orbit-watch/fetch_orbits.py` |
| `facts.json` | Figures copied by hand from NASA's Orbital Debris Quarterly News and ESA's Space Debris Office, each with its source and date; reviewed when they publish new figures |
| `common.js` | Loading files, number and date formats, the names and colours of the kinds |
| `tracker.js`, `propagate.js` | The globe; positions are worked out by SGP4 (satellite.js) in a background worker a few times a second, and each dot moves along its velocity in between |
| `collisions.js`, `home.js` | The collisions page and the home page |
| `orbit.css` | The inside of the tools only (the globe's frame, the keys, the charts, the calculator) |

## How the globe works

- **Frame.** Positions from SGP4 are Earth-centred (TEME, km). In the scene, `(x, y, z)` becomes `(x, z, −y) ÷ 6,371`,
  the rule of `shared/globe.js` (x towards right ascension 0, y north); the Earth is turned by Greenwich mean sidereal
  time for the time shown, and its night side follows the Sun.
- **Speed.** The worker answers with every position and velocity for one moment; until the next answer the page moves
  each dot round a circle through that position, with that velocity, at the angular rate of a circular orbit of that
  radius: p = cos(wΔt)·p₀ + sin(wΔt)/w·v₀, w = √(μ/r³). For near-circular orbits this stays within a few kilometres of
  SGP4 for several minutes, even at an hour a second. Positions more than 30 minutes from the last answer are not
  drawn (after a jump in time).
- **Pointing and tapping.** The dot nearest the pointer (within 10 px; 18 px for a finger), not behind the Earth, is
  found by projecting every shown dot; the tooltip (mouse only) is the shared `.tip`.
- **Labels.** The International Space Station, Tiangong and Hubble are always labelled; eight well-known satellites
  have a button each under the globe, with a short description in the Selected card.
- **Shared links.** `tracker.html?view=1&sel=<catalogue number>&t=<ISO time>&cam=<x,y,z>&spd=<speed>` (written by
  Share this view, with `asteroid-tracker/share.js`).
- **Hidden dots** (a kind switched off, a failed model) are placed at the Earth's centre, where the Earth hides them.
- **Replay of a close approach:** `tracker.html?pass=<catalogue number>,<catalogue number>&t=<ms>` selects both,
  draws both orbits and starts five minutes before the closest moment at ×10, with the live distance between them.

## Rules the collision calculator follows (NASA standard breakup model)

1. **How hard the hit is:** ε = m_small × v² ÷ (2 × m_big), in J/kg with v in m/s.
2. **Which mass breaks up:** ε > 40 J/g, catastrophic, M = m_big + m_small; otherwise M = m_small × v² with v in km/s.
3. **How many pieces:** N(> L) = 0.1 × M^0.75 × L^−1.71, L in metres (0.1 for 10 cm, 0.01 for 1 cm).

Example: Iridium 33 (560 kg) and Cosmos 2251 (about 900 kg) at 11.7 km/s: ε ≈ 42,600 J/g, catastrophic, M = 1,460 kg,
about 1,200 pieces over 10 cm; 2,372 were catalogued.

## Teaching model of the Kessler syndrome

One band of height, whole objects B and debris D, year by year: collisions C = 8 × 10⁻⁹ × B × (B + D);
B grows by the launches and shrinks by the removals, by B ÷ τ (the air) and by C; D grows by 800 × C and shrinks by
D ÷ τ. τ is 2 years at 400 km, 12 at 550 km and 150 at 800 km. It shows the shape of the problem, not a forecast.

## Data and limits

- Sources, addresses, formats and terms: `docs/DATA-SOURCES.md`, "Orbit Watch".
- CelesTrak publishes orbital elements in groups, not for every object at once, so the globe shows the working
  satellites and the three debris clouds published as groups (Fengyun-1C, Cosmos 2251, Iridium 33); every object in
  the catalogue is counted in the heights chart.
- The data job is run by the Data updates chat (`docs/DATA-UPDATES.md`); until its first run the pages show their
  "not copied yet" states, and the calculator, the model and the explainer work without it.
- Visitors' browsers read only this site's files, apart from NASA GIBS for the Earth's picture.
