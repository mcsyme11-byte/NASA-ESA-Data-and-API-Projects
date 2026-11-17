# Handoff: the NEDAP mission patch is the project's logo (Nov 17, 2026)

For every chat working in this repository (Asteroid Tracker, Image Explorer, Mars Data, Data updates, the general
chat), and for the developer's portfolio project, where the patch was first drawn.

## Confirmed answers (Nov 17, 2026)

- The NEDAP mission patch replaces the planet-and-ring emblem as the project's logo everywhere.
- Its ring reads "NEDAP · DATA PROJECTS"; the first version's "NASA · ESA DATA" is not used (NASA's name in a logo
  suggests endorsement and can't be part of the developer's mark; see `brand/patch/README.md`).
- The centre symbol is original artwork (an irregular asteroid with three craters), replacing the free icon shape.
- The lettering is outlines (from Gelasio, the open-licence twin of Georgia); no file uses live text.
- The small mark is in every page's footer, at the start of the copyright line.
- The credit stays "© 2026 Malcolm Syme · mcsyme11@gmail.com". The NEDAP name and patch are the developer's marks and
  are excluded from the MIT License (`LICENSE.md`). No ™ or ® sign until a trademark search and legal advice.

## What changed (all in shared files; no project page needed editing)

| Where | Now |
|---|---|
| Top bar of every page | The NEDAP mark, 32 px, from `shared/emblem.svg` (pages keep their `<use href="…/shared/emblem.svg#e"/>`) |
| Browser tab | `shared/icons/favicon.svg` and `favicon-32.png` (every page's icon links were updated) |
| Home and Contact page heads | The patch, `brand/patch/nedap-patch.svg` (`.medal`, 150 px; 120 px on phones) |
| Phone home screen (NEDAP) | `shared/icons/` remade: the mark on the night-sky tile |
| Footer | The 20 px small mark before "© 2026 Malcolm Syme", added by `shared/footer.js` |
| README, Project Record cover, component page (`design/`) | The patch |
| `docs/DESIGN.md` | Section "1a. Logo and icons": which version at which size, and the rules |
| `LICENSE.md`, the Terms and Legal pages | The marks are excluded from the MIT License |
| Version tags | Raised to `2026111701` on every page; Sky Finder's cache `sky-finder-2026111701` also stores the footer mark |

## What each chat does

- **Project chats (Asteroid Tracker, Image Explorer, Mars Data):** nothing to change. Pull before the next change.
  New pages copy an existing page's head and top bar (icon links, `shared/emblem.svg`), and never add a logo of
  their own; `dev/check_styles.py` refuses a page without the icon links.
- **Sky Finder** keeps its own app icon (`sky-finder/icons/`); its footer now shows the small mark, like every page.
- **Data updates chat:** nothing to change.
- **Changes to the logo itself** are made only in `brand/patch/build_patch.py`, which writes the patch, both marks
  and the site's copies; the PNG copies are then rendered again (see `brand/patch/README.md`).
- **Portfolio project:** replace its copy of the patch with `brand/patch/nedap-patch.svg` (or the 1024 px PNG), so
  both show the same logo; the first version (`nasa-data-patch.*`) is kept in this repository for the record only.

## Still to do (in `docs/ROADMAP.md`)

- Developer testing of the new logo on phone, tablet and computer (tab icon, home-screen icon, top bar, footer).
- Before any trademark filing: a trademark search on "NEDAP" (a company called Nedap N.V. exists) and legal advice.
