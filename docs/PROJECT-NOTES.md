# Project notes

How NASA and ESA Data Projects is built, the decisions made so far, and how to run and publish it.

## Decisions

- **Decided Nov 18, 2026 (reload buttons, tab bars, checks):** a shared reload button (`shared/reload.js`,
  `docs/DESIGN.md` "Reload buttons"; mock-up approved that day): one in the page head beside the "Readings to …" line
  reloads all of a page's data without reloading the page, a smaller one in a panel's header reloads that panel; an
  icon with a screen-reader label, spinning and disabled while loading, then "Updated hh:mm" (the visitor's clock) or
  "Couldn't reload, try again"; clicks within 30 seconds of a reload are ignored (10 after a failure). Space Weather
  has them first; each project chat adds them to its own pages. The same day every multi-page project got a tab bar
  on every page (Overview first; the Asteroid Tracker's and Image Explorer's overviews, Mars Data and Orbit Watch had
  none, or lacked Overview), the kickers one form (DESIGN.md, "Page head"), and the footer's layout now follows its
  own width (Sky Finder's narrow page squeezed five columns). The review found how the project-wide documents had
  fallen behind: the Project Record's cover, front page and the README still named three projects a day after Orbit &
  Space Watch went live (each listed the projects by hand), and the roadmap had lost its "3. Mars Data" heading and
  left an orphan line when chats removed finished items. Fixes: the record's cover now reads the projects from
  `SECTIONS` in `shared/footer.js`; `dev/check_docs.py` (run after every push) checks the README, the record's front
  page and the roadmap's shape; `dev/check_styles.py` checks every version tag and the tab bars.

- **Decided Nov 17, 2026 (Orbit Watch, live):** `orbit-watch/` approved from a plan and mock-ups and built the same
  day: a home page, **What's in orbit** (the shared globe with every object CelesTrak publishes elements for, moving in
  real time by SGP4 in a background worker, and every catalogued object by height), **Close calls and collisions**
  (SOCRATES Plus close approaches, each replayable on the globe; a calculator on NASA's standard breakup model, as
  three written rules; a teaching model of the Kessler syndrome; past breakups) and **Cleaning up** (lifetimes by
  height, methods, missions). Elements are read as CSV (OMM), not two-line sets, because objects catalogued since
  Jul 11, 2026 have six-digit numbers. CelesTrak has no single elements file for every object, so the globe shows the
  working satellites and the three debris clouds it publishes as groups, and the heights chart counts everything in
  its satellite catalogue. NASA's and ESA's headline figures are copied by hand into `orbit-watch/facts.json` with
  their dates; ESA's charts are not copied. Mega-constellations are shown, with a switch to hide them (the spacecraft
  map leaves them out). The data job is handed to the Data updates chat.
- **Decided Nov 17, 2026 (Planetary Maps):** live at `planet-maps/`, its own folder, built from the approved mock-up on
  `shared/flatmap.js`: the Moon and Mars from NASA's Solar System Treks tiles, loaded by the visitor's browser
  (trek.nasa.gov, on the Privacy page). Layers made by the US Geological Survey from NASA mission data and served by
  Trek (the Viking mosaic, the Jezero mosaics) and the IAU names it keeps are used; the 5 m CTX mosaic of all of Mars
  (credited to Caltech and Esri) is not. The rovers' routes are copied daily by a data job; the place names once, then
  quarterly. The places marked on the map are written by hand (`planet-maps/places.json`). Added the same evening: a
  Globe view (`shared/globe.js`) and North and South views reprojected in the browser from the same tiles; the Artemis
  landing regions are left off until NASA publishes a current list.
- **Decided Nov 17, 2026 (site-map footer and menu):** every page's footer is a site map, built by `shared/footer.js`
  from one list: the NEDAP mark and name with the live data status; a column for each part of the site (Asteroid
  Tracker, Image Explorer, Mars Data, Space Watch, More) listing its pages, with the current page marked; the
  copyright with the legal links opposite; the credit line. It replaces the one-row footer of Nov 12, 2026. On phones
  each section folds. A page is listed by adding a line to `SECTIONS`; pages not live yet are kept out with
  `soon: true`. The menu gained Space Watch; every label stays on one line at every width. The section page
  `space-watch/` and the home page's "Orbit & Space Watch" section are live, the four tools marked "In preparation"
  until each is published. Approved from mock-ups the same day.
- **Decided Nov 17, 2026 (the mining view, "Within reach"):** `asteroid-tracker/mining.html`, a tab in the tracker,
  and a section on every asteroid page, approved from a mock-up. Round trips from NASA/JPL's NHATS study and spectral
  types, spin and albedo from the Small-Body Database, both copied monthly into data files (`fetch_reach.py`); the
  verdict follows four written rules (`reach.js`) and always says mining is not realistic today. Mission facts come
  from NASA and ESA only; Hayabusa2's from NASA's reports rather than JAXA's site. No price or "worth" figures.
- **Decided Nov 17, 2026 (Space Weather):** the page (`space-weather/`) reads everything live in the visitor's
  browser: NASA's DONKI at its new address (`ccmc.gsfc.nasa.gov/DONKI-API/get/`, no key) and NASA CCMC's iSWA (IMAP
  solar wind, GOES X-rays, GFZ Kp, NOAA's Kp forecast), through `shared/nasa.js` (`nasaOpenGet`), and the SDO, SOHO
  and NOAA aurora pictures as plain images. A data job keeps only a fallback copy and the monthly record since 2010.
  Approved beyond NASA and ESA: GFZ's Kp (CC BY 4.0) and NOAA's GOES X-rays and Kp forecast, besides NOAA SWPC
  itself. ESA appears through SOHO (ESA and NASA). The aurora chance follows NOAA's rule (66° − 2° × Kp geomagnetic
  latitude, seen from 4° further), with the World Magnetic Model 2025 pole. New shared component: the level scale.
  Built from the approved mock-up; the SOHO "Last 24 hours" button of the mock-up was left out (not checked yet).
- **Decided Nov 17, 2026 (Exoplanets):** Exoplanets went live from the approved mock-up (`exoplanets/README.md`).
  The habitable zone is given under two rules: NASA's (the NASA Exoplanet Exploration Program's conservative zone for
  the Habitable Worlds Observatory target list, 0.95 to 1.67 au for a Sun-like star, scaled by √L) as the main rule,
  and Kopparapu et al. (2013, 2014) for the star's temperature beside it. ESA's CHEOPS counts as an ESA source (its
  archive is run for ESA by the CHEOPS Science Operations Centre, University of Geneva); Gaia's CC BY-NC 3.0 IGO licence
  is accepted and stated on the Terms page. The archives send no CORS headers, so all the data is copied to the site
  on GitHub's servers (hand-run workflow `exoplanets-build.yml`; the weekly job is the Data updates chat's).
- **Decided Nov 17, 2026 (Orbit & Space Watch):** a new section of the site, planned in the developer's portfolio
  project: **Orbit Watch** (satellite and space-debris tracker, collision simulator, cleanup explainer, `orbit-watch/`),
  **Space Weather** (`space-weather/`), **Exoplanets** (`exoplanets/`) and **Planetary Maps** (`planet-maps/`), each
  built by its own chat, plus an asteroid mining view in the Asteroid Tracker (`asteroid-tracker/mining.html`). Flat
  folders like `sky-finder/` and `spacecraft/`; a section page at `space-watch/` (general chat); the menu gains
  "Space Watch" (the Home link is hidden on phones, where the mark goes home). Planetary Maps is its own folder, not
  part of Image Explorer; Image Explorer's map and globe move into `shared/` first so they are built once. Sources
  approved beyond NASA and ESA: **CelesTrak** (orbits of every tracked object, already used by the spacecraft map),
  **NOAA's Space Weather Prediction Center** (live storm level, forecast, aurora map) and the **US Geological Survey's**
  IAU place names for the Moon and Mars where NASA's Trek layers do not cover them; **MAST** (run by STScI for NASA)
  counts as a NASA source. Not used: ESA DISCOS and ESA's Space Weather Service Network (both need an account), and
  any price or "worth" of asteroids. Built once and shared: satellite positions (`shared/sats.js`) and one CelesTrak
  download for the spacecraft map and Orbit Watch; Sky Finder for passes; the saved place; the sky positions. The
  roadmap has a section for each piece (section 5).
- **Decided Nov 17, 2026 (logo):** the NEDAP mission patch (`brand/patch/`) is the project's logo everywhere,
  replacing the planet-and-ring emblem: the patch at 64 px and larger, a mark without lettering at about 32 to 64 px
  and a small mark at 16 to 24 px (`docs/DESIGN.md`, "Logo and icons"). The ring reads "NEDAP · DATA PROJECTS" (no
  agency names in the logo) and the centre symbol is original artwork; the lettering is outlines. The NEDAP name and
  patch are the developer's marks, excluded from the MIT License; no ™ or ® sign until a trademark search ("Nedap" is
  already a company name) and legal advice.
- **Decided Nov 14, 2026 (short name and app icon):** the project's short name is **NEDAP** (NASA and ESA Data and
  API Projects), used wherever the full name does not fit. The site has its own home-screen icon: the site's emblem
  in brass on the night-sky tile Sky Finder's icon uses (`shared/icons/`). Every page outside Sky Finder links it
  with `site.webmanifest` (name, short name NEDAP, icons; display "minimal-ui", so on an iPhone the icon opens the
  site in Safari as before) and `<meta name="apple-mobile-web-app-title" content="NEDAP">`; `dev/check_styles.py`
  refuses a page without them. Sky Finder keeps its own icon and manifest.
- **Decided Nov 14, 2026 (live data status):** the site shows the state of its automatic data updates to every
  visitor: a live line at the foot of every footer (a status light and one sentence: up to date, updating now, late,
  partly failed or failed), and a page, How the data is collected (`data-collection/`), with a live status board,
  the day's schedule in the visitor's time zone, what each job collects and the safeguards. Worked out in the browser
  (`shared/datastatus.js`) from `dev/data_jobs.json`, the status files and GitHub's public run list (api.github.com,
  no key, kept 3 minutes in the tab; added to the Privacy and Credits pages first). New shared components: status
  light, footer live line, status board, source state and run bars. The developer asked for it without a mock-up
  ("no mock up but make it really nice, modern and cool").
- **Decided Nov 14, 2026 (data updates):** automatic data updates for the whole project are looked after in one
  place, the "Data updates" chat, by the rules in [DATA-UPDATES.md](DATA-UPDATES.md). Every data job follows one
  standard: a second daily run for daily data, a step per source, the previous good copy kept when a source fails,
  and a last step (`dev/datajob.py`) that checks each changed file before it is saved, records each source's state in
  `shared/data/status/` and commits with a standard message. A daily Data health job (`dev/data_health.py`) reports
  stopped, late or failing jobs, failing sources, new "not found" notes, broken catalogue links and due reviews in one
  GitHub issue, emailed when its list changes; it replaces watching the run logs by hand. The astronaut-photo job
  gained a second daily run; the GeoNames and Natural Earth lists are rebuilt four times a year (before, by hand
  only); the Mars job's own failure issue gave way to the health check. Project chats keep their page code, scripts
  and sources.
- **Decided Nov 12, 2026 (Asteroid Tracker home page):** the project's address opens a home page in the same layout as
  the Mars Data and Image Explorer home pages (mission, headline numbers, a card for each part, the data and its
  agencies, what you can do, how to use it); the tracker itself is `asteroid-tracker/tracker.html`, and old links
  with a tab or a shared view are forwarded to it.
- **Decided Nov 12, 2026 (Sky Finder):** an installable phone web app in its own folder, `sky-finder/`, on the same
  site (not a separate repository). It marks where an asteroid is with a marker and its path: most passing asteroids
  are far too faint for a phone camera, so the asteroid itself is not shown. The Moon, planets, bright stars and the
  space stations are drawn to check the aim, and calibration on one of them removes compass error and magnetic
  declination together. Camera, location and motion readings stay on the device; a safety notice (never the Sun, look
  where you walk) is shown before first use and the Terms say the same.
- **Decided Nov 12, 2026 (spacecraft map):** a utility, not a fourth project, at `spacecraft/`, replacing the
  asteroid map on the home page's large panel (the asteroid map is a link under it). It shows every active craft with
  a public position that the hand-checked catalogue lists; military craft only where CelesTrak publishes the orbit;
  no communication or navigation constellations (Starlink, GPS). Each craft is drawn relative to its parent (the
  Sun, Earth, the Moon or Mars), so orbiters stay on their planets at any zoom. Ended missions come off the list.
- **Decided Nov 14, 2026 (spacecraft map, more craft):** as many craft as possible, to be easier to use than NASA's
  own trackers. Ended missions move to `spacecraft/past.json`: drawn in grey where they rest, with how each ended and
  a replay of its route from Horizons. A switch adds the Earth-orbit fleet (relay and weather satellites). Mission
  chips: big (flagship-class and crewed stations), small (under about 500 kg at launch), satellites, crewed. Built
  from the approved mock-up of Nov 14, 2026.
- **Decided Nov 12, 2026 ("Visible from here"):** a pass counts as visible when the asteroid is at least 10° up while
  the Sun is at least 12° below the horizon; what is needed follows magnitude (naked eye ≤ 6, binoculars 6–9, small
  telescope 9–12, large telescope 12–15, too faint above 15). The place is kept in the browser and shared with Sky
  Finder (same storage key).
- **Decided Nov 11, 2026:** the project has a **Project Record**, `docs/NASA and ESA Data Projects - Project Record.pdf`:
  the whole project as one PDF (front matter, roadmap, history, change log, each project, data sources, design,
  decisions and working rules, the site's pages, licence and credits, repository history, glossary), built from the
  repository by `docs/record/` in the same way as the Flight Deck Suite's and Hot Mic's. GitHub rebuilds it after every
  push to main and commits it; chats never build it themselves. Pushes that change only data files (the daily data
  updates, in the `data/` folders) don't start a rebuild, since none of those files are in the record; the Repository
  History counts them instead of listing them. The record is public, like the repository; its build stops if a
  personal detail would end up in it.
- **Decided Nov 12, 2026 (Mars Data):** cleaning rules 1.2 add rule 11, which removes single-hour air-temperature
  glitches (a one-minute median more than 25 K beyond both neighbouring hours, applied only when both neighbours have
  data). It replaces the 26 sols set aside by hand under rule 10. The whole record was processed again and the
  result checked sol by sol; a first version that compared with only one neighbour was corrected (sol 1418).
- **Decided Nov 12, 2026 (Mars Data):** the "Mars data" job runs on main on Mondays and Thursdays at 09:23 UTC,
  publishes only after `validate.py` passes, and reports new data or a failure by opening a GitHub issue, which GitHub
  emails to people watching the repository.
- **Decided Nov 18, 2026 (Mars Data):** Perseverance appears wherever its cleaned data (pressure, humidity, height)
  fits: pressure and night-time humidity in "Two craters", height in "The rovers' climbs"; it has no temperature or
  ultraviolet in this project. A night-humidity chart uses only sols whose highest humidity came between 20:00 and
  08:00 local time. "The 2018 dust storm" sets Mars Year 34 against Curiosity's other Mars Years at the same season.
  Built without a mock-up at the developer's request ("realistic and professional"), for review afterwards.
- **Decided Nov 17, 2026 (Mars Data):** the charts page opens with "What the record shows", a short plain-English
  write-up of the clearest patterns, each paragraph linked to its chart. Its figures are worked out from the published
  data and rounded so they stay true as sols are added; they are checked again when the cleaning rules change.
- **Decided Nov 15, 2026 (Mars Data):** the "Above the surface" section (ESA Mars Express profiles: temperature and
  pressure with height, and where and when each was taken) was approved as a mock-up with sample numbers and built
  into the charts page behind a switch (`MEX_LIVE`), turned on only after the first real profiles are read and checked.
  NASA's PDS Geosciences copy of the profiles was checked and is not used; ESA's archive stays the source.
- **Decided Nov 12, 2026 (Mars Data):** the project folder opens on a home page (mission, data, how to use it, a card
  for each part); the charts are at `mars-data/charts/` with a section menu, and the cleaning rules are explained
  with examples at `mars-data/method/`. Approved by the developer.
- **Decided Nov 12, 2026 (Mars Data):** the developer approved the "Two craters" chart: daily average pressure at
  Gale (Curiosity, solid lines) and Jezero (Perseverance, dashed), one colour per Mars Year, for the years both rovers
  measured.
- **Decided Nov 11, 2026 (Mars Data):** the developer approved the charts page mock-up (`mars-data/mockup.html`):
  pressure through the year with a correction for the rover's climb, daily pressure range, humidity at night
  (preliminary), midday UV, season × time of day, one sol hour by hour, daily highs and lows, and the rover's climb.
- **Decided Nov 11, 2026 (Mars Data):** the whole Curiosity record (sol 1 to the newest released sol) is used from
  the start, not a single Mars year. It is downloaded and cleaned in chunks (a range of sols at a time), each chunk
  checked and its cleaning results recorded before the next is processed: rows kept and removed, the reason for each
  removal, and the gaps found. Cleaning is done slowly and carefully; correctness comes before speed.
- **Decided Nov 11, 2026 (whole site):** the projects are numbered in build order: Project 1 Asteroid Tracker,
  Project 2 Image Explorer, Project 3 Mars Data (Mars was previously labelled Project 2). The home page lists them in
  that order.
- **Decided Nov 11, 2026 (Mars Data):** the project follows a fixed set of three missions and updates itself as new
  data is published: NASA's Curiosity (REMS, Gale Crater) and Perseverance (MEDA, Jezero Crater), and ESA's Mars
  Express (MaRS temperature and pressure profiles, CC BY-NC 3.0 IGO). InSight is not followed (the mission ended in
  2022). Mission data reaches the public archives in batches, months after it is measured, so "up to date" means each
  new batch is picked up soon after release, not live readings. A GitHub Actions job checks the archives twice a
  week to start (weekly once stable), downloads only new or replaced files, processes them with the same code as the
  rest, and commits the summaries only if every check passes; otherwise the previous summaries stay. New data and
  failed runs open a GitHub issue, which reaches the developer by email. Raw downloads are never committed.
- **Decided Nov 10, 2026:** the repository stays a single public repository (no separate private copy: only the
  developer and the chats he works with can push; others can only fork, comment or propose changes, which need his
  approval). `main` is protected by a branch ruleset, "Protect main": deletion of `main` and force pushes to it are
  blocked; ordinary pushes from the chats and the daily data jobs are unaffected. History on `main` is therefore never
  rewritten: a mistake is undone with a new commit (`git revert`), not by force-pushing over it.
- **Decided Nov 9, 2026:** ESA (the European Space Agency) data is added **alongside** NASA's across the projects;
  NASA stays the main source, and ESA is added where it helps. Each project's chat changes its own project; the
  project-wide files (name, CLAUDE.md, credits, terms, footers) are changed in the general chat. The rules for ESA
  sources are in CLAUDE.md: check against ESA's documentation first, record in DATA-SOURCES, show ESA's credit wherever
  its data appears, list it in CREDITS.md and on the Credits page, never use ESA's logo, keep it free, and add any ESA
  service the browser contacts to the Privacy page first. Every page says the project isn't endorsed by NASA or ESA.
- **Decided Nov 9, 2026:** the project is renamed **NASA and ESA Data Projects**, and the repository
  **mcsyme11-byte/NASA-ESA-Data-and-API-Projects** (formerly NASA-Data-and-API-Projects). The site moved with it to
  https://mcsyme11-byte.github.io/NASA-ESA-Data-and-API-Projects/ (GitHub does not redirect the old site address; it
  redirects the old repository address for links and Git). Saved browser data keeps its old `nasa-data-projects.`
  names, so visitors' keys and places are not lost.
- **Decided Nov 9, 2026:** the site has information pages (About, Privacy, Terms of use, Credits, Contact) at
  `about/`, `privacy/`, `terms/`, `credits/` and `contact/`, linked from a row of site links in every footer
  (`shared/footer.js`, one file for every page). The footer also links to the licence and the source code on GitHub.
  **Decided Nov 12, 2026:** the footer was shortened to one row (About, Legal, Contact, Source code ↗ and the
  copyright) and one short credit line. A Legal page (`legal/`) gathers Privacy, Terms of use, Credits and the MIT
  licence; their own addresses are unchanged. Each page's detailed data credits (including the GIBS acknowledgement
  and ESA's credit lines) moved out of the footer to `.srcline` lines just above it.
  The Privacy page states what the site actually does (nothing collected; the API key in local storage; the place in
  a page in session storage; GitHub Pages and NASA's and ESA's services contacted directly; the code libraries are served from the site itself since Nov 10, 2026) and is updated before the
  site stores or sends anything new.
- **Decided Nov 9, 2026:** the project's own code and documents are released under the **MIT License** (replacing
  "all rights reserved"); third-party data and libraries keep their own terms, listed in `CREDITS.md`. A new data
  source or library is added to `CREDITS.md` (and the site's Credits page) in the same change.
- **Decided Nov 8, 2026:** three projects in one repository, each in its own folder (a "stream"):
  `asteroid-tracker/`, `mars-data/`, `image-explorer/`. Shared code and the look live in `shared/`.
- **Decided Nov 8, 2026:** the repository is **public**, so the pages can be hosted free on GitHub Pages and shown
  as a portfolio. Rule that follows: no API key, password or personal detail is ever committed.
- **Decided Nov 8, 2026:** the look follows the Flight Deck Suite and Hot Mic ("old money": navy, brass, cream,
  serif type), see [DESIGN.md](DESIGN.md).
- **Decided Nov 13, 2026 (version 2 of the look):** every page is built from the shared components in
  `shared/theme.css`, shown on the component page (`design/`); pages carry no styles of their own, and project style
  sheets hold only the inside of their tools. A new component is added to the theme and the component page first,
  after an approved mock-up, saying what it replaces. `dev/check_styles.py` checks this after every push.
- **Suggested order (Nov 8, 2026):** Asteroid Tracker, then Image Explorer, then Mars Data.
- **Each project is built in its own chat** inside the Claude project "NASA and ESA Data Projects"; a general chat is for
  questions and exploring.
- **Decided Nov 8, 2026 (Asteroid Tracker):** charts are hand-drawn SVG (no library), the "This year" view (JPL
  close-approach data) is part of version 1, and the page was built from an approved mock-up.
- **Decided Nov 8, 2026 (Asteroid Tracker):** the JPL close-approach API blocks calls from web pages, so GitHub
  Actions fetches the year's data once a day and commits `asteroid-tracker/data/close-approaches.json` when it has
  changed (one automatic commit a day at most, "Asteroid data: daily close-approach update").
- **Decided Nov 8, 2026 (Asteroid Tracker):** after version 1, three additions: a page for each asteroid (every
  approach, from `neo/{id}`), past years in the year view (2000 to next year) and an orbit diagram, with the orbit
  diagram to be done with particular care. The developer allowed building these without separate mock-ups.
- **Decided Nov 8, 2026 (Asteroid Tracker):** a solar system map on its own page (`map.html`) with every near-Earth
  object, the planets and spacecraft; a live preview of it on the home page; a Search tab. Mock-ups approved Nov 8.
- **Decided Nov 9, 2026 (Asteroid Tracker):** a guide to how asteroids are named, with each code decoded on the pages;
  "Found by the end of" (a discovery timeline) and "Close to Earth in" (a year) on the map; "Found in" in search;
  comets kept on the map as their own type. Built without a separate mock-up, at the developer's request.
- **Map performance (Nov 9, 2026):** positions are worked out only when the date changes, in typed arrays, starting
  each object from its previous frame's solution; dots are written straight into a pixel buffer at most 1.5× the
  screen's resolution; nothing is redrawn unless something changed. Measured with all 43,186 objects: dragging at
  60 frames a second on every screen tested; playing at 60 on standard and phone screens and 50–55 on 2× desktop and
  tablet screens, on a test machine without a graphics processor.
- **Map performance (Nov 9, 2026):** the Kepler solving moved to a background thread (`orbitworker.js`, sharing
  `kepler.js` with the page, which falls back to solving itself if a worker cannot start); lines are cut to the
  visible area before drawing. Measured: playing at a median of 60 frames a second at every width, zoomed in or out.
- **Decided Nov 9, 2026 (Asteroid Tracker):** spacecraft paths are smooth curves through every sample; Parker Solar
  Probe and Juno show only their last year unless selected, because their repeated loops piled up into a tangle.
- **Decided Nov 9, 2026 (Asteroid Tracker):** famous close passes are placed from Horizons positions
  (`data/famous.json`), not two-body orbits, because Earth's pull bends the path during a close pass. Five passes:
  Apophis 2029, Duende 2013, 2020 QG, 2019 OK and 2024 YR4 (2032).
- **Decided Nov 9, 2026 (Asteroid Tracker):** "‹ Back" uses the browser's own Back when the previous page is part of
  the site; the tracker and the map keep their place in the browser tab (`back.js`), and NASA's answers are kept
  for an hour in the tab (`shared/nasa.js`), so returning costs no requests.
- **Decided Nov 8, 2026 (Asteroid Tracker):** the orbit diagram computes positions itself (two-body Kepler orbits from
  NASA's elements; planets from JPL's approximate elements), so it works offline from the one NeoWs answer. Its
  limits are shown on the page; NASA's official close-approach figures are shown beside it.

- **Decided Nov 9, 2026 (Image Explorer):** one page with two tabs, "Earth map" and "Picture library". The map uses
  OpenLayers in the `epsg4326` projection (the fire layers work only there; see DATA-SOURCES.md), with Arctic and
  Antarctic views. Eight layers to start: true colour, night lights and sea temperature as the picture underneath;
  fires, snow, clouds, smoke and dust, and sea ice on top (fires with anything, the coloured layers one at a time).
  A date picker, a day-by-day slider and Play. Place search with suggestions after every letter (names and
  coordinates); tapping the map offers NASA's pictures of that place. The picture library is images first, with
  videos available as a filter. A mock-up comes first (`image-explorer/mockup.html`).

- **Decided Nov 9, 2026 (Image Explorer):** after the first mock-up the developer asked for a globe of the Earth that
  turns and zooms like the Asteroid Tracker's solar system map, with NASA pictures pinned to places on the Earth and
  to galaxies and nebulae in the sky around it. The daily Earth map stays. The page now has three tabs: **Earth
  map · Globe · Picture library**. The globe uses three.js (MIT licence) with NASA's Blue Marble, turned to the
  current sidereal time inside the real sky. Pins on the Earth: NASA EONET events (live) and, later, astronaut photos
  of Earth. Pins in the sky: all 110 Messier objects and famous Hubble and Webb targets, each opening NASA's pictures
  of it. Several rounds of mock-ups are expected.
- **Decided Nov 9, 2026 (Image Explorer):** the developer approved the globe mock-up for publishing and asked to see
  it with all the galaxies. Version 1 went live the same night with about 1,350 sky objects (every Messier object,
  every named object and every galaxy to magnitude 12) and the constellations, the real place list (GeoNames) and the
  live picture library. Further rounds of changes are expected.
- **Decided Nov 9, 2026 (Image Explorer):** the developer asked for five additions at once, built the same night:
  the four hand-listed sky positions checked, playable videos, natural features in place search (Natural Earth),
  Arctic and Antarctic views (proj4js with OpenLayers), and astronaut photos on the globe (a daily GitHub Actions
  job, active once the free API key is stored as the secret `EOL_API_KEY`).
- **Decided Nov 9, 2026 (Image Explorer):** the picture library puts pictures taken in space or of space first and
  moves launches, people, events and artists' illustrations under "Behind the scenes"; results appear as you type
  from 3 letters; suggestions and corrections allow for small spelling mistakes; mission buttons search several
  phrasings; a picture naming a sky object links to it on the globe. Whether to add ESA's Webb and Hubble archives is
  left to the developer.
- **Decided Nov 9, 2026 (Image Explorer):** the developer approved the mock-up of ESA's pictures in the library. Each
  search also asks ESA/Webb and ESA/Hubble's archives live (their pages allow browsers to read them); results are
  merged and sorted by the same score (ESA's archive pictures start 2 higher, as telescope science pictures), taking
  turns between libraries. A tag on each picture names its library; "From" picks NASA, ESA or both. The James Webb
  and Hubble buttons list ESA's whole archive for that telescope; the other mission buttons ask NASA only. ESA's
  archives have no videos; the NASA centre filter applies to NASA's pictures; the years apply to ESA's pictures by
  the year in their ID. An ESA picture's credit line, caption and details are read from its page when it opens.
- **Decided Nov 9, 2026 (Asteroid Tracker):** ESA's NEO Coordination Centre is added beside NASA's data. A new
  "Impact risk" tab lists every object on ESA's risk list (including its special risk list) or NASA/JPL's Sentry list,
  side by side, with the Torino and Palermo scales explained as rules; an asteroid's page and the week's details show
  ESA's and NASA's impact chances and ESA's close-approach distance; the map gains an "On a risk list" filter and
  on-screen arrow buttons for panning on phones. Neither centre's server allows calls from web pages, so the data job
  writes `data/risk.json` and `data/esa_close.json`. NASA stays the main source; every figure says which agency it
  comes from. The developer waived the mock-up step for this addition ("just do as much as you can").
- **Decided Nov 12, 2026 (Asteroid Tracker, keys):** the site must work for every visitor without a key. NeoWs (the
  "This week" list and each asteroid's page) needs an api.nasa.gov key, and a key placed in a public page could be
  read and used up by anyone, so the daily data job copies the NeoWs data most visitors see (the current week, two
  weeks either side, and their asteroids) with the developer's key from the repository secret `NASA_API_KEY`. Pages
  read the copy first; other weeks and asteroids are asked of NASA directly with the visitor's own key or the demo
  key (limit counted per connection). The Key settings box was removed the same day: with the copy it served no
  purpose, and a key saved by the earlier version is deleted from the visitor's browser.
- **Decided Nov 10, 2026 (Asteroid Tracker):** asteroids on an impact-risk list are drawn in rose on the map, a
  colour no orbit type uses, at 2 × 2 pixels; diamond outlines are added only when zoomed in, because at full view
  about 2,500 outlines covered the map. Share links carry the view in plain, readable parameters (`view=1` marks a
  shared link) and are removed from the address once applied, so Back and reload return to where the user was;
  nothing is stored or sent, so the Privacy page is unchanged.
- **Decided Nov 9, 2026 (licence position):** ESA's NEOCC portal has no licence of its own and refers to ESA's general
  terms, which allow educational and informational use with ESA's credit. The figures are shown with the credit
  "ESA NEO Coordination Centre (©ESA)" and no ESA logo; if a question arises, the NEOCC is asked by email
  (`neocc@esa.int`).
- **Decided Nov 11, 2026 (Image Explorer):** the developer asked for fixes to the map's tap card ("Open water" in the
  Sahara), more detail on the Earth map, more points on the globe, and astronaut photos without waiting for the key.
  Done: country, feature and distance on the tap card; Blue Marble under the day's pictures; coastlines, borders,
  rivers, names and a grid (Natural Earth); earthquakes (USGS), volcanoes, launch sites and natural wonders on the
  globe; the public Latest ISS Imagery set for astronaut photos.
- **Not possible (Nov 9, 2026):** seeing individual houses. NASA's sharpest free imagery is about 30 m a pixel
  (Landsat) and the daily layers 250 m; houses need commercial imagery, which is neither NASA's nor free.

## How it's built (starting plan; each project's chat confirms it)

| Part | Built with | Why |
|---|---|---|
| Web pages | Plain HTML, CSS and JavaScript modules, no build step | Free hosting on GitHub Pages; easy to read and learn from |
| Charts | Hand-drawn SVG, styled to DESIGN.md (Asteroid Tracker); chosen per project | No library to load; matches the look exactly |
| Globe | `shared/globe.js` (since Nov 17, 2026; from the Image Explorer's globe) on three.js 0.187 (MIT licence, in `shared/vendor/`), WebGL | A textured body, its sharper close up, camera moves and the Earth's night side, for any round body; each tool draws its own markers and names on a 2D layer above |
| Maps | `shared/flatmap.js` (since Nov 17, 2026; from the Image Explorer's Earth map) on OpenLayers 10 (BSD licence) and proj4js 2.22 (MIT), in `shared/vendor/`; `epsg4326`, `epsg3413` (Arctic), `epsg3031` (Antarctic) | Handles equirectangular and polar tile grids (GIBS's and others), vector tiles and polar views; Leaflet does not without add-ons |
| Sky positions | `shared/sky.js`, `shared/passes.js`, `shared/sats.js` (satellite.js 7.2.0, MIT, in `shared/vendor/`) | Sun, Moon, planets, stars, asteroids and satellites for any place and time, in the browser; checked against Astropy |
| Spacecraft map | `spacecraft/spacemap.js`, a subclass of the asteroid map's `SolarMap` | The same controls and projection; positions relative to each craft's parent |
| Mars analysis | Python 3 (pandas, matplotlib) in `mars-data/analysis/` | Cleaning and statistics are easiest in Python; it writes small summary files the web page reads |

### Shared map and globe (since Nov 17, 2026)

The Image Explorer's map and globe were moved into `shared/` unchanged in behaviour (old and new compared pixel by
pixel at 375 and 1280 px: the Earth map in the world, Arctic and grid views, the globe at the start, zoomed in and
turned with the keys, and the picture library), so that Planetary Maps (the Moon and Mars) and Orbit Watch (the
Earth) build on the same code. Each file's header says how to load it.

- **`shared/globe.js`** (an ES module; the page maps `three` to `shared/vendor/three-0.187.0/` with an import map):
  `createGlobe({ host, frame, night, autoRotate, … })` gives the renderer, scene, camera, orbit controls and a body of
  radius 1 in a group that can be turned, with `resize()`, `flyTo()`, `stepFly()`, `zoom()`, `turn()` (the arrow
  keys' rule), `paceControls()` and `toScreen()`; `bodyTexture(g, url, { z, cols, rows, tile })` puts a picture of the
  whole body on it from tiles; `closeUp(g, { url, degPerTile, levelFor, tile })` lays sharper tiles over the part in
  view; `vec()`, `gmst()`, `sunDir()` and `nightShade()` are the positions, the Earth's turn and its night side.
  `GIBS_BLUE_MARBLE` is the Earth's picture. Another body passes its own tile address, and its own `degPerTile` and
  `levelFor` where its tiles are not GIBS's size.
- **`shared/flatmap.js`** (a classic script after OpenLayers and proj4js; defines `FlatMap`): `worldGrid()` and
  `polarGrid()` (GIBS's numbers by default, any equirectangular tile set by `topRes` and `tileSize`), `registerPolar()`,
  `worldView()`, `polarView()`, `fillFrame()`, `clearBlack` and `graticule()`.
- What each tool draws (layers, dates, pins, labels, the sky, cards) stays in the tool's own folder.

## API keys

- **Web pages:** `shared/nasa.js` calls api.nasa.gov with NASA's `DEMO_KEY` (limit counted per visitor's connection).
  Since Nov 12, 2026 the pages have no key box: the data job copies what needs a key, with the developer's key kept
  as a repository secret. A key placed in a public page's code would be visible to anyone, which is why it isn't
  done.
- **Python:** reads `NASA_API_KEY` from `.env` (copy `.env.example`). `.env` is in `.gitignore`.
- **Check on GitHub:** `dev/check_wording.py` also fails if anything that looks like a NASA key is committed.

## Running it locally

```
python3 -m http.server 8000      # from the repository's top folder
```
Then open `http://localhost:8000`. (Opening the HTML files directly doesn't work, because browsers block
JavaScript modules on `file://`.)

## Publishing (GitHub Pages)

Live since Nov 8, 2026: https://mcsyme11-byte.github.io/NASA-ESA-Data-and-API-Projects/

One-time setting, done on github.com: the repository's **Settings › Pages › Build and deployment**, Source
"Deploy from a branch", Branch **main**, folder **/ (root)**, Save. The site then appears at
`https://mcsyme11-byte.github.io/NASA-ESA-Data-and-API-Projects/` a minute or two after each push.

## Checks on GitHub

`.github/workflows/checks.yml` runs `dev/check_wording.py` after every push to main:
- no first name on its own (the credit "Malcolm Syme" is fine), no chat narrating its own work;
- no personal paths or user names;
- no NASA API key.

Run it by hand: `python3 dev/check_wording.py`.

Since Nov 13, 2026 the same workflow also runs `dev/check_styles.py`:
- no `<style>` block or `style="…"` attribute in any page (scripts may still set values worked out from data);
- every page links `shared/theme.css` and `shared/footer.js`, and all its version tags are the same;
- no project style sheet restyles a shared component on its own (`.btn { … }`); it may adjust one inside its own
  parts (`.mapbar .seg`).

Run it by hand: `python3 dev/check_styles.py`. Since Nov 18, 2026 it also refuses any `?v=` tag in a page or script
that differs from the rest (and a differing Sky Finder `VERSION`), and checks the project tab bars: every page of a
project in `TAB_PROJECTS` carries `nav.tabs[aria-label="<project>"]` with a link to each of the project's other pages,
and a folder with more than one page that is not in the list is reported.

Since Nov 18, 2026 the workflow also runs `dev/check_docs.py`:
- every project and tool live on the site (read from `SECTIONS` in `shared/footer.js`) has its row in `README.md` and
  in the Project Record's "The projects at a glance" (`docs/record/front.md`), and neither calls a live one planned,
  or speaks of "three projects";
- `docs/ROADMAP.md` keeps its shape: its numbered sections in order with none missing, no finished `[x]` items, no
  indented line left on its own.

Run it by hand: `python3 dev/check_docs.py`.

`.github/workflows/astronaut-photos.yml` runs once a day (07:41 UTC) and on demand: it fetches the newest astronaut
photos of Earth into `image-explorer/data/astronaut.json` if the secret `EOL_API_KEY` is set, and commits the file if
it changed.

`.github/workflows/asteroid-data.yml` runs twice a day (06:17 UTC, and 14:47 UTC as a backup) and on demand
(Actions › Asteroid data › Run workflow, with "all" to refresh every year): it refreshes the Asteroid Tracker's
close-approach files, every near-Earth object's orbit, the spacecraft positions and the coming passes (`soon.json`)
from JPL, and commits them if they changed. If other work has been pushed meanwhile, it rebases onto it and retries
the push (up to five times).

**Decided Nov 9, 2026 (whole site):** "‹ Back" buttons (`<a class="backlink" id="back">`) are named and wired by
`shared/footer.js` alone. Page code must not add its own click handler to them, or one press goes back two pages;
the Asteroid Tracker's `back.js` only un-hides the map's button.

**Decided Nov 9, 2026 (Asteroid Tracker):** the map pans (right, middle or Shift drag, two fingers, or the ✥ button),
and the wheel and a pinch zoom towards the pointer; a plain drag still turns the view.

**Decided Nov 9, 2026 (Asteroid Tracker):** the orbit diagram marks a close approach at both bodies' positions at that
moment, and Play stops there; its normal speed is 5 days a second (60 was too fast to follow).

**Decided Nov 9, 2026 (Asteroid Tracker):** a backup daily run, after GitHub did not start the 06:17 run that day.
The size comparisons (`compare.js`) replace the earlier "school buses / football fields" phrase everywhere, with one
rule set; the famous passes take their times and distances from NASA/JPL close-approach data in `famous.json` rather
than figures typed into the page; Chelyabinsk (2013) is not a famous pass, because no orbit exists for it (it was not
seen before it entered the atmosphere).

## Writing style

**Decided Nov 8, 2026:** all documentation is written in a professional tone, as project documentation, never in the
tone of an AI assistant talking to a person (no greetings, first-person phrases, sign-offs or exclamation marks;
no addressing the developer; no narrating what a chat did). `dev/check_wording.py` checks for the common phrases.

Documents, commit messages and code comments are neutral, professional project documentation. The developer is
"the developer" (his name and email stay in every credit line); people using the pages are "the user" or "you" in
user-facing text. Decisions are recorded as dated facts ("Decided Nov 8, 2026: …").
