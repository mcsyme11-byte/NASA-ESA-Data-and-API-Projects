<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff: the site tools of Nov 19, 2026

From the General/Files/Repo chat to every project chat, Nov 19, 2026. Approved by the developer the same day; the
components are described in `docs/DESIGN.md` and shown on the component page (`design/`, section 12).

## Already on every page (nothing to do)

`shared/footer.js` adds these by itself:

- **Site search:** a search button in the top bar (from 761 px), "Search the site" in the footer, and the keys `/` and
  Ctrl+K. Its list (`shared/search.json`) is rebuilt by GitHub after every push, with the Project Record; a page is
  found by its heading, description and section headings (`h2` with an `id`).
- **Keyboard shortcuts:** `?` lists them; `1` to `9` open the project's tabs in the order of the project tab bar.
- **Copy link to this section:** a small link button after each `.section-head h2[id]` (left out of pages whose
  address chooses a view: `NOLINKS` in `shared/footer.js`).
- **New tools in the menu:** a dot beside a menu item whose part of the site has a page published since the visitor's
  last visit.
- **Changes between pages:** pages fade into one another with the top bar in place.
- **Preview cards for shared links:** tags in every page's `<head>` and a picture per part of the site.

## For each project chat to do on its own pages

1. **A new page, or a changed title or description:** run `python3 dev/build_social.py` (it writes the preview card's
   tags into the page's `<head>`); `dev/check_docs.py` refuses a page without them. A new page in `SECTIONS` also gets
   `added: 'YYYY-MM-DD'`, the day it is published, so the menu marks it as new.
2. **Previous and next period buttons:** add `data-key="prev"` and `data-key="next"` to them (for example a tool's
   "‹ 1 d" and "1 d ›", or the previous and next week), so ← and → work and the `?` panel lists them.
3. **Loading shapes:** where the shape of what loads is known, use `.skel.chart`, `.skel.rows`, `.skel.num` or
   `.skel.line` (with `aria-hidden="true"` and the words in a `.sr` beside it) in place of `.loading`.
4. **"On this page" bars** on long pages that also have a project tab bar (the Asteroid Tracker's overview, Mars
   Data's overview, Planetary Maps' place list): `<nav class="tabs bar sub" data-spy aria-label="On this page">` with
   links to the page's sections, straight after the project tab bar. A page whose only bar is its "On this page" bar
   (Space Weather) can add `data-spy` to it and drop its own code for marking the section being read.

Each change goes through `docs/CHECKS.md` before it is pushed, and comes off `docs/ROADMAP.md` (section 0) once done.
