<p align="center"><img src="../brand/patch/nedap-patch.svg" width="72" alt="The NEDAP mission patch"><br><sub>NASA and ESA Data Projects · © 2026 Malcolm Syme · <a href="mailto:mcsyme11@gmail.com">mcsyme11@gmail.com</a></sub></p>

# Exoplanets

Part of **Orbit & Space Watch** (`space-watch/`). How astronomers find planets around other stars, shown with real
measurements, and every confirmed planet from the NASA Exoplanet Archive. Live since Nov 17, 2026, built from the mock-up
approved that day.

## Pages

| Page | What it shows |
|---|---|
| `index.html` (Overview) | The counts; the six methods; the transit method step by step with real light curves (HD 209458 b and TOI-700 d from TESS, Kepler-10 b from Kepler, WASP-189 b from ESA's CHEOPS), "From the dip to the planet" worked from the TOI-700 d curve, and "Make a transit"; "Which formula to use when", the rules with a real example each; mass against year length and planets confirmed each year, by method; the nearest planets about Earth's size in the habitable zone |
| `methods.html` (How they are found) | Radial velocity (51 Pegasi's 256 published velocities, the fitted wobble and the minimum mass worked from it), microlensing (the event OGLE-2005-BLG-390 and its planet's blip), direct imaging (Webb's picture of HR 8799's four planets with how far apart each looks, separation on the sky, contrast; the imaged planets widest on the sky), astrometry (the star's loop, ESA's Gaia; the planets found by astrometry), timing (pulsars, transit and eclipse timing) |
| `explorer.html` (Every planet) | Every confirmed planet with search, method filter, "Habitable zone" and "About Earth's size", and sorting; `explorer.html?p=<name>` opens one planet: its system to scale with the habitable zone, the sums behind its verdict, its star, and where it is in the sky (a star map of the 60° around it, the best month to look, how high it rises from four latitudes, and whether the eye, binoculars or a telescope is needed) |

Scripts: `data.js` (loading, methods, the habitable-zone rules), `charts.js` (SVG charts drawn at the frame's width),
`overview.js`, `methods.js`, `explorer.js`. Style sheet: `exoplanets.css` (only the labels over charts, the method
shapes in the keys, the planet list's selectable rows and the worked sums).

## Data

| File | Built by | From |
|---|---|---|
| `data/planets.json` | `fetch_planets.py` (standard library only) | NASA Exoplanet Archive, `pscomppars` |
| `data/summary.json` | `fetch_planets.py` | the same: counts, discoveries by year, habitable-zone counts |
| `data/series/*.json` | `tools/build_series.py` (NumPy, Astropy, astroquery, dace-query) | MAST (TESS and Kepler light curves); DACE, University of Geneva (CHEOPS light curves, public mode, no key); the archive's time series (51 Pegasi, OGLE-2005-BLG-390) |
| `art/hr8799-webb.jpg` | `tools/get_pictures.py` (standard library only) | ESA/Webb, picture `weic2504a` (1280 × 1280) |
| `../sky-finder/data/stars.json` (read, not copied) | Sky Finder | the bright stars of the Hipparcos catalogue, from d3-celestial |

The archives send no CORS headers, so web pages never call them. Both scripts run on GitHub's servers through the
workflow "Exoplanets data, built by hand" (`.github/workflows/exoplanets-build.yml`, run by hand only). The weekly
refresh of `planets.json` is a scheduled data job requested from the Data updates chat (handoff
`docs/handoffs/2026-11-17 - data updates - Exoplanets data.md`). The light curves and the other measurements do not
change and are rebuilt only when a target is added. Sources, limits and credit lines: `docs/DATA-SOURCES.md`,
"Exoplanets".

## Rules the pages teach

| If you know | You can find | Formula |
|---|---|---|
| Transit depth δ, star's radius R★ | Planet's radius | Rp = R★ × √δ |
| Period P (years), star's mass M★ (Suns) | Orbit size a (au) | a = ∛(M★ × P²) |
| Star's luminosity L (Suns), orbit a (au) | Starlight S (Earth = 1) | S = L ÷ a² |
| Starlight S | Habitable zone, NASA's rule | 0.359 ≤ S ≤ 1.108 (0.95 to 1.67 au for a Sun-like star, scaled by √L; NASA Exoplanet Exploration Program) |
| Starlight S, star's temperature T | Habitable zone for a cool or hot star | S_out(T) ≤ S ≤ S_in(T), Kopparapu et al. (2014), 2,600 to 7,200 K |
| Wobble K (m/s), P (years), M★ (Suns) | Minimum mass (Jupiter masses) | Mp sin i = K ÷ 28.4 × M★^(2/3) × P^(1/3) |
| Star's radius, orbit a | Chance of a transit | p ≈ R★ ÷ a |
| Masses, orbit a (au), distance d (pc) | Star's loop on the sky (arcseconds) | α = (Mp ÷ M★) × a ÷ d |
| Orbit a (au), distance d (pc) | Separation of an imaged planet (arcseconds) | θ = a ÷ d |
| Star's declination δ, your latitude φ | Highest the star rises | 90° − \|φ − δ\| (below 0: never rises) |
| Star's right ascension (hours) | Best month to look | the month the Sun's right ascension is 12 h away (Sun at 0 h about Mar 20, then about +2 h a month) |

"About Earth's size": a measured radius of 0.5 to 1.6 Earths, or, for a planet with no measured radius, a mass of 0.1
to 3 Earths. Radii the archive estimates from a mass are marked as estimates and not used for this.

## Credits

Planet data: NASA Exoplanet Archive, operated by the California Institute of Technology under contract with NASA under
the Exoplanet Exploration Program. Light curves: NASA's TESS and Kepler missions, obtained from the Mikulski Archive for
Space Telescopes (MAST) at the Space Telescope Science Institute; ESA's CHEOPS mission (CHEOPS is an ESA mission in partnership with Switzerland), public data processed by the CHEOPS Data Reduction Pipeline (Hoyer et al. 2020), from DACE, the Data & Analysis Center for Exoplanets at the University of Geneva (NCCR PlanetS), CC BY-NC 3.0 IGO. Picture of HR 8799: NASA, ESA, CSA, STScI, W. Balmer (JHU), L. Pueyo (STScI), M. Perrin (STScI), CC BY 4.0, from ESA/Webb. Bright stars: the Hipparcos catalogue, from d3-celestial (BSD 3-Clause, © 2015 Olaf Frohn). Gaia (planned): ESA/Gaia/DPAC, CC BY-NC 3.0 IGO.

© 2026 Malcolm Syme · mcsyme11@gmail.com
