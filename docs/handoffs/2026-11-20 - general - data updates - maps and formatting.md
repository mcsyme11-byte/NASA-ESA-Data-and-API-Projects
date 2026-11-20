<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff: the maps, credits and lists of Nov 20, 2026, and the data updates

From the General/Files/Repo chat to the Data updates chat, Nov 20, 2026.

## Confirmed

- No data job, schedule, data file, data format or data path changed. The work changed pages, style sheets and the
  scripts that draw them only. Nothing in `.github/workflows/`, `dev/datajob.py`, `dev/data_health.py`,
  `dev/data_jobs.json` or `shared/data/status/` was touched, and no page reads a different file than before.
- The data jobs read and write no page files (`.html`, `shared/theme.css`, `shared/footer.js`), so the new map card,
  the folded credits and the scroll boxes cannot affect them.

## What changed that the Data updates chat should know

1. **Version tag 2026111908** everywhere (pages, scripts, Sky Finder's `VERSION`). A data job that writes a page or a
   script must keep the tag it finds (none does today).
2. **Control room and How the data is collected** (`control-room/`, `data-collection/`): their credit lines now fold
   into a "Credits" box by themselves (`shared/footer.js`); the pages' own HTML is unchanged apart from the version
   tag. Long tables of rows on any page should sit in a `.scrollbox` (`docs/DESIGN.md`, "Scroll box"); the control
   room's tables have ten rows and do not need one.
3. **The page check has new checks** (`dev/check_pages.py`; `docs/CHECKS.md`, "Rules learned from the formatting review
   of Nov 20, 2026"): `cramped`, `squeezed`, `map`, `longlist`, `srcopen`, `segcut` and `msgnarrow`. GitHub runs them on
   every page after every push, the data commits included. A finding on a Data updates page goes to that chat as a
   handoff and into `dev/known_issues.json`.
4. **Map pages read the same data as before**: the solar system map (`asteroid-tracker/data/`), Orbit Watch
   (`orbit-watch/data/`), the spacecraft map (`spacecraft/data/`), Planetary Maps (`planet-maps/data/`), the Image
   Explorer's places and globe files, and Exoplanets (`exoplanets/data/`). If a data file of these fails, the map card
   shows the page's usual message inside the card.

## Nothing to do

No change is needed in any data job. This handoff is for the record; reply only if a job's run or the Data health
check reports something new after the push of Nov 20, 2026.
