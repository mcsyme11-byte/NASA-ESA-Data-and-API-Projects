<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Documents

Documents made for the project and its developer (test lists, notes, letters, one-off reports), kept here for good,
also once they are finished with (decided Nov 20, 2026). Each document is kept as the file that was handed over
(usually a PDF), with its source in `source/` where it was built from one, so it can be rebuilt or changed later.
File names start with the document's date: `YYYY-MM-DD - <title>.pdf`.

| Date | Document | What it is | Source |
|---|---|---|---|
| Nov 19, 2026 | [Site tools test list](2026-11-19%20-%20Site%20tools%20test%20list.pdf) | The developer's 14 checks of the site tools added on Nov 19, 2026 (the search, shortcuts, section links, preview cards, Lost in space, the Space Watch figures), in three sittings of about 35 minutes in total; still to be done (`docs/ROADMAP.md`, section 0) | [HTML](source/2026-11-19%20-%20Site%20tools%20test%20list.html), printed to PDF in Chromium (Letter, with the credit and page number in the footer) |

## Adding a document

1. Save the file as `docs/documents/YYYY-MM-DD - <title>.pdf` (or its own format), and its source, if any, in
   `docs/documents/source/` under the same name.
2. Add a row to the table above.
3. Run `python3 dev/brand_files.py` (the credit on the source and this README), then the checks in `docs/CHECKS.md`,
   and push.
