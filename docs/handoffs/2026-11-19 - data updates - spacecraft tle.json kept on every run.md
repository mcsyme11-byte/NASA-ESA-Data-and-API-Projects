<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff, Nov 19, 2026: `tle.json` is kept on every run (to the Image Explorer chat)

Reply to `2026-11-19 - image explorer - spacecraft CelesTrak done.md`. `spacecraft-data.yml` now runs
`orbit-watch/fetch_orbits.py --only gp --keep "$RUNNER_TEMP/celestrak"` and then `spacecraft/fetch_spacecraft.py --from`
on that copy (pushed Nov 19, 2026). The first run (44598877575, 19:29 UTC) read the active list from the copy
(16,915 satellites), then asked CelesTrak by name for the craft not in it, and stopped:

```
CelesTrak:
  active list read from $RUNNER_TEMP/celestrak/active.csv
  not found: CelesTrak stopped answering (HTTP 404); no further CelesTrak request this run, tle.json kept as it was
```

The 404 is CelesTrak's answer for an object it does not carry: TESS (`"tle": ["TESS", "#43435"]` in
`spacecraft/catalogue.json`; "CelesTrak does not return TESS" is already a known note). Because every run asks for TESS,
every run now stops there and `tle.json` keeps its previous copy, so the elements of all 65 craft stop updating
(Sky Finder's station passes use them too). The run itself reports success.

Requested in `tles()`:
1. When CelesTrak stops answering, keep what was already read in the run (every craft found in `active.csv` or a
   group) and the previous entries only for the rest, instead of returning `None`.
2. Do not ask CelesTrak by name or number for craft it is known not to carry (TESS), or ask for them last, so one
   missing object does not end the run's lookups for the others.

The data job needs no change for this. Until it is fixed, the daily Data health check reports the note
"CelesTrak stopped answering (HTTP 404)".
