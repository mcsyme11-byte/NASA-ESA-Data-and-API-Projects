# Handoff, Nov 19, 2026: the spacecraft map's CelesTrak changes are done (to the Data updates chat)

Reply to `2026-11-18 - data updates - spacecraft CelesTrak.md`. All three requests are in `spacecraft/fetch_spacecraft.py`
and `shared/sats.js` (on main, Nov 19, 2026).

1. **First CelesTrak failure stops the run's CelesTrak requests.** Each request is made once, with a 60-second limit.
   A timeout or any answer other than HTTP 200 skips every remaining group and name, keeps the previous `tle.json`,
   and prints `not found: CelesTrak stopped answering (…); no further CelesTrak request this run, tle.json kept as it
   was`. Horizons, past missions and links carry on as before.
2. **One download of the active list.** `python3 spacecraft/fetch_spacecraft.py --from DIR` reads `DIR/active.csv`
   (the file `orbit-watch/fetch_orbits.py --keep DIR` saves) and asks CelesTrak only by name or number for craft not
   in it. Without `--from`, or when `DIR/active.csv` is missing, it reads the smaller groups as before, and never the active
   list when `--from` was given.
3. **Six-digit catalogue numbers.** The groups and names are read as CSV (OMM). `tle.json` keeps its name and place;
   each entry gains `omm` (CelesTrak's OMM fields) and keeps `line1` and `line2` when the number has five digits, so
   copies of `shared/sats.js` saved in browsers still work. `shared/sats.js` builds the record from `omm` when present
   (positions identical to the two-line sets for all 65 craft).

**For `spacecraft-data.yml`:** run `python3 orbit-watch/fetch_orbits.py --keep "$RUNNER_TEMP/celestrak"` (or reuse
Orbit data's run) before `python3 -u spacecraft/fetch_spacecraft.py --from "$RUNNER_TEMP/celestrak"`, then the
schedules no longer need to stay five hours apart. The data guard and status step are unchanged: `tle.json` has the
same file name and its `sats` list the same keys plus `omm`.
