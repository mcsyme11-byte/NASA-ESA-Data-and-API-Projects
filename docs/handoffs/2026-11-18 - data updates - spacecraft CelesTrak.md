# Handoff: the spacecraft map's CelesTrak download (Nov 18, 2026)

From the Data updates chat to the Image Explorer chat (owner of the spacecraft map, `spacecraft/`). Three changes to
`spacecraft/fetch_spacecraft.py` (and, for the third, `shared/sats.js`), all in that chat's files.

## 1. Stop at the first CelesTrak timeout

On Nov 18, 2026 the 05:23 UTC run of Spacecraft data (started on time by the outside clock) reached its 30-minute
limit and was cancelled: CelesTrak stopped answering, and each group waited about 6 minutes (`fetch()` tries 3 times
with a 120-second timeout) before the next was asked. The Horizons positions were saved; `tle.json` kept its previous
copy. CelesTrak's usage policy (updated May 22, 2026) also asks software to stop at the first answer that is not HTTP
200 and not to retry straight away. Requested: after the first CelesTrak failure (timeout or any answer other than
200), skip the remaining groups and names, keep the previous `tle.json`, and print a line containing "not found" so the
data job records it.

## 2. One download of the active list, shared with Orbit Watch

Orbit Watch's job (`orbit-data.yml`, since Nov 18, 2026) reads CelesTrak's `active` group in CSV, and CelesTrak asks
for the active list at most once in two hours. Until the spacecraft script can reuse that download, the two jobs run
at least five hours apart (Spacecraft data 05:23 and 17:53 UTC, Orbit data 11:13 and 23:13 UTC). Once the spacecraft
script can read `active.csv` from a folder (for example a `--from DIR` option), the Data updates chat runs
`fetch_orbits.py --keep "$RUNNER_TEMP/celestrak"` first in the same workflow and passes that folder, so CelesTrak is
asked once.

## 3. Six-digit catalogue numbers (from the Orbit Watch hand-off, section 3)

CelesTrak ran out of five-digit catalogue numbers on Jul 11, 2026; objects catalogued since then are not in two-line
(TLE) downloads. The spacecraft map reads `FORMAT=tle`, so craft launched since July 2026 cannot be found. Reading the
CSV (OMM) format instead, with satellite.js `json2satrec` as `orbit-watch/propagate.js` does, fixes it; `shared/sats.js`
needs the same change. Section 2 then follows directly: both tools read the same CSV.

When any of these is done, the Data updates chat changes `spacecraft-data.yml` to match (a hand-off back, or a note in
`docs/ROADMAP.md` section 4).

## 4. Changed in `spacecraft/fetch_spacecraft.py` on Nov 19, 2026 (for information)

At the developer's request, `check_links()` now returns `(broken, not_checked)` and `links.json` gains `not_checked`:
answers that say nothing about a page (403, 429, server errors, timeouts), and every 404 from a site that answers 404
for at least five links and a third of its links in one run (www.esa.int answered GitHub's robot that way for 20 of
its 24 mission pages on Nov 19, 2026). Only `broken` hides a link on the map. Keep this when changing the script for
sections 1 to 3.
