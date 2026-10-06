import { allBodiesAt, housesAt, dateToJd, norm360 } from './ephemeris.js';
import { localToUtcMs } from './time.js';

export const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

export const signIndex = (lon) => Math.floor(norm360(lon) / 30);

/** 1..12 house containing `lon`, given 12 ascending-around-the-circle cusps. */
export function houseOf(lon, cusps) {
  const l = norm360(lon);
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    const span = norm360(end - start);
    if (norm360(l - start) < span) return i + 1;
  }
  return 1;
}

function decorate(lon, speed, cusps) {
  return {
    lon,
    sign: signIndex(lon),
    degInSign: lon % 30,
    house: houseOf(lon, cusps),
    speed,
    retro: speed < 0,
  };
}

export const HOUSE_SYSTEMS = { W: 'Whole Sign', P: 'Placidus', E: 'Equal' };

/** Compute a full chart for a UTC instant at a place. */
export function buildChart({ jd, lat, lon, houseSystem = 'P' }) {
  const bodies = allBodiesAt(jd);
  const h = housesAt(jd, lat, lon);
  const { asc, mc } = h;
  let cusps = h.cusps;
  if (houseSystem === 'W') cusps = Array.from({ length: 12 }, (_, i) => ((signIndex(asc) + i) % 12) * 30);
  if (houseSystem === 'E') cusps = Array.from({ length: 12 }, (_, i) => norm360(asc + i * 30));
  const points = {};
  for (const [key, b] of Object.entries(bodies)) points[key] = decorate(b.lon, b.speed, cusps);
  points.asc = decorate(asc, 0, cusps);
  points.mc = decorate(mc, 0, cusps);
  points.dsc = decorate(norm360(asc + 180), 0, cusps);
  points.ic = decorate(norm360(mc + 180), 0, cusps);
  return { jd, lat, lon, cusps, asc, mc, points, houseSystem };
}

/** Natal chart from birth data (local time + IANA zone). */
export function natalFromBirth({ year, month, day, hour, minute, timeZone, lat, lon, houseSystem = 'P' }) {
  const ms = localToUtcMs({ year, month, day, hour, minute }, timeZone);
  return { ...buildChart({ jd: dateToJd(ms), lat, lon, houseSystem }), utcMs: ms };
}

/** Where a transiting longitude falls in the natal house system. */
export function natalHouseFor(natal, lon) {
  return houseOf(lon, natal.cusps);
}

export function formatPos(lon, { withSign = true } = {}) {
  const s = signIndex(lon);
  const d = lon % 30;
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  return `${deg}°${String(min).padStart(2, '0')}'${withSign ? ' ' + SIGN_NAMES[s] : ''}`;
}

/** For unknown birth times: whole-sign "solar" houses with the Sun's sign as the 1st house. */
export function withSolarHouses(chart) {
  const sun = signIndex(chart.points.sun.lon);
  const cusps = Array.from({ length: 12 }, (_, i) => ((sun + i) % 12) * 30);
  const points = {};
  for (const [k, p] of Object.entries(chart.points)) points[k] = { ...p, house: houseOf(p.lon, cusps) };
  return { ...chart, cusps, asc: sun * 30, mc: norm360(sun * 30 + 270), points };
}
