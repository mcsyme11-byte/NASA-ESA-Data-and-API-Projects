<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff: the shared map card (Nov 19, 2026)

From the Orbit Watch chat to the Asteroid Tracker chat. Decided Nov 18, 2026 (mock-up approved by the developer): the
map card is a shared component in `shared/theme.css` ("map card"), listed in `docs/DESIGN.md` and shown on the
component page (`design/index.html`, section 11). Orbit Watch's globe uses it since Nov 19, 2026 (frame
`.mapframe.space`); its copy has been removed from `orbit-watch/orbit.css`.

## What is asked

Delete the map card's rules from `asteroid-tracker/tracker.css` ("the solar system map", from `.mapcard` on), so the
solar system map (`asteroid-tracker/map.html`) uses the shared ones. The two copies match today, so nothing breaks in
the meantime.

- **Delete** (now in `shared/theme.css`): `.mapcard`, `.maplayout`, `.mapmain`, `.mapside`, `.mapframe` (with
  `:fullscreen`, `.pseudo-full`, `.loading`), `body.noscroll`, `.ovl`, `.ovl-date` (and `strong`, `.note`), `.mbtn`
  (with `.wide`, hover and pressed), `.ovl-zoom`, `.ovl-pad` (with its four `.pad-*` buttons and their arrows),
  `.ovl-find`, `.findbox input`, `.findlist` (and its `li` rules), `.ovl-scale` (and `i`), `.ovl-hint` (both rules
  and `.gone`), `.mapbar`, `.mapbar.famous` and its `.barlbl`, `.selcard`, `.legendbox`, `.selcard h3`,
  `.mapside .label`, `.selcard .dlinks`, `.selcard .btn`, `.legendbox .note`, and their phone rules (`.maplayout` at
  1100 px; `.mapcard`, `.mapframe`, `.ovl-find`, `.mapframe .ovl-date`, `.ovl-hint`, `.mbtn`, `.ovl-pad`, `.mapbar`,
  `.mapbar .seg`, `.mapbar .speed` at 760 px; `.ovl-pad` at 360 px).
- **Keep** (the inside of the map): `#map` and its cursors, `.tourbanner`, `.mapbar.years` and `.yearctl`, the
  orbit-type dots and the spacecraft list, `.selcard`'s own contents (`dl.mini`, `.cmp`), `.mapside .classlist`, and
  the orbit diagram's rules (`.ovl-date` static on phones inside `.orbitframe`). Selectors shared with the orbit
  diagram (for example `.mapmain, .mapside, .orbitmain, .orbitside`) keep only their orbit-diagram half.

## Three small differences, settled in the shared version

- The hint: at the bottom left, raised above the scale bar when the map has one (`.mapframe:has(.ovl-scale)`), as the
  solar system map shows it today.
- The find box on phones sits 76 px from the top of the frame, as on the solar system map.
- Long names in the Selected card break (`overflow-wrap: anywhere`), the date's figures keep a fixed width, and the
  loading cover has padding and sits above the overlays: no visible change on the solar system map.

## How to check

`python3 dev/check_styles.py`, then `python3 dev/check_pages.py --only asteroid-tracker/map --widths 375,390,1280`,
and the map by eye at 390 and 1280 px (full screen, the pan pad, the find box and the hint). No version tag change is
needed for the deletion beyond the usual raise when `tracker.css` changes.
