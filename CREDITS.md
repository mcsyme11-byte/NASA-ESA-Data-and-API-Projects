# Credits

NASA and ESA Data Projects is created by **Malcolm Syme** (<mcsyme11@gmail.com>). The project's own code and documents are
released under the [MIT License](LICENSE.md). Everything below comes from others and keeps its own terms.

The same list appears on the site's Credits page. When a new data source or library is added, it is added here and
there in the same change.

## Data and imagery

| Source | Used for | Terms |
|---|---|---|
| NASA NeoWs (api.nasa.gov) | Asteroid Tracker: close approaches, sizes, the hazard flag | NASA data; generally not under copyright in the United States |
| NASA/JPL Solar System Dynamics: Close-Approach Data, Small-Body Database (orbits, spectral types, spin, albedo), Horizons, approximate planetary elements, Sentry, NHATS (round trips) | Asteroid Tracker: approaches, orbits, spacecraft and planet positions, NASA's impact-risk list, the positions behind "Visible from here", the round trips and spectral types on "Within reach"; spacecraft map: deep-space, Lagrange-point, Moon and Mars positions; Sky Finder: asteroid positions | NASA/JPL data |
| CelesTrak (celestrak.org): general perturbations orbital elements, the satellite catalogue (SATCAT), SOCRATES Plus close approaches | Spacecraft map: satellites in Earth orbit; Sky Finder: the space stations' passes; Orbit Watch: the objects on the globe, the heights of every catalogued object, the closest predicted passes | Published orbital data; credit "CelesTrak" |
| NASA Orbital Debris Program Office (orbitaldebris.jsc.nasa.gov): Orbital Debris Quarterly News, the NASA standard breakup model | Orbit Watch: the Satellite Box Score, past breakups, how long debris stays in orbit, the collision calculator | NASA material; credit "NASA Orbital Debris Program Office" |
| NASA Solar System Treks (trek.nasa.gov, JPL for NASA's Solar System Exploration Research Virtual Institute): Moon Trek and Mars Trek map tiles | Planetary Maps: the Moon (LRO photo, LOLA height, Apollo-site close-ups) and Mars (Viking photo, MOLA height, HiRISE and CTX close-ups of Jezero and Gale) | NASA mission data; credits "NASA/GSFC/Arizona State University" (LRO), "NASA/GSFC" (LOLA), "NASA/JPL/USGS" (Viking), "NASA/JPL/GSFC" (MOLA), "NASA/JPL-Caltech/University of Arizona" (HiRISE), "NASA/JPL-Caltech/MSSS" (CTX), with the Jezero mosaics made by the USGS |
| NASA/JPL "Where is the rover?" maps (mars.nasa.gov/mmgis-maps) | Planetary Maps: Curiosity's and Perseverance's routes and positions, copied daily | NASA material; credit "NASA/JPL-Caltech" |
| IAU Working Group for Planetary System Nomenclature (Gazetteer of Planetary Nomenclature, kept by the USGS), through NASA Solar System Treks | Planetary Maps: the official names of craters, mountains, valleys and plains | Public names; credit the IAU Working Group |
| NASA GIBS (Global Imagery Browse Services), including Blue Marble | Image Explorer: the Earth map, the polar views, the globe's surface | NASA imagery; acknowledgement required (below) |
| NASA Image and Video Library | Image Explorer: the picture library | NASA material; some items carry their own credit or rights, shown with each item |
| NASA EONET (Earth Observatory Natural Event Tracker) | Image Explorer: events on the globe | NASA data |
| Gateway to Astronaut Photography of Earth, Earth Science and Remote Sensing Unit, NASA Johnson Space Center | Image Explorer: astronaut photos on the globe | NASA material; credit the unit |
| d3-celestial, © 2015 Olaf Frohn | Image Explorer: stars, galaxies, nebulae, clusters and constellations; Sky Finder: bright stars and their names (Hipparcos catalogue), `sky-finder/data/stars.json` | BSD 3-Clause, kept as `image-explorer/data/LICENSE-d3-celestial.txt` |
| GeoNames (geonames.org), through the `all-the-cities` package (MIT) and GeoNames' own downloads | Image Explorer, the Asteroid Tracker's "Visible from here" and Sky Finder: place search (towns, cities, capitals; smaller natural features with an English Wikipedia article; the globe's volcanoes and natural wonders) | GeoNames: Creative Commons Attribution 4.0 |
| Natural Earth (naturalearthdata.com) | Image Explorer: mountains, lakes and rivers in place search; the Earth map's coastlines, borders, rivers and names; the country of a tapped spot | Public domain |
| US Geological Survey earthquake feed (earthquake.usgs.gov) | Image Explorer: the globe's earthquakes of the past week | Public domain (US Government) |
| NASA Planetary Data System, Atmospheres Node: Perseverance's Mars Environmental Dynamics Analyzer (MEDA), Mars 2020 MEDA derived data (DOI 10.17189/1522849) | Mars Data: pressure, humidity and the rover's height at Jezero Crater (the two-craters comparison) | NASA data; credit "NASA/JPL-Caltech and the MEDA team (Centro de Astrobiología), NASA Planetary Data System" |
| NASA Planetary Data System, Atmospheres Node: Curiosity's Rover Environmental Monitoring Station (REMS), data sets MSL-M-REMS-5-MODRDR-V1.0, MSL-M-REMS-6-ADR-V1.0 and MSL-M-REMS-5-UVRDR-V1.0 | Mars Data: pressure, air and ground temperature, humidity, ultraviolet and the rover's height, sol by sol | NASA data; credit "NASA/JPL-Caltech and the REMS team (Centro de Astrobiología), NASA Planetary Data System"; citations in `docs/DATA-SOURCES.md` |
| NASA Community Coordinated Modeling Center (CCMC): DONKI, the Space Weather Database Of Notifications, Knowledge, Information (ccmc.gsfc.nasa.gov/DONKI-API), from the Moon to Mars Space Weather Analysis Office | Space Weather: flares, coronal mass ejections, geomagnetic storms, particle events and the WSA–ENLIL model runs that expect a CME at Earth | NASA research data, described by NASA as preliminary "Experimental Research Information"; NOAA's Space Weather Prediction Center is the official U.S. source of space weather forecasts, as the page says |
| NASA CCMC iSWA (Integrated Space Weather Analysis, iswa.gsfc.nasa.gov), HAPI service | Space Weather: the live readings below, passed on by NASA | NASA service; each reading credited to its own source |
| NASA IMAP (Interstellar Mapping and Acceleration Probe), I-ALiRT real-time data, through NASA CCMC iSWA | Space Weather: solar wind speed and density, and the magnetic field (Bz), over 24 hours | Public (CC0, per NASA's CDAWeb records); acknowledgement of the IMAP Mission Principal Investigator, Prof. David J. McComas of Princeton University |
| NASA Solar Dynamics Observatory (SDO), the latest pictures (sdo.gsfc.nasa.gov) | Space Weather: the Sun in visible light, its magnetic field and three ultraviolet wavelengths | NASA material; credit "NASA/SDO and the AIA, EVE, and HMI science teams" |
| GFZ Helmholtz Centre for Geosciences: the Kp index (nowcast), through NASA CCMC iSWA (approved Nov 17, 2026) | Space Weather: Kp measured over the last 7 days, and Kp now | CC BY 4.0; credit "GFZ Helmholtz Centre for Geosciences" (Matzka et al., 2021, doi:10.5880/Kp.0001) |
| NOAA Space Weather Prediction Center (approved Nov 17, 2026): GOES X-ray flux and the 3-day Kp forecast through NASA CCMC iSWA; the OVATION aurora forecast map (services.swpc.noaa.gov) | Space Weather: the strongest flare in 24 hours, the Kp forecast, the aurora map, the G and R scale names | US Government information, public domain; acknowledgement "Information from the Space Weather Prediction Center, Boulder, CO, National Oceanic and Atmospheric Administration (NOAA), US Dept. of Commerce" |
| NOAA National Centers for Environmental Information, World Magnetic Model 2025 | Space Weather: the geomagnetic pole (80.85° N, 72.76° W) behind each place's geomagnetic latitude | US Government information, public domain |
| NASA Exoplanet Archive (exoplanetarchive.ipac.caltech.edu): the Planetary Systems Composite Parameters table, and its time series of 51 Pegasi's radial velocities (Butler et al. 2006) and the microlensing event OGLE-2005-BLG-390 | Exoplanets: every confirmed planet and its star, the counts and charts, the radial-velocity and microlensing measurements | NASA data; acknowledgement "This research has made use of the NASA Exoplanet Archive, which is operated by the California Institute of Technology, under contract with the National Aeronautics and Space Administration under the Exoplanet Exploration Program" |
| NASA TESS and Kepler light curves (PDCSAP flux), from MAST, the Mikulski Archive for Space Telescopes at the Space Telescope Science Institute (archive.stsci.edu; run for NASA, counted as a NASA source, decided Nov 17, 2026) | Exoplanets: the transit light curves of HD 209458, Kepler-10 and TOI-700 | NASA mission data; credit "obtained from the Mikulski Archive for Space Telescopes (MAST) at the Space Telescope Science Institute"; funding for the TESS and Kepler missions is provided by NASA |
| Habitable-zone rules: the NASA Exoplanet Exploration Program's target list for the Habitable Worlds Observatory (Mamajek & Stapelfeldt 2023), and Kopparapu et al. (2013, ApJ 765, 131; 2014, ApJL 787, L29) | Exoplanets: whether each planet is in the habitable zone, under NASA's rule and with the star's temperature | Published methods, cited where they are used |
| GitHub Actions run history (api.github.com) | The live data status in every footer and on How the data is collected: which of the site's own data updates ran, when, and whether they worked | The project's own records on GitHub, read without a key under GitHub's terms of service |

**GIBS acknowledgement** (NASA asks every user of GIBS to show it): We acknowledge the use of imagery provided by
services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System
(ESDIS).

## ESA (the European Space Agency)

Decided Nov 9, 2026: ESA data and imagery are added alongside NASA's where they help. Each ESA source is listed here,
with its exact credit line, in the same change that adds it, and ESA's credit is shown wherever its data appears.

| Source | Used for | Terms |
|---|---|---|
| ESA Space Debris Office (ESOC): Space Environment Report 2026 (esa.int) and Space Environment Statistics (sdup.esoc.esa.int/discosweb/statistics), with the MASTER-8 estimates | Orbit Watch: objects tracked, working satellites, mass in orbit, the estimate of small pieces, the report's findings | ESA's terms for educational and informational use; credit "ESA Space Debris Office"; figures only, ESA's charts are not copied |
| ESA/Webb picture and video archives (esawebb.org) | Image Explorer: Picture library and the globe's pictures, beside NASA's | CC BY 4.0 (esawebb.org/copyright); each picture's own credit line, shown in full with it, for example "NASA, ESA, CSA, STScI. Image Processing: J. Depasquale (STScI)"; captions credited to ESA/Webb |
| ESA/Hubble picture and video archives (esahubble.org) | Image Explorer: Picture library and the globe's pictures, beside NASA's | CC BY 4.0 (esahubble.org/copyright); each picture's own credit line, shown in full with it, for example "NASA, ESA, and STScI"; captions credited to ESA/Hubble |
| ESA Mars Express High Resolution Stereo Camera (HRSC), heights blended with NASA's MOLA, served by NASA's Mars Trek | Planetary Maps: the Mars "Sharper" height map | CC BY-SA 3.0 IGO; credit "ESA/DLR/FU Berlin, CC BY-SA 3.0 IGO" |
| SOHO (Solar and Heliospheric Observatory, ESA and NASA), LASCO C2 and C3 coronagraph pictures (soho.nascom.nasa.gov) | Space Weather: clouds of solar gas leaving the Sun | Free for education and non-commercial use; credit "SOHO (ESA & NASA)", "Courtesy of SOHO/LASCO consortium. SOHO is a project of international cooperation between ESA and NASA." |
| ESA Gaia (approved Nov 17, 2026; to be added after Gaia Data Release 4, due Dec 2, 2026): the exoplanet candidate catalogue, from the Gaia Archive (gea.esac.esa.int) | Exoplanets: planet candidates found by astrometry, shown apart from the confirmed planets | CC BY-NC 3.0 IGO (non-commercial use); credit "ESA/Gaia/DPAC" |
| ESA NEO Coordination Centre (NEOCC, neo.ssa.esa.int): risk list, special risk list, close approaches | Asteroid Tracker: ESA's impact-risk list beside NASA's, and ESA's close-approach distances | ESA's terms for educational and informational use; credit "ESA NEO Coordination Centre (©ESA)" |

**ESA's terms:** some ESA images, videos and other works are released, where expressly stated, under the Creative
Commons Attribution-ShareAlike 3.0 IGO licence (CC BY-SA 3.0 IGO): the source is credited in ESA's own form (for
example "ESA/DLR/FU Berlin, CC BY-SA 3.0 IGO"), the licence is linked, changes are marked, and changed versions are
shared under the same licence. Other material on ESA's website may be used for educational and informational purposes
with ESA's credit (ESA's terms and conditions, esa.int). ESA's logo is not used: it needs ESA's written permission.

## Code libraries (copies kept in the repository, `shared/vendor/`, each with its licence file)

| Library | Version | Used for | Licence |
|---|---|---|---|
| OpenLayers (`ol`) | 10.11.0 | Flat maps (`shared/flatmap.js`): the Image Explorer's Earth map, the Planetary Maps of the Moon and Mars | BSD 2-Clause |
| proj4js (`proj4`) | 2.22.0 | Image Explorer: the polar map projections, the Planetary Maps' north and south poles | MIT |
| three.js (`three`) | 0.187.0 | Globes (`shared/globe.js`): the Image Explorer's globe, the Planetary Maps' Moon and Mars; Orbit Watch's globe | MIT |
| satellite.js, © 2013 Shashwat Kandadai | 7.2.0 | Spacecraft map, Sky Finder and Orbit Watch: satellite positions from orbital elements (SGP4); bundled as an ES module, `shared/vendor/satellite.min.js`, licence `shared/vendor/LICENSE-satellite.js.md` | MIT |

Analysis tools (run on GitHub's servers to prepare data; not sent to visitors): pandas (BSD 3-Clause), for the Mars
Data cleaning and statistics in `mars-data/analysis/`; NumPy (BSD 3-Clause), Astropy (BSD 3-Clause) and astroquery (BSD 3-Clause), for the Exoplanets light curves in
`exoplanets/tools/build_series.py`.

## NASA and ESA

Data courtesy of NASA and ESA. This is an independent project and is not endorsed by NASA or ESA. ESA's logo is not
used. The spacecraft map names missions of other agencies (JAXA, ISRO, CNSA, CMSA, CSA, KASA, the UAE Space Agency and
others) and links to their pages; no agency's logo is used and none endorses the project. NASA's insignia ("meatball"),
logotype ("worm") and seal are not used.

---

**NASA and ESA Data Projects** · Created by **Malcolm Syme** · <mcsyme11@gmail.com>
