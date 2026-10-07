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
npm run build    # static site in dist/ (also emits sw.js for the offline cache)
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

## First visit and chart setup

A first visit shows a live example wheel and three actions: **Create my chart**, **Explore an example chart** (nothing is saved) and **Import saved charts**. Controls that need a chart stay hidden until one exists. Creating a chart is a short guided flow (date and time, place, review); place search fills in coordinates and the time zone, and manual coordinates, time zone and house system live under **Advanced options**.

## Reading and forecast

The **Reading** opens with an at-a-glance summary (climate, strongest transit, focus houses, Moon, retrogrades, what's coming), then the most important transits as expandable rows (the first one open), with the longer sections collapsed. The **Forecast** is a timeline grouped by week (up to 90 days) or month, with a colour-coded type badge on each event. Open any event for its detail and use **Show on chart** to move the chart to that date; the list stays where it was until you choose **Follow the chart date**. On phones the filters live in a **Filters** sheet. On desktop the wheel and date control stay in view while you scroll, sized to fit the window.

## Exploring the chart

Tap a planet to light up everything touching it (the rest fades), or tap a line to read that one aspect. On phones there is also a list of the current aspects under the wheel with larger tap targets. **What am I looking at?** explains the rings, houses, symbols and line colours. The date control shows the selected day with previous/next and Today; the slider and date picker open under **Adjust date and time**. Motion is subtle and switches off for people who prefer reduced motion.

## Saved charts, backups and wording

Each chart has a type: **Me** (readings say "you"), **Another person** (their name and "they", advice written about them), or **Country/place** and **Event/organization** (the name and "it", never treated as a person).

**⋯ Manage charts** lets you:
- **Export** all saved charts to a JSON backup (it contains birth details, so keep it private).
- **Import** a backup with a preview first: new charts, skipped duplicates, and any that can't be imported (with reasons). Choose **Merge** (keep mine, add new) or **Replace** (an explicit second confirmation, with an option to export a backup first). Files are validated and rebuilt from known fields only.
- **Delete all charts in this browser** after a confirmation that shows how many are affected and offers an export. This returns the app to its first-visit state. It doesn't touch other browsers/devices or exported files.

## On your phone

The page has a dedicated phone layout: a bottom tab bar (Chart, Reading, Transits, Forecast, Natal, Compare), a wheel with larger glyphs and tap-friendly lines (tap a line to read it under the wheel), collapsible sections, and a bottom-sheet form with touch-sized inputs.

Open the published site, then **Add to Home Screen** (iPhone: Share → Add to Home Screen; Android: menu → Install app). It opens full screen with its own icon, and after the first visit the app and ephemeris are cached so it opens quickly and works offline (place lookup still needs a connection). Your charts are stored only in that phone's browser and don't sync with your computer.

## Voice

Everything the app says follows [`docs/voice-guide.md`](docs/voice-guide.md): warm, concrete, honest about uncertainty, tendencies and invitations rather than promises, with plain facts left plain. `tests/voice-quality.test.js` generates complete readings for all four chart types across several skies and checks them for unsupported certainty, unhedged outcome claims, stacked hedges, hedge density and repetition (`src/lib/voice-lint.js`). The checks are a safety net, so read the output as well: the guide has a review checklist.

## Editing the astrologer's voice

All interpretive text lives in [`src/data/astro-data.js`](src/data/astro-data.js) and is composed by [`src/astro/interpret.js`](src/astro/interpret.js). Orbs and ranking weights are in [`src/astro/aspects.js`](src/astro/aspects.js).

## Publish to GitHub Pages

The workflow in `.github/workflows/pages.yml` tests, builds and deploys on every push to `main`. In the repo settings, set **Pages → Source** to **GitHub Actions**. If you publish a public site, remember it is a static page: each visitor enters their own data in their own browser.

## Licence note

The Swiss Ephemeris is dual-licensed (AGPL / commercial) by Astrodienst, and `swisseph-wasm` is GPL-3.0. That is fine for a personal or open-source project; check the terms before using it commercially.

Astrology is a framework for reflection. Read the predictions as tendencies, not certainties.
