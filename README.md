# Transit Chart

A local astrology tool: enter your birth details, see today's planets move through your natal chart on a bi-wheel, and read an astrologer-style interpretation with guidance, tips and a forecast.

Everything runs in your browser. Positions come from the Swiss Ephemeris (compiled to WebAssembly), and your birth data is stored only in `localStorage`. The one network call is the optional place lookup, which sends just the city name to [Open-Meteo's geocoder](https://open-meteo.com/en/docs/geocoding-api).

## Run it

The page must be served over http. Opening `index.html` directly (a `file://` address) won't work, because browsers block ES modules and the WebAssembly fetch there.

```bash
npm install
npm start        # build, serve and open the browser
npm run dev      # http://localhost:5173
npm test         # ephemeris, time-zone, aspect and forecast checks
npm run build    # static site in dist/
```

Add `?demo=1` to the URL to load an example chart, or `?demo=2&tab=compare` for two example charts side by side.

## What you get

- **Bi-wheel**: natal chart inside (Whole Sign by default, with Placidus or Equal selectable, tropical zodiac), transiting planets outside, aspect lines coloured by tone. Click a line to read it. Scrub ±1 year to watch transits move.
- **Reading**: the overall climate, the strongest transits with exact dates and retrograde re-passes, slow planets by house, and do / mind tips.
- **Active transits**: every aspect currently in orb, ranked by weight.
- **Forecast**: exact aspects, stations, sign changes, new/full moons and eclipses (mapped to your houses) for 30–365 days.
- **Natal chart**: big three, element/modality balance, positions and house cusps.

- **Multiple charts and Compare**: save people, countries/places and events/organizations, switch between them (transits to a country's chart work the same way), and pick "Compare with" for a two-chart wheel, cross-aspects, themes and house overlays. Slow outer-planet pairs are skipped because whole generations share them.

Unknown birth time is supported: houses fall back to Sun-sign whole houses and Asc/MC are omitted.

## Editing the astrologer's voice

All interpretive text lives in [`src/data/astro-data.js`](src/data/astro-data.js) and is composed by [`src/astro/interpret.js`](src/astro/interpret.js). Orbs and ranking weights are in [`src/astro/aspects.js`](src/astro/aspects.js).

## Publish to GitHub Pages

The workflow in `.github/workflows/pages.yml` tests, builds and deploys on every push to `main`. In the repo settings, set **Pages → Source** to **GitHub Actions**. If you publish a public site, remember it is a static page: each visitor enters their own data in their own browser.

## Licence note

The Swiss Ephemeris is dual-licensed (AGPL / commercial) by Astrodienst, and `swisseph-wasm` is GPL-3.0. That is fine for a personal or open-source project; check the terms before using it commercially.

Astrology is a framework for reflection. Read the predictions as tendencies, not certainties.
