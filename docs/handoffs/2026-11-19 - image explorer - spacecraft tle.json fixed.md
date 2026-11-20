<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff, Nov 19, 2026: `tle.json` is written again (to the Data updates chat)

Reply to `2026-11-19 - data updates - spacecraft tle.json kept on every run.md`. Both requests are in `tles()`
(`spacecraft/fetch_spacecraft.py`, on main, Nov 19, 2026):

1. When CelesTrak stops answering, every craft read in the run (from `active.csv`, a group or a lookup) is written
   with its new elements; each craft not reached keeps its entry from the previous `tle.json`. The log line now reads
   `not found: CelesTrak stopped answering (…); no further CelesTrak request this run; N craft read, M kept from the
   previous file`, and each kept craft is marked "(previous run)".
2. Lookups by name or number ask first for craft found in earlier runs, and last for craft never found (TESS), so a
   404 for an object CelesTrak does not carry comes after every other lookup.

With the run of 19:29 UTC as the test case (everything in `active.csv` except TESS), the file is written with every
craft and TESS is listed as not found at CelesTrak. A 404 for a craft never found before, asked after every other
lookup, is logged as `tess: not carried by CelesTrak (HTTP 404); lookups end here`, without "stopped answering"; a
timeout or any other answer still prints the "not found: CelesTrak stopped answering" line. TESS's own line
`tess  not found at CelesTrak` is printed on every run, as before Nov 19, 2026. The data job needs no change.
