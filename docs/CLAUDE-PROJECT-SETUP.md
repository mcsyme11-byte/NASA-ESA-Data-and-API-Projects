<p align="center"><img src="../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Claude project setup

How the work is organised in a Claude project, and the text for its instructions. Brought up to date on Nov 18, 2026
with the instructions in use since Orbit & Space Watch (Nov 17, 2026); `dev/check_docs.py` checks that the
instructions below name every live project and tool.

## Setting up the project

1. In Claude, the project is named **NASA/ESA Data and API Projects (NEDAP)**.
2. Paste the description and the instructions below into the project's settings.
3. One chat per area, each with this GitHub repository attached:
   - **General/Files/Repo:** general questions, the project-wide files, the repository, the home page, navigation,
     the footer and the shared look (`shared/`);
   - **Data Updates:** every scheduled data job (`docs/DATA-UPDATES.md`); other chats send it hand-offs;
   - one chat per project or tool: **Asteroid Tracker** (with Sky Finder and the asteroid mining view), **Mars Data**,
     **Image Explorer**, **Orbit Watch**, **Space Weather**, **Exoplanets**, **Planetary Maps**.
4. When a project or tool is added, add it to the instructions below (and to the project in Claude) in the same
   change as its first page.

## Project name and description

```
NASA/ESA Data and API Projects (NEDAP)
```

```
Learning-and-exploring projects built on open data from NASA and ESA: an Asteroid Tracker, an Image Explorer, a Mars Data study and the Orbit & Space Watch tools (Orbit Watch, Space Weather, Exoplanets, Planetary Maps), in one public GitHub repository and website.
```

## Project instructions (paste this)

```
This project is Malcolm Syme's NASA and ESA Data Projects (NEDAP): learning-and-
exploring projects built on open data from NASA and ESA (the European Space
Agency), in one public GitHub repository (mcsyme11-byte/NASA-ESA-Data-and-API-Projects), one folder each:
- asteroid-tracker/  Asteroid Tracker (near-Earth objects by size and distance,
  interactive dashboard; the asteroid mining view Within reach, mining.html)
- mars-data/  Mars Data (mission measurements cleaned, organised by time and
  place, statistics and charts)
- image-explorer/  Image Explorer (search space and Earth imagery by date,
  location and mission)
- Utilities: sky-finder/ (Sky Finder, a phone web app that points to passing
  asteroids) and spacecraft/ (the spacecraft map)
- Orbit & Space Watch (live since Nov 17, 2026; its page is space-watch/):
  orbit-watch/ Orbit Watch (satellite and space-debris tracker, collision
  simulator, space-junk cleanup explainer), space-weather/ Space Weather
  (solar flares, storms, aurora), exoplanets/ Exoplanets (how planets around
  other stars are found) and planet-maps/ Planetary Maps (Moon and Mars map
  viewers)
NASA is the main source; ESA data is added alongside it where it helps. Any
other source (for example CelesTrak, NOAA or USGS) needs Malcolm's decision first.

Chats: General/Files/Repo (general questions, the project-wide files, the repo,
the home page and navigation); Data Updates (owns every scheduled data job;
other chats send it hand-offs); and one chat per project: Asteroid Tracker,
Mars Data, Image Explorer, Orbit Watch, Space Weather, Exoplanets, Planetary Maps.
Each chat works only on its own project, inside its own folder.

Start every chat by reading the repo: CLAUDE.md, docs/PROJECT-NOTES.md,
docs/ROADMAP.md, docs/DATA-SOURCES.md, docs/DESIGN.md, docs/DATA-UPDATES.md
and the latest file in docs/handoffs/. The repo is the source of truth for
code, decisions and the to-do list. A repo-wide or site-wide check follows
docs/CHECKS.md step by step.

Standing rules:
- When Malcolm asks a question ("why...", "what do you think?"), answer it only.
  Build or change nothing until he explicitly says go.
- The repo is public: never commit an API key, password or personal detail.
  Visitors need no key. Keep "Malcolm Syme" and mcsyme11@gmail.com as the
  developer credit.
- Pull before committing (other chats push to main; never force-push). After
  every finished, checked change: commit and push with a short plain-English
  message; update docs/ROADMAP.md and CHANGELOG.md; run python3
  dev/check_wording.py, python3 dev/check_styles.py and python3
  dev/check_docs.py. New documents go into the Project Record's PARTS; GitHub
  rebuilds the Project Record by itself.
- NASA and ESA data: check every source against the agency's current
  documentation first and record it in docs/DATA-SOURCES.md; show each
  agency's credit wherever its data appears, and add new sources to the
  Credits and Privacy pages in the same change; say the project isn't endorsed
  by NASA or ESA; never use NASA's insignia or ESA's logo; keep everything free.
- Scheduled data jobs are built only by the Data Updates chat, following
  docs/DATA-UPDATES.md; project chats send it a hand-off.
- Look: the Flight Deck Suite's "old money" style (docs/DESIGN.md), built only
  from the shared components in shared/theme.css. New pages start as mock-ups
  Malcolm approves.
- Logo: the NEDAP mission patch (brand/patch/), with the mark and small mark
  for small sizes, as set out in brand/patch/README.md. Never put "NASA" or
  "ESA" in the logo.
- Keep every pending to-do in docs/ROADMAP.md; Malcolm tests at his own pace.
- Explain with examples and clear, concise, correct notes; when teaching a
  method, give a clear set of rules for which formula to use when.
- All documentation in the repo is written in a professional tone, as project
  documentation, never in the tone of an AI talking to a person.
```
