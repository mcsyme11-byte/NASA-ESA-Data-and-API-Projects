# Handoff, Nov 18, 2026: site-wide review and the check before every push (all chats)

**Read first. Pull, then run `sh dev/setup.sh` once in your copy of the repository.**

## 1. The check before every push

`git push` now runs `.githooks/pre-push`: `dev/check_wording.py`, `dev/check_styles.py`, `dev/check_docs.py` and
`dev/check_pages.py --changed` (the pages your push changes, all pages when `shared/` changed, at 375 and 1280 px). A
failing push is fixed, never forced (`--no-verify` is not used). GitHub's Checks also opens every page after each push.
The full procedure and the 18 rules learned from the review are in `docs/CHECKS.md`; read "Rules learned from the
review of Nov 18, 2026" before changing a page.

New in the page check: skipped heading levels, phone table values without labels, links in text not underlined,
`aria-selected` outside tabs and options, `aria-expanded` on table rows, empty table headings, layout shift over 0.1
while a page loads, and weight budgets. A finding that belongs to another chat goes to it as a handoff and into
`dev/known_issues.json` (shown as known, not failing) and `docs/ROADMAP.md`.

## 2. Fixed in project folders (for the owners' information)

- **Asteroid Tracker:** view buttons and Within reach's material buttons use `aria-pressed` only; table rows lost
  `aria-expanded` (risk rows use `aria-selected`); placeholder tiles in `tracker.html` (week, year, risk) and
  `mining.html`; Within reach's material buttons written into the page; Within reach's cells carry `data-label`;
  hidden view headings (`h2.sr`) for This week and By year; table links' tap area no longer applies to buttons.
- **Image Explorer:** the globe (`globe.js`, three.js) loads only when the Globe tab opens (the loader at the end of
  `explore.html`; `globe.js` starts itself when loaded late); view buttons use `aria-pressed` only; the globe is a
  labelled region.
- **Mars Data:** the charts page marks loading with `aria-busy` on `main`, not the shared `loading` class (it drew
  placeholder lines above the page head and made the page jump).
- **Orbit Watch:** the globe draws only while on the screen and moves its dots up to ten times a second
  (`placeNow` forces a move after a time jump, new positions or a filter change); CelesTrak's "[+]" codes removed from
  names on Close calls; the "Watch" column has a hidden heading; the fact, step headings are h3.
- **Space Weather:** fact headings are h3; a longer placeholder on the "Readings to …" line.
- **Planetary Maps:** placeholder stats in the page; the World tabs use `aria-selected` only.
- **Spacecraft map:** the list is a labelled group of buttons; the view buttons always sit on their own row.
- **Sky Finder:** the bottom bar is solid behind its button; the install panels wrap their lists.

## 3. Waiting with the Asteroid Tracker chat

Layout shift on Sky Finder (the place panel opens after the stored place is read) and on an asteroid's page (facts
and orbit drawn late): listed in `dev/known_issues.json` and the roadmap.
