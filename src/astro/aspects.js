import { norm360 } from './ephemeris.js';

export const ASPECTS = [
  { key: 'conjunction', angle: 0, glyph: '☌', tone: 'intense', weight: 1.0, orbMul: 1.0 },
  { key: 'opposition', angle: 180, glyph: '☍', tone: 'challenging', weight: 0.9, orbMul: 1.0 },
  { key: 'square', angle: 90, glyph: '□', tone: 'challenging', weight: 0.85, orbMul: 0.9 },
  { key: 'trine', angle: 120, glyph: '△', tone: 'flowing', weight: 0.7, orbMul: 0.9 },
  { key: 'sextile', angle: 60, glyph: '⚹', tone: 'flowing', weight: 0.5, orbMul: 0.6 },
];

// Maximum orb (degrees) by transiting body for a conjunction.
const TRANSIT_ORB = {
  moon: 1.5, sun: 3, mercury: 2, venus: 2, mars: 3,
  jupiter: 4, saturn: 4, uranus: 3, neptune: 3, pluto: 3, chiron: 2,
};

// How much a transiting body matters when ranking.
export const TRANSIT_WEIGHT = {
  pluto: 10, neptune: 9, uranus: 9, saturn: 9, jupiter: 7, chiron: 5,
  mars: 4, sun: 3.5, venus: 3, mercury: 2.5, moon: 1.5,
};

// Natal points that can be "hit" by transits, with ranking weight.
export const NATAL_TARGETS = {
  sun: 10, moon: 10, asc: 10, mc: 9, mercury: 6, venus: 6, mars: 6,
  jupiter: 5, saturn: 5, uranus: 4, neptune: 4, pluto: 4, node: 4, chiron: 4,
};

export const TRANSITING = Object.keys(TRANSIT_ORB);

/** Signed shortest angular difference a - b in (-180, 180]. */
export function angDiff(a, b) {
  let d = norm360(a - b);
  if (d > 180) d -= 360;
  return d;
}

/**
 * Transit-to-natal aspects for a set of transiting positions.
 * @param {Record<string,{lon:number,speed:number}>} transit
 * @param {Record<string,{lon:number}>} natalPoints
 */
export function transitAspects(transit, natalPoints) {
  const out = [];
  for (const tk of TRANSITING) {
    const t = transit[tk];
    if (!t) continue;
    for (const nk of Object.keys(NATAL_TARGETS)) {
      const n = natalPoints[nk];
      if (!n) continue;
      for (const asp of ASPECTS) {
        const maxOrb = TRANSIT_ORB[tk] * asp.orbMul;
        // distance from exact: how far transit lon is from natal + angle (either side)
        const sep = Math.abs(angDiff(t.lon, n.lon));
        const orb = Math.abs(sep - asp.angle);
        if (orb > maxOrb) continue;
        // applying = the separation is moving toward the exact angle
        const sepRate = sepVelocity(t, n);
        const applying = sep < asp.angle ? sepRate > 0 : sepRate < 0;
        const strength =
          TRANSIT_WEIGHT[tk] * NATAL_TARGETS[nk] * asp.weight * (1 - orb / maxOrb * 0.8);
        out.push({
          transit: tk, target: nk, aspect: asp.key, angle: asp.angle, glyph: asp.glyph,
          tone: asp.tone, orb, maxOrb, applying, strength,
          transitLon: t.lon, targetLon: n.lon, retro: !!t.retro,
        });
      }
    }
  }
  return out.sort((a, b) => b.strength - a.strength);
}

// d|sep|/dt, where sep is the shortest angular separation between transit and natal point.
function sepVelocity(t, n) {
  const d = angDiff(t.lon, n.lon);
  return Math.sign(d) * (t.speed || 0);
}

/** Aspects among natal points themselves (for the natal table). */
export function natalAspects(points, keys, orb = 6) {
  const out = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const sep = Math.abs(angDiff(points[keys[i]].lon, points[keys[j]].lon));
      for (const asp of ASPECTS) {
        const o = Math.abs(sep - asp.angle);
        if (o <= orb * asp.orbMul) out.push({ a: keys[i], b: keys[j], aspect: asp.key, glyph: asp.glyph, tone: asp.tone, orb: o });
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

// ---- Synastry (comparing two charts) ----
const SYN_KEYS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'node', 'asc', 'mc'];
const SYN_WEIGHT = { sun: 10, moon: 10, asc: 9, venus: 8, mars: 8, mercury: 6, saturn: 6, mc: 6, jupiter: 5, node: 4, pluto: 4, uranus: 3, neptune: 3, chiron: 3 };
const GENERATIONAL = new Set(['uranus', 'neptune', 'pluto', 'chiron']);
const LUMINARY = new Set(['sun', 'moon', 'asc']);

/**
 * Aspects between the points of chart B (outer) and chart A (inner).
 * Same row shape as transitAspects so the wheel and cards can reuse it.
 */
export function synastryAspects(pointsB, pointsA, { skipKeysA = [], skipKeysB = [] } = {}) {
  const out = [];
  for (const kb of SYN_KEYS) {
    if (!pointsB[kb] || skipKeysB.includes(kb)) continue;
    for (const ka of SYN_KEYS) {
      if (!pointsA[ka] || skipKeysA.includes(ka)) continue;
      // slow outer-planet pairs are shared by a whole generation, so they say little about two charts
      if (GENERATIONAL.has(kb) && GENERATIONAL.has(ka)) continue;
      const base = LUMINARY.has(kb) || LUMINARY.has(ka) ? 8 : 6;
      const sep = Math.abs(angDiff(pointsB[kb].lon, pointsA[ka].lon));
      for (const asp of ASPECTS) {
        const maxOrb = base * asp.orbMul;
        const orb = Math.abs(sep - asp.angle);
        if (orb > maxOrb) continue;
        out.push({
          transit: kb, target: ka, aspect: asp.key, angle: asp.angle, glyph: asp.glyph, tone: asp.tone,
          orb, maxOrb, applying: false, retro: false,
          strength: SYN_WEIGHT[kb] * SYN_WEIGHT[ka] * asp.weight * (1 - (orb / maxOrb) * 0.8),
          transitLon: pointsB[kb].lon, targetLon: pointsA[ka].lon,
        });
      }
    }
  }
  return out.sort((a, b) => b.strength - a.strength);
}
