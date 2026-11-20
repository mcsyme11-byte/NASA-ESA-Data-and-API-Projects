<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff: Orbit & Space Watch (Nov 17, 2026)

For the four new chats (Orbit Watch, Space Weather, Exoplanets, Planetary Maps), the Asteroid Tracker, Image Explorer and
Data updates chats, and the general chat.

## Live since Nov 17, 2026 (read first)

The site-map footer, the menu with Space Watch, the section page `space-watch/` and the home page's section are live.
For every new page, in the same change as the page:

- Copy the head, top bar, menu (Home, Asteroids, Mars, Images, Space Watch) and footer from any existing page. The
  footer in the page's HTML is only the copyright line and the credit line; `shared/footer.js` builds the site map
  around them. Never add links, a logo or anything else to a footer.
- List the page in `SECTIONS` in `shared/footer.js`: one line in its section. A tool's line already exists with
  `{ soon: true }`; remove that when the tool is published. Add the page's name to `NAMES` (the Back button).
- When a tool is published, its card on `space-watch/` becomes a link ("Open") and its home-page card shows its
  agencies instead of "Coming soon".

## Confirmed answers (Nov 17, 2026)

1. **Folders:** `orbit-watch/`, `space-weather/`, `exoplanets/`, `planet-maps/`; the section page `space-watch/` (general
   chat); the mining view `asteroid-tracker/mining.html` (Asteroid Tracker chat). Each tool's data in its own `data/`.
2. **Planetary Maps** is its own folder, not part of Image Explorer.
3. **CelesTrak** is approved for Orbit Watch (orbits of every tracked object).
4. **NOAA's Space Weather Prediction Center** is approved for Space Weather (live storm level, forecast, aurora map).
5. **The US Geological Survey's IAU place names** are approved for the Moon and Mars maps, where Trek's own layers do
   not cover them.
6. **MAST** (STScI, run for NASA) counts as a NASA source for the exoplanet light curves.
7. **The menu** gains "Space Watch"; every label stays on one line at every width (the Home link is hidden below
   761 px, where the mark goes home; the site's name shows from 881 px).
8. **Not used:** ESA DISCOS and ESA's Space Weather Service Network (both need an account); any price or "worth" of
   asteroids (no agency publishes one).

Any other source that is not NASA or ESA still needs the developer's decision first.

## Before starting (every chat)

Read `CLAUDE.md`, `docs/PROJECT-NOTES.md`, `docs/ROADMAP.md` (section 5, and section 1 for the mining view),
`docs/DATA-SOURCES.md`, `docs/DESIGN.md` and `docs/DATA-UPDATES.md`. Pull before every change; never force-push.
Confirm each source against the agency's current documentation and record it in `docs/DATA-SOURCES.md` before
building on it. A mock-up comes first, approved by the developer. Pages use only the shared components
(`shared/theme.css`, shown on `design/`); a new component goes on the component page first. Credits (`CREDITS.md`,
the Credits page) in the same change; the Privacy page first for any service a visitor's browser contacts. Scheduled
data jobs are built only by the Data updates chat: send it a hand-off.

## Built once, used by everyone

| Already on the site | Who uses it |
|---|---|
| Satellite positions, `shared/sats.js` (satellite.js, SGP4) | The spacecraft map, Sky Finder, Orbit Watch |
| One CelesTrak download (the Spacecraft data job) | The spacecraft map and Orbit Watch; CelesTrak is never asked twice |
| Sky Finder and `shared/passes.js` | Orbit Watch's "Can I see it tonight?" opens Sky Finder; no second pass predictor |
| Image Explorer's map (OpenLayers, equirectangular tiles) and three.js globe, moved to `shared/` | Image Explorer, Planetary Maps (Moon, Mars), Orbit Watch (Earth) |
| The saved place, `shared/place.js` | Space Weather's aurora chance, Sky Finder, "Visible from here" |
| Sky positions, `shared/sky.js`, and the star list | Exoplanets (where each host star is) |
| The Asteroid Tracker's orbits, sizes (`compare.js`) and asteroid pages | The mining view |
| The footer, Back names, live data status (`shared/footer.js`) | Every new page; the general chat adds each new page |

The spacecraft map stays the place for missions; Orbit Watch is the population around the Earth (debris, rocket
bodies, old satellites). Each links to the other.

## Per chat

- **Image Explorer:** first, move the map set-up and the globe into `shared/`, unchanged in behaviour, checked at every
  width; then add a "Moon and Mars maps" link on the globe once Planetary Maps is live.
- **Orbit Watch:** globe of every tracked object, collision simulator, cleanup explainer (roadmap 5a). Waits for the
  shared globe.
- **Space Weather:** read DONKI, SDO/SOHO and NOAA live in the browser where they allow it; a scheduled job only as a
  fallback copy (GitHub starts scheduled runs hours late; see roadmap section 4). Confirm DONKI's current address.
- **Exoplanets:** methods with real measurements, then every confirmed planet (roadmap 5c).
- **Planetary Maps:** Moon and Mars from Trek, with names, landing sites and rover routes (roadmap 5d). Waits for the
  shared map and globe.
- **Asteroid Tracker:** the mining view (roadmap section 1).
- **Data updates:** expect hand-offs for: the Spacecraft data job extended to the whole CelesTrak catalogue (into
  `orbit-watch/data/`); a new weekly Exoplanets job; the rovers' routes added to the Mars data job; the planetary place
  names (built once, then quarterly with Place and map lists); NHATS added monthly to the Asteroid data job; possibly a
  Space Weather fallback copy. Each new data folder goes into `paths-ignore` in `project-record.yml`.
- **General chat:** done Nov 17, 2026: the site-map footer, the menu, the home page section, the section page
  `space-watch/` and the card illustrations.
