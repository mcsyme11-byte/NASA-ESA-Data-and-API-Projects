<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff: the credit and patch on every file

From the General/Files/Repo chat to every chat, Nov 19, 2026 (decided by the developer that day).

Every document and file of code in the repository now carries "© 2026 Malcolm Syme · mcsyme11@gmail.com", and every
Markdown document opens with the NEDAP patch and the credit line. For each chat:

1. **After adding a file** (a page, a script, a style sheet, a document, a handoff), run `python3 dev/brand_files.py`.
   It adds the first comment line to code (`NASA and ESA Data Projects · <file> · © 2026 Malcolm Syme ·
   mcsyme11@gmail.com`) and the patch header to a Markdown document. `dev/check_docs.py`, the check before every push
   and GitHub's Checks refuse a file without it.
2. **Writing a new file by hand:** start it with that line (code) or copy the header from any document (Markdown).
3. **Left out:** third-party files (`shared/vendor/`, library licences), data written by the data jobs (folders named
   `data/`) and files that cannot hold a comment (JSON, CSV, web manifests, pictures).
4. **Mars Data:** the cleaning reports' scripts write the credit line under each report's title (changed Nov 19,
   2026, in `run_rems.py`, `run_meda.py`, `run_uv.py` and `run_mex.py`); the 93 saved reports were given it.
