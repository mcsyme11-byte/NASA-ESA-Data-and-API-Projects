# Space Weather

Part of **Orbit & Space Watch** in the NASA and ESA Data Projects (NEDAP). A dashboard of what the Sun is doing now
and over the last weeks: flares, coronal mass ejections (CMEs), the solar wind and geomagnetic storms, the chance of
seeing the aurora from the visitor's place, and who feels space weather. Published Nov 17, 2026.

© 2026 Malcolm Syme · mcsyme11@gmail.com

## What the page shows

| Section | Data | Freshness |
|---|---|---|
| Right now | Solar wind speed, density and Bz (NASA IMAP), Kp (GFZ), the strongest flare in 24 hours (NOAA GOES X-rays) | Every 5 minutes while the page is open |
| The Sun today | SDO pictures in five wavelengths (NASA); the SOHO LASCO C2 and C3 coronagraphs (ESA and NASA) | The newest picture, fetched again every 15 minutes |
| The last 7, 30 or 60 days | Flares, CMEs, model runs and storms (NASA DONKI); "Since 2010" from `data/archive.json`, with the years DONKI lists incompletely marked (M-class before 2014) | Every 10 minutes |
| Heading for Earth | NASA's WSA–ENLIL model runs that expect a CME at Earth; NOAA's Kp forecast; particle events | Every 10 minutes |
| Solar wind | Speed and Bz over 24 hours, 10-minute means (NASA IMAP) | Every 5 minutes |
| Around Earth | Kp for the last 7 days (GFZ) and NOAA's forecast for the next days | Every 15 minutes |
| Aurora | The Kp the visitor's place needs, tonight's Kp, darkness and the Moon; NOAA's OVATION aurora map | With the Kp; the map every 15 minutes |
| Who feels it, five rules | Written text, with facts checked against NASA, NOAA and published sources on Nov 17, 2026 | |

## How it works

Everything is read live in the visitor's browser, from sources that need no key and allow web pages to read them
(checked Nov 17, 2026; details in `docs/DATA-SOURCES.md`, "Space Weather"):

- NASA's DONKI and iSWA through `shared/nasa.js` (`nasaOpenGet`, answers kept for a few minutes in the tab);
- the SDO, SOHO and NOAA pictures as plain images, which need no permission from their servers.

When NASA's services cannot be reached, the page uses the saved copy in `data/latest.json` for the part that failed
and says so; if there is no saved copy either, the section says the data could not be loaded. The saved copy and the
monthly record are written by `fetch_space_weather.py`, run by the Space Weather data job (built by the Data updates
chat, as every scheduled job is; see `docs/handoffs/2026-11-17 - data updates - Space Weather data.md`).

| File | What it does |
|---|---|
| `index.html` | The page, built only from the shared components (the level scale was added to the theme for it) |
| `app.js` | Loads the data, keeps it fresh and draws each section; the written rules for the words beside each reading |
| `live.js` | Reads DONKI and iSWA, and the saved copy; one model shape for both |
| `charts.js` | The timeline, the 24-hour lines, the Kp bars and the monthly record, drawn as SVG at the frame's width |
| `aurora.js` | Geomagnetic latitude, the Kp a place needs, darkness and the Moon |
| `spaceweather.css` | Only the inside of the tool: the frames of the pictures |
| `fetch_space_weather.py` | `latest` (the saved copy) and `archive` (the record since 2010), standard library only |

## The rules the page uses

1. **Flare class:** the letter is a power of ten (A 10⁻⁸ to X 10⁻⁴ W/m²) and the number a multiplier; the class is
   cut, not rounded (1.73 × 10⁻⁵ W/m² is M1.7). NOAA's radio blackout levels: R1 from M1, R2 from M5, R3 from X1,
   R4 from X10, R5 from X20.
2. **Kp:** 0 to 3 quiet, 4 active, 5 and up a storm (NOAA's G1 at 5 to G5 at 9). Thirds are shown as 2−, 2, 2+.
3. **Aurora (NOAA, "Tips on viewing the aurora"):** the aurora's edge lies at about 66° − 2° × Kp geomagnetic
   latitude; it can be seen low toward the pole from 4° further (NOAA gives 4 to 5°). A place at geomagnetic latitude
   m needs Kp ≥ (62 − m) ÷ 2 for the horizon and Kp ≥ (66 − m) ÷ 2 overhead, rounded up to the next third. Geomagnetic
   latitude uses the dipole pole of the World Magnetic Model 2025 (80.85° N, 72.76° W). "Tonight" is the highest Kp,
   measured or forecast, in the next dark hours (the Sun 12° or more below the horizon).
4. **Words for the solar wind:** speed under 400 km/s slow, 400 to 500 typical, 500 to 800 fast, above 800 very fast;
   density above 20 per cm³ dense; Bz −10 nT or below "far south", below −2 "south", above 2 "north".
5. **The headline:** a storm (Kp 5 or more) first, then flares of M5 or more, then Bz −10 nT or below; otherwise
   "Quiet" (or "Unsettled" at Kp 4), with the fast wind or a southward field added.

## Credits

NASA/SDO and the AIA, EVE, and HMI science teams. SOHO (ESA & NASA), LASCO consortium; SOHO is a project of
international cooperation between ESA and NASA. NASA Community Coordinated Modeling Center: DONKI (Moon to Mars Space
Weather Analysis Office) and iSWA. NASA IMAP I-ALiRT (IMAP Principal Investigator Prof. David J. McComas, Princeton
University). Kp: GFZ Helmholtz Centre for Geosciences, CC BY 4.0. NOAA Space Weather Prediction Center (GOES X-rays,
the Kp forecast, the OVATION aurora map), public domain. DONKI is preliminary NASA research information; NOAA's Space
Weather Prediction Center is the official U.S. source of space weather forecasts. Not endorsed by NASA, ESA or NOAA.
