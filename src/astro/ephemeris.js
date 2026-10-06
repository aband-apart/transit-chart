import SwissEph from 'swisseph-wasm';

// Bodies we compute. `swe` is the Swiss Ephemeris body number.
export const BODIES = [
  { key: 'sun', swe: 0 },
  { key: 'moon', swe: 1 },
  { key: 'mercury', swe: 2 },
  { key: 'venus', swe: 3 },
  { key: 'mars', swe: 4 },
  { key: 'jupiter', swe: 5 },
  { key: 'saturn', swe: 6 },
  { key: 'uranus', swe: 7 },
  { key: 'neptune', swe: 8 },
  { key: 'pluto', swe: 9 },
  { key: 'chiron', swe: 15 },
  { key: 'node', swe: 11 }, // true north node
  { key: 'lilith', swe: 12 }, // mean black moon
];

const BY_KEY = Object.fromEntries(BODIES.map((b) => [b.key, b]));

let swe = null;
let FLAGS = 0;

export async function initEphemeris(options = {}) {
  if (swe) return swe;
  swe = new SwissEph();
  await swe.initSwissEph(options.wasmUrl);
  FLAGS = swe.SEFLG_SWIEPH | swe.SEFLG_SPEED;
  return swe;
}

export const norm360 = (x) => ((x % 360) + 360) % 360;

/** JS Date (or ms) -> Julian day (UT). */
export const dateToJd = (d) => (d instanceof Date ? d.getTime() : d) / 86400000 + 2440587.5;
export const jdToDate = (jd) => new Date((jd - 2440587.5) * 86400000);

/** Longitude + speed of one body. */
export function bodyAt(key, jd) {
  const r = swe.calc_ut(jd, BY_KEY[key].swe, FLAGS);
  return { lon: norm360(r[0]), lat: r[1], speed: r[3], retro: r[3] < 0 };
}

export function lonAt(key, jd) {
  return norm360(swe.calc_ut(jd, BY_KEY[key].swe, FLAGS)[0]);
}

export function allBodiesAt(jd) {
  const out = {};
  for (const b of BODIES) out[b.key] = bodyAt(b.key, jd);
  return out;
}

/** Placidus houses. cusps[0..11] = houses 1..12 */
export function housesAt(jd, lat, lon, system = 'P') {
  const { cusps, ascmc } = swe.houses(jd, lat, lon, system);
  return {
    cusps: Array.from(cusps).slice(1, 13).map(norm360),
    asc: norm360(ascmc[0]),
    mc: norm360(ascmc[1]),
  };
}
