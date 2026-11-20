<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff: a failed picture inside a link keeps its frame (Nov 18, 2026)

From the Planetary Maps chat to the General chat. Found by eye in the page check's screenshots of
`planet-maps/index.html` (docs/CHECKS.md, step 3); the page check passed it.

## What happened

The Gale and Jezero cards show an ESA picture as `figure.pmpic > a > img` (the picture links to its ESA page). In the
page check's browser ESA cannot be reached, and the card showed the picture's description in an empty frame with its
caption, against rule 10 ("Rules learned from the review of Nov 18, 2026").

## Cause

`shared/footer.js` marks the failed picture `img-failed`, and `shared/theme.css` (line 646) hides
`img.img-failed, figure:has(> img.img-failed)`. The `>` only matches a picture that is a direct child of its figure, so
a figure whose picture sits inside a link keeps its frame and caption.

## Done in Planetary Maps

`planet-maps/app.js` hides the figure itself when its picture fails (commit "Planetary Maps: an ESA picture that
cannot be loaded is hidden with its figure"). Nothing is waiting on Planetary Maps.

## Suggested for the General chat (the check owner)

1. `shared/theme.css`: also hide a figure whose picture is deeper inside it, for example `figure:has(img.img-failed)`
   (then version tags raised as usual).
2. `dev/check_pages.py`: flag a visible `img` with `naturalWidth` 0 after loading, or a visible `figure` whose `img`
   failed, so the check catches this case itself (CLAUDE.md: when a step finds something a check let through, the
   check is extended). The page check runs without NASA's and ESA's servers, so a failed outside picture is a normal
   state there and tests exactly this.
