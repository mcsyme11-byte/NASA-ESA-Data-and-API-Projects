<p align="center"><img src="../../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Handoff: tap size of tag links and section-head links on phones

From the Asteroid Tracker chat to the General/Files/Repo chat, Nov 19, 2026.

## Finding

The page check (`dev/check_pages.py`, tap targets) reports links shorter than 40 px on phones (320, 375 and 390 px)
on an asteroid's page (`asteroid-tracker/object.html`). They were not reported before because the check's sample
asteroid (`?id=99942`) only ever showed the error state; since Nov 19, 2026 the sample is the first asteroid in the
daily copy, so the whole page is checked.

| Link | Component | Height on phones |
|---|---|---|
| "Show on the solar system map ›", "JPL's page ›" | `a.tag.link` (the tags under the page title) | 24 px |
| "Every asteroid within reach ›", "the rules and the maths ›" | `a.aside` in `.section-head` | 22 px |

## What is needed

Both are shared components in `shared/theme.css`, so the fix belongs there (project style sheets do not restyle a
shared component on its own). For example, in the phone rule that gives `.chip` and `.btn.small` their 40 px height
(`@media (max-width: 760px)`), add `a.tag.link` and `.section-head a.aside` with `display: inline-flex;
align-items: center; min-height: 40px`, then raise the version tag everywhere.

## Where it is recorded

- `dev/known_issues.json`: `asteroid-tracker/object.html`, check `tap`, owner General/Files/Repo.
- `docs/ROADMAP.md`, section 0.

Remove both in the change that fixes it.
