import { bodyAt, lonAt, norm360, jdToDate } from './ephemeris.js';
import { ASPECTS, TRANSITING, angDiff } from './aspects.js';
import { natalHouseFor, signIndex } from './chart.js';

const STEP = {
  moon: 0.25, sun: 1, mercury: 1, venus: 1, mars: 1,
  jupiter: 2, saturn: 2, uranus: 3, neptune: 3, pluto: 3, chiron: 3,
};

/** Sample longitudes of a body on a regular grid. */
function sample(key, jd0, jd1) {
  const step = STEP[key] ?? 1;
  const n = Math.ceil((jd1 - jd0) / step) + 1;
  const jds = new Float64Array(n);
  const lons = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    jds[i] = jd0 + i * step;
    lons[i] = lonAt(key, jds[i]);
  }
  return { jds, lons };
}

/** Bisect for the instant where body reaches `goal` longitude between jdA and jdB. */
function refine(key, goal, jdA, jdB) {
  let a = jdA;
  let b = jdB;
  let fa = angDiff(lonAt(key, a), goal);
  for (let i = 0; i < 28; i++) {
    const m = (a + b) / 2;
    const fm = angDiff(lonAt(key, m), goal);
    if (Math.sign(fm) === Math.sign(fa)) {
      a = m;
      fa = fm;
    } else b = m;
  }
  return (a + b) / 2;
}

/** All JDs where `series` crosses `goal` longitude. */
function crossings(key, series, goal) {
  const out = [];
  let prev = angDiff(series.lons[0], goal);
  for (let i = 1; i < series.lons.length; i++) {
    const cur = angDiff(series.lons[i], goal);
    if (Math.sign(prev) !== Math.sign(cur) && Math.abs(prev) < 60 && Math.abs(cur) < 60) {
      out.push(refine(key, goal, series.jds[i - 1], series.jds[i]));
    }
    prev = cur;
  }
  return out;
}

const SPAN_DAYS = {
  moon: 14, sun: 60, mercury: 60, venus: 90, mars: 200,
  jupiter: 500, saturn: 800, uranus: 1200, neptune: 1500, pluto: 1500, chiron: 1000,
};

/**
 * Exact dates of one transit aspect around `centerJd` (previous and upcoming),
 * plus the full run of passes (for retrograde triple-hits).
 */
export function aspectPasses(asp, centerJd) {
  const span = SPAN_DAYS[asp.transit] ?? 120;
  const series = sample(asp.transit, centerJd - span, centerJd + span);
  const goals = asp.angle === 0 || asp.angle === 180
    ? [norm360(asp.targetLon + asp.angle)]
    : [norm360(asp.targetLon + asp.angle), norm360(asp.targetLon - asp.angle)];
  const hits = goals.flatMap((g) => crossings(asp.transit, series, g)).sort((a, b) => a - b);
  return {
    all: hits,
    previous: [...hits].reverse().find((j) => j < centerJd) ?? null,
    next: hits.find((j) => j >= centerJd) ?? null,
  };
}

/**
 * Forecast events between two JDs relative to a natal chart:
 * exact transit aspects, stations, sign ingresses, lunar phases/eclipses.
 */
export function forecast(natal, jd0, jd1, { includeMoonAspects = false, minWeightBodies } = {}) {
  const events = [];
  const targets = ['sun', 'moon', 'asc', 'mc', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node', 'chiron'];
  const bodies = TRANSITING.filter((b) => (includeMoonAspects || b !== 'moon') && (!minWeightBodies || minWeightBodies.includes(b)));
  const series = {};
  for (const tk of bodies) series[tk] = sample(tk, jd0, jd1);

  // Exact aspects
  for (const tk of bodies) {
    for (const nk of targets) {
      const nl = natal.points[nk].lon;
      for (const asp of ASPECTS) {
        const goals = asp.angle === 0 || asp.angle === 180
          ? [norm360(nl + asp.angle)]
          : [norm360(nl + asp.angle), norm360(nl - asp.angle)];
        const hits = goals.flatMap((g) => crossings(tk, series[tk], g)).sort((a, b) => a - b);
        hits.forEach((jd, i) => {
          const b = bodyAt(tk, jd);
          events.push({
            type: 'aspect', jd, transit: tk, target: nk, aspect: asp.key, glyph: asp.glyph,
            tone: asp.tone, angle: asp.angle, retro: b.retro, house: natalHouseFor(natal, b.lon),
            pass: i + 1, passes: hits.length, transitLon: b.lon, targetLon: nl,
          });
        });
      }
    }
  }

  // Stations + ingresses
  for (const tk of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron']) {
    const step = Math.max(STEP[tk], 1);
    let prev = bodyAt(tk, jd0);
    for (let jd = jd0 + step; jd <= jd1; jd += step) {
      const cur = bodyAt(tk, jd);
      if (Math.sign(prev.speed) !== Math.sign(cur.speed)) {
        let a = jd - step; let b = jd;
        for (let i = 0; i < 24; i++) {
          const m = (a + b) / 2;
          if (Math.sign(bodyAt(tk, m).speed) === Math.sign(prev.speed)) a = m; else b = m;
        }
        const when = (a + b) / 2;
        const at = bodyAt(tk, when);
        events.push({
          type: 'station', jd: when, transit: tk, direction: cur.speed < 0 ? 'retrograde' : 'direct',
          lon: at.lon, sign: signIndex(at.lon), house: natalHouseFor(natal, at.lon),
        });
      }
      if (signIndex(prev.lon) !== signIndex(cur.lon) && Math.abs(angDiff(prev.lon, cur.lon)) < 30) {
        const sign = signIndex(cur.lon);
        const boundary = cur.speed < 0 ? signIndex(prev.lon) * 30 : sign * 30;
        const when = refine(tk, boundary % 360, jd - step, jd);
        events.push({
          type: 'ingress', jd: when, transit: tk, sign, retro: cur.speed < 0,
          house: natalHouseFor(natal, cur.lon),
        });
      }
      prev = cur;
    }
  }

  // Sun ingresses
  {
    const s = series.sun ?? sample('sun', jd0, jd1);
    for (let i = 1; i < s.lons.length; i++) {
      if (signIndex(s.lons[i - 1]) !== signIndex(s.lons[i])) {
        const sign = signIndex(s.lons[i]);
        const when = refine('sun', sign * 30, s.jds[i - 1], s.jds[i]);
        events.push({ type: 'ingress', jd: when, transit: 'sun', sign, house: natalHouseFor(natal, sign * 30 + 0.01) });
      }
    }
  }

  // Lunar phases (new/full) + eclipse flag by proximity to the nodes
  {
    const step = 0.5;
    const elong = (jd) => norm360(lonAt('moon', jd) - lonAt('sun', jd));
    for (const [goal, phase] of [[0, 'new'], [180, 'full']]) {
      let prev = angDiff(elong(jd0), goal);
      for (let jd = jd0 + step; jd <= jd1; jd += step) {
        const cur = angDiff(elong(jd), goal);
        if (Math.sign(prev) !== Math.sign(cur) && Math.abs(prev) < 60) {
          let a = jd - step; let b = jd;
          for (let i = 0; i < 28; i++) {
            const m = (a + b) / 2;
            if (Math.sign(angDiff(elong(m), goal)) === Math.sign(prev)) a = m; else b = m;
          }
          const when = (a + b) / 2;
          const moonLon = lonAt('moon', when);
          const nodeLon = lonAt('node', when);
          const toAxis = Math.min(Math.abs(angDiff(moonLon, nodeLon)), Math.abs(angDiff(moonLon, nodeLon + 180)));
          events.push({
            type: 'lunation', jd: when, phase, lon: moonLon, sign: signIndex(moonLon),
            house: natalHouseFor(natal, moonLon), eclipse: toAxis < 14,
          });
        }
        prev = cur;
      }
    }
  }

  return events.sort((a, b) => a.jd - b.jd);
}

export { jdToDate };

/** Moon phase name and illumination-ish description at a JD. */
export function moonPhase(jd) {
  const e = norm360(lonAt('moon', jd) - lonAt('sun', jd));
  const names = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
  return { elongation: e, name: names[Math.floor(((e + 22.5) % 360) / 45)] };
}
