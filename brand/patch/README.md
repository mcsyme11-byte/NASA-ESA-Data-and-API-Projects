<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# The NEDAP mission patch

The project's logo (decided Nov 17, 2026): a round mission patch with "NEDAP · DATA PROJECTS" on its ring, the year
below, and an asteroid with three craters in the centre, in the site's navy, brass, green and cream. It replaced the
planet-and-ring emblem used from Nov 8 to Nov 17, 2026. NEDAP is the project's short name (NASA and ESA Data and API
Projects).

© 2026 Malcolm Syme · mcsyme11@gmail.com. The NEDAP name, the patch and its marks are the developer's marks and are
not covered by the project's MIT License (see `LICENSE.md`). They may be shown unchanged to refer to this project.

## The files

| File | What it is | Used for |
|---|---|---|
| `nedap-patch.svg` | The patch, every letter as outlines (no font needed) | 64 px and larger: the home and Contact pages, the README, the component page, print |
| `nedap-patch-1024.png`, `nedap-patch-512.png` | The patch as pictures with a transparent background | Where an SVG can't be used (the Project Record cover uses the 512 px copy) |
| `nedap-mark.svg` | The mark: the brass ring, the green inner ring and the asteroid, no lettering | About 32 to 64 px: the top bar, the home-screen icon |
| `nedap-mark-small.svg` | The small mark: the brass ring and the asteroid as a solid shape with two dark craters | 16 to 24 px: the browser tab, the footer |
| `build_patch.py` | Draws the three SVG files, and the site's copies (below) | Run after any change to the drawing |
| `nasa-data-patch.svg`, `nasa-data-patch.png` | The first version (Nov 17, 2026), kept for the record | Not used (see "Changes from the first version") |

The site's copies, written by `build_patch.py`: `shared/emblem.svg` (the top-bar mark, as a symbol pages reuse with
`<use href="…/shared/emblem.svg#e"/>`), `shared/icons/favicon.svg` (the small mark) and `shared/icons/icon.svg` (the
home-screen icon: the mark on the night-sky tile). The PNG files in `shared/icons/` (the 32 px browser-tab icon, the
home-screen icons at 180, 192 and 512 px, and the maskable 512 px icon) are renders of those SVG files.

## Sizes

- **64 px and larger:** the full patch. Below 64 px its lettering can't be read.
- **About 32 to 64 px:** the mark.
- **16 to 24 px:** the small mark; thin outlines blur at these sizes, so the asteroid is solid.
- Keep clear space around the patch of at least a tenth of its width. Don't recolour, stretch, rotate, crop or add
  effects to it, and don't put the ring lettering back as live text.

## Remaking the files

    python3 brand/patch/build_patch.py <path to Gelasio[wght].ttf>

The ring lettering is drawn as outlines from Gelasio (SIL Open Font License, free to use in a public repository), which
has the same letter widths as Georgia, the font the patch was first drawn in. The stars are drawn shapes. The PNG
copies are made by rendering the SVG files at their size with any SVG renderer (a headless browser was used), with a
transparent background, except `apple-touch-icon.png` and `maskable-512.png`, which are square and filled.

## Changes from the first version

The first version (`nasa-data-patch.*`, made for the developer's portfolio) was changed in two ways before it became
the project's logo:

1. **The ring text** read "NASA · ESA DATA". US law (51 U.S.C. § 20141) forbids using NASA's name or initials in a way
   that suggests a connection with NASA or its endorsement, the US trademark office refuses marks that contain them,
   and NASA's guidelines forbid using "NASA" with a brand or product name. A round seal naming the agencies could also
   be read as an official NASA or ESA patch. The ring now reads "NEDAP · DATA PROJECTS".
2. **The centre symbol** followed a free icon shape (from the Lucide icon set) that anyone can use. It was redrawn as
   original artwork for this patch: an irregular asteroid with two large craters and one small one.

## Before any trademark filing

- A trademark search on the name "NEDAP": a technology company of that name already exists (Nedap N.V., Netherlands).
- Advice from a trademark lawyer on the patch and the name.
- Until then the marks carry no ™ or ® sign.
