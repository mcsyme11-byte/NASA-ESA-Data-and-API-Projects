# Handoff: reading progress and motion on every page (Nov 18, 2026)

For every chat. Requested by the developer on Nov 18, 2026 and built in `shared/` (theme and one new script), so no
page needed changing.

## Confirmed answers (Nov 18, 2026)

- `shared/footer.js` now loads `shared/motion.js` on every page. It adds:
  - **Reading progress:** a thin brass line along the foot of the top bar (`.readbar`), filled as far as the page has
    been read; only on pages longer than a screen and a half.
  - **Back to top:** a round button at the bottom right (`button.totop`), shown after a screen and a half of
    scrolling, with a ring that fills with the same progress.
  - **Gliding tabs:** on every row of `.tabs`, one brass underline glides to the current tab
    (`[aria-selected="true"]` or `[aria-current]`). It follows changes to those attributes by itself; a page needs no
    code for it.
  - **Rising sections:** each `main .section` below the first screen fades up gently the first time it shows.
- **Left out of:** the legal, professional and technical pages (Legal, Privacy, Terms, Credits, Contact, About, How
  the data is collected, the component page, the control room, Mars Data's method page) and Sky Finder (a phone app
  with its own controls), listed in `SKIP` in `shared/motion.js`. Any other page can opt out with
  `<body data-nomotion>`. Gliding tabs apply everywhere.
- Visitors who ask their device for less motion get the progress line and the button without animation, and no
  rising sections. Nothing of it prints.
- **For pages with a fixed control at the bottom right** (a map's buttons, for example): check that the Back to top
  button does not cover it; if it does, add `data-nomotion` to the page's `<body>` or tell the General chat.
- Version tag raised to 2026111805.
