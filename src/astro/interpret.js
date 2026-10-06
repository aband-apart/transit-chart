import { SIGNS, HOUSES, PLANETS, TARGETS, ASPECT_TEXT, LUNATION } from '../data/astro-data.js';
import { SIGN_NAMES, signIndex } from './chart.js';
import { moonPhase } from './transits.js';
import { SIGN_WORLD, PLANET_WORLD, WORLD_OVERRIDE } from '../data/mundane.js';

export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const house = (n) => HOUSES[n - 1];
const sign = (i) => SIGNS[i];

export const natalLabel = (k) => (k === 'asc' || k === 'mc' || k === 'dsc' || k === 'ic' ? PLANETS[k].name : `natal ${PLANETS[k].name}`);
export const planetName = (k) => PLANETS[k].name;

/** Collective (world-level) reading of a slow planet in a sign. */
export function collective(planetKey, signIdx) {
  const o = WORLD_OVERRIDE[`${planetKey}:${signIdx}`];
  if (o) return o;
  const P = PLANET_WORLD[planetKey];
  return P ? `${P.verb} ${SIGN_WORLD[signIdx]}.` : '';
}

const OUTER_PHRASE = {
  conjunction: (a, b) => `${cap(a)} and ${b} merge into the start of a new cycle.`,
  opposition: (a, b) => `${cap(a)} and ${b} are pulled into open tension and polarization.`,
  square: (a, b) => `Friction between ${a} and ${b} forces action and change.`,
  trine: (a, b) => `${cap(a)} and ${b} support each other, and progress comes more easily.`,
  sextile: (a, b) => `An opening appears between ${a} and ${b}, rewarding those who act on it.`,
};

/** Narrative for one active transit-to-natal aspect. */
export function describeAspect(a, natal) {
  const P = PLANETS[a.transit];
  const T = TARGETS[a.target];
  const A = ASPECT_TEXT[a.aspect];
  const targetHouse = natal.points[a.target].house;

  const parts = [`${P.name}, the planet of ${P.principle}, ${A.mode} ${T.arena}.`];
  if (a.tone === 'challenging') parts.push(`${P.hard} Watch for ${T.risk}.`);
  else if (a.tone === 'flowing') parts.push(`${P.soft} This supports ${T.gift}.`);
  else {
    parts.push(P.conj);
    parts.push(`At its best this brings ${T.gift}; the risk is ${T.risk}.`);
  }
  if (a.retro && P.retro) parts.push('With the planet retrograde, this theme turns inward and tends to revisit the same ground more than once.');
  if (!['asc', 'mc'].includes(a.target)) {
    parts.push(`Because your ${natalLabel(a.target).replace('natal ', '')} is in the ${ordinal(targetHouse)} house, it plays out through ${house(targetHouse).label}.`);
  }

  const hard = a.tone !== 'flowing';
  return {
    title: `${P.name} ${A.name} ${natalLabel(a.target)}`,
    text: parts.join(' '),
    note: A.note,
    pace: P.pace,
    tip: hard ? P.hardTip : P.softTip,
    avoid: hard ? P.avoid : null,
    timing: a.applying ? 'approaching exact' : 'easing off for now',
  };
}

/** Short narrative for one forecast event. */
export function describeEvent(ev, natal) {
  if (ev.type === 'aspect') {
    const P = PLANETS[ev.transit];
    const T = TARGETS[ev.target];
    const A = ASPECT_TEXT[ev.aspect];
    const pass = ev.passes > 1 ? `, pass ${ev.pass} of ${ev.passes}` : '';
    const body = ev.tone === 'flowing' ? `${P.soft}` : ev.tone === 'challenging' ? `${P.hard}` : `${P.conj}`;
    return {
      title: `${P.name} exact ${A.name} ${natalLabel(ev.target)}${pass}`,
      text: `${body} This lands on ${T.arena}. ${ev.tone === 'flowing' ? cap(P.softTip) : cap(P.hardTip)}`,
    };
  }
  if (ev.type === 'station') {
    const P = PLANETS[ev.transit];
    const where = `${SIGN_NAMES[ev.sign]}, your ${ordinal(ev.house)} house of ${house(ev.house).label}`;
    const text = ev.direction === 'retrograde'
      ? `${P.name} slows to a stop and turns retrograde in ${where}. ${P.retro ?? 'Its themes turn inward and call for review.'}`
      : `${P.name} turns direct in ${where}. Clarity returns and the stalled themes of ${P.principle} start moving forward again.`;
    const world = PLANET_WORLD[ev.transit] ? ` In the world: ${collective(ev.transit, ev.sign)}` : '';
    return { title: `${P.name} stations ${ev.direction}`, text: text + world };
  }
  if (ev.type === 'ingress') {
    const P = PLANETS[ev.transit];
    const h = house(ev.house);
    const re = ev.retro ? ' (backing into the sign while retrograde)' : '';
    return {
      title: `${P.name} enters ${SIGN_NAMES[ev.sign]}`,
      text: `${P.name}${re} moves into ${SIGN_NAMES[ev.sign]}, bringing its focus on ${P.principle} into your ${ordinal(ev.house)} house of ${h.label} (${h.theme}).${PLANET_WORLD[ev.transit] ? ' In the world: ' + collective(ev.transit, ev.sign) : ''}`,
    };
  }
  if (ev.type === 'lunation') {
    const h = house(ev.house);
    const kind = ev.eclipse ? (ev.phase === 'new' ? 'newEclipse' : 'fullEclipse') : ev.phase;
    const name = ev.eclipse ? (ev.phase === 'new' ? 'Solar Eclipse' : 'Lunar Eclipse') : ev.phase === 'new' ? 'New Moon' : 'Full Moon';
    return {
      title: `${name} in ${SIGN_NAMES[ev.sign]}`,
      text: `${LUNATION[kind]} ${h.theme}, in your ${ordinal(ev.house)} house.${ev.eclipse ? ' In the world: eclipses tend to spotlight ' + SIGN_WORLD[ev.sign] + '.' : ''}`,
    };
  }
  if (ev.type === 'outer') {
    const A = PLANETS[ev.a];
    const B = PLANETS[ev.b];
    const asp = ASPECT_TEXT[ev.aspect];
    const phrase = OUTER_PHRASE[ev.aspect](PLANET_WORLD[ev.a].domain, PLANET_WORLD[ev.b].domain);
    return {
      title: `${A.name} ${asp.name} ${B.name}`,
      text: `${phrase} This is one of the slow, generation-defining cycles. Moving through ${SIGN_NAMES[ev.signA]} and ${SIGN_NAMES[ev.signB]}, it touches your ${ordinal(ev.houseA)} house (${house(ev.houseA).label}) and ${ordinal(ev.houseB)} house (${house(ev.houseB).label}).`,
    };
  }
  return { title: '', text: '' };
}

/** What the sky is doing right now, in plain terms. */
export function skyToday(natal, transit) {
  const moon = transit.points.moon;
  const sun = transit.points.sun;
  const phase = moonPhase(transit.jd);
  const mh = natal.cusps ? moon.house : 1;
  const retros = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
    .filter((k) => transit.points[k].retro)
    .map((k) => PLANETS[k].name);
  return {
    phase: phase.name,
    moonSign: SIGN_NAMES[signIndex(moon.lon)],
    moonHouse: moon.house,
    sunSign: SIGN_NAMES[signIndex(sun.lon)],
    text: `The ${phase.name} is in ${SIGN_NAMES[signIndex(moon.lon)]}, moving through your ${ordinal(mh)} house of ${house(mh).label}. Emotional attention gravitates toward ${house(mh).theme}.`,
    retros,
  };
}

/** Natal portrait: big three, elements, modalities. */
export function natalPortrait(natal) {
  const p = natal.points;
  const S = (k) => sign(p[k].sign);
  const bodies = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const el = {}; const mod = {};
  for (const k of [...bodies, 'asc']) {
    el[S(k).element] = (el[S(k).element] || 0) + 1;
    mod[S(k).modality] = (mod[S(k).modality] || 0) + 1;
  }
  const top = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const ascRuler = S('asc').ruler.toLowerCase();
  const rulerPoint = p[ascRuler];
  return {
    sun: `Sun in ${S('sun').name} (${ordinal(p.sun.house)} house) is ${S('sun').sun}.`,
    moon: `Moon in ${S('moon').name} (${ordinal(p.moon.house)} house) ${S('moon').moon}.`,
    rising: `${S('asc').name} Rising ${S('asc').rising}.`,
    elements: top(el),
    modalities: top(mod),
    dominant: `Your chart leans ${top(el)[0][0]} and ${top(mod)[0][0]}.`,
    ruler: rulerPoint
      ? `Your chart ruler is ${PLANETS[ascRuler].name}, placed in ${S(ascRuler).name} in the ${ordinal(rulerPoint.house)} house. That is where your life tends to organize itself.`
      : '',
  };
}

const TOP_N = 8;

/** The astrologer's overall reading for the current moment. */
export function buildReading({ natal, transit, aspects, events }) {
  const top = aspects.slice(0, TOP_N);
  const hardW = top.filter((a) => a.tone !== 'flowing').reduce((s, a) => s + a.strength, 0);
  const softW = top.filter((a) => a.tone === 'flowing').reduce((s, a) => s + a.strength, 0);
  const ratio = hardW + softW ? hardW / (hardW + softW) : 0.5;
  const climate = ratio > 0.68 ? 'demanding' : ratio < 0.38 ? 'supportive' : 'mixed';

  // Dominant transiting planet
  const byPlanet = {};
  for (const a of top) byPlanet[a.transit] = (byPlanet[a.transit] || 0) + a.strength;
  const lead = Object.entries(byPlanet).sort((a, b) => b[1] - a[1])[0]?.[0];

  const headline = lead
    ? `${PLANETS[lead].name} sets the tone: a ${climate} stretch centered on ${PLANETS[lead].principle}`
    : 'A quiet stretch with few major transits touching your chart';

  const climateText = {
    demanding: 'The weight of the sky is on the challenging side right now. That usually feels like pressure, but it is also the kind of period that forces real growth and decisive change.',
    supportive: 'The sky is largely supportive right now. Things come more easily than usual, so this is a good window to act on what you want.',
    mixed: 'The sky is mixed right now, with supportive and challenging influences side by side. Expect to feel pulled in two directions, and use the easy energy to carry the hard parts.',
  }[climate];

  // Where does the action play out? Weight by the house of the natal point hit.
  const houseWeight = {};
  for (const a of top) {
    const h = natal.points[a.target].house;
    houseWeight[h] = (houseWeight[h] || 0) + a.strength;
  }
  const focusHouses = Object.entries(houseWeight).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([h]) => +h);

  // Slow-planet "season" placements
  const seasons = ['saturn', 'jupiter', 'uranus', 'neptune', 'pluto', 'chiron'].map((k) => {
    const t = transit.points[k];
    const P = PLANETS[k];
    const h = house(t.house);
    return {
      key: k,
      title: `${P.name} in ${SIGN_NAMES[t.sign]}${t.retro ? ' (retrograde)' : ''}`,
      house: t.house,
      world: PLANET_WORLD[k] ? collective(k, t.sign) : '',
      text: `${P.name} ${P.inHouse} your ${ordinal(t.house)} house of ${h.label}. For the length of this transit, ${P.principle} are central to ${h.theme}.${t.retro && P.retro ? ' ' + P.retro : ''}`,
    };
  });

  // Tips: one per distinct transiting planet, strongest first
  const doTips = []; const avoidTips = []; const seen = new Set();
  for (const a of top) {
    if (seen.has(a.transit)) continue;
    seen.add(a.transit);
    const P = PLANETS[a.transit];
    const hard = a.tone !== 'flowing';
    doTips.push({ source: `${P.name} ${ASPECT_TEXT[a.aspect].name} ${natalLabel(a.target)}`, text: hard ? P.hardTip : P.softTip });
    if (hard) avoidTips.push({ source: P.name, text: P.avoid });
  }

  // Predictions: the next ~60 days of significant events
  const significant = events.filter((e) => {
    if (e.type === 'aspect') return ['pluto', 'neptune', 'uranus', 'saturn', 'jupiter', 'chiron', 'mars'].includes(e.transit) || ['sun', 'moon', 'asc', 'mc'].includes(e.target) && ['sun', 'venus', 'mercury'].includes(e.transit);
    return true;
  });

  const focusText = focusHouses.length
    ? `The main action is in your ${focusHouses.map((h) => `${ordinal(h)} house (${house(h).label})`).join(' and ')}.`
    : '';

  return {
    headline,
    climate,
    climateText,
    focusText,
    focusHouses,
    seasons,
    tips: { do: doTips.slice(0, 4), avoid: avoidTips.slice(0, 3) },
    upcoming: significant,
  };
}

export { cap };


// ---- Synastry text ----
const REL = {
  sun: 'identity and vitality', moon: 'emotional needs', mercury: 'communication', venus: 'affection and values',
  mars: 'drive and desire', jupiter: 'growth and generosity', saturn: 'commitment and limits',
  uranus: 'excitement and unpredictability', neptune: 'idealism and intuition', pluto: 'intensity and power',
  chiron: 'tender spots and healing', node: 'shared direction', asc: 'first impressions', mc: 'public life and ambitions',
};
const SYN_VERB = {
  conjunction: 'merges with', opposition: 'is drawn to, and polarized by,', square: 'rubs against',
  trine: 'flows easily with', sextile: 'quietly supports',
};
const SYN_TONE = {
  flowing: 'This is an easy, natural connection.',
  challenging: 'This is a growth edge. It asks for patience and direct conversation.',
  intense: 'This is a strong link that is hard to ignore.',
};
const has = (a, x, y) => (a.transit === x && a.target === y) || (a.transit === y && a.target === x);
const involves = (a, k) => a.transit === k || a.target === k;

function synFlavor(a) {
  if (has(a, 'venus', 'mars')) return 'Venus–Mars contact is classic chemistry.';
  if (has(a, 'sun', 'moon')) return 'Sun–Moon contact is a classic marker of compatibility.';
  if (a.transit === 'moon' && a.target === 'moon') return 'Moon–Moon contact means you instinctively read each other\'s moods.';
  if (involves(a, 'saturn')) return 'Saturn contacts often mean seriousness, commitment, or a feeling of being tested.';
  if (involves(a, 'pluto')) return 'Pluto contacts are intense and transformative, with strong pull and power dynamics.';
  if (involves(a, 'uranus')) return 'Uranus adds spark and unpredictability.';
  if (involves(a, 'neptune')) return 'Neptune adds romance and idealization, so check what is real.';
  if (involves(a, 'node')) return 'Node contacts feel fated or purposeful.';
  return '';
}

export function describeSynastry(a, nameA, nameB) {
  const A = ASPECT_TEXT[a.aspect];
  const pa = PLANETS[a.target].name;
  const pb = PLANETS[a.transit].name;
  return {
    title: `${nameB}'s ${pb} ${A.name} ${nameA}'s ${pa}`,
    text: `${nameB}'s ${pb} (${REL[a.transit]}) ${SYN_VERB[a.aspect]} ${nameA}'s ${pa} (${REL[a.target]}). ${SYN_TONE[a.tone]} ${synFlavor(a)}`.trim(),
  };
}

/** Overall read of how two charts relate. */
export function compareSummary(aspects, nameA, nameB) {
  const top = aspects.slice(0, 12);
  const hard = top.filter((a) => a.tone !== 'flowing').reduce((s, a) => s + a.strength, 0);
  const soft = top.filter((a) => a.tone === 'flowing').reduce((s, a) => s + a.strength, 0);
  const ratio = hard + soft ? hard / (hard + soft) : 0.5;
  const climate = ratio > 0.65 ? 'charged' : ratio < 0.4 ? 'harmonious' : 'balanced';
  const climateText = {
    charged: `${nameA} and ${nameB} meet with a lot of friction and intensity. That can read as strong attraction or repeated conflict, and it tends to push both to grow.`,
    harmonious: `${nameA} and ${nameB} fit together with relative ease. The risk is complacency, since comfort is rarely tested.`,
    balanced: `${nameA} and ${nameB} have a mix of ease and friction, so there is both comfort and something to work on.`,
  }[climate];
  const themes = [];
  const find = (f) => aspects.find(f);
  const rules = [
    [(a) => has(a, 'sun', 'moon'), 'Sun–Moon link: a sense of being understood.'],
    [(a) => has(a, 'venus', 'mars'), 'Venus–Mars link: attraction and chemistry.'],
    [(a) => a.transit === 'moon' && a.target === 'moon', 'Moon–Moon link: shared emotional wavelength.'],
    [(a) => has(a, 'venus', 'venus') || (a.transit === 'venus' && a.target === 'venus'), 'Venus–Venus link: shared tastes and ways of loving.'],
    [(a) => involves(a, 'saturn') && (LUM_OR_PERSONAL.has(a.transit) || LUM_OR_PERSONAL.has(a.target)), 'A Saturn contact: lasting commitment, or a sense of limits.'],
    [(a) => involves(a, 'pluto') && (LUM_OR_PERSONAL.has(a.transit) || LUM_OR_PERSONAL.has(a.target)), 'A Pluto contact: intensity and transformation.'],
    [(a) => involves(a, 'asc'), 'An Ascendant contact: strong first impressions.'],
    [(a) => involves(a, 'node'), 'A Node contact: a sense of purpose or fate.'],
    [(a) => has(a, 'mercury', 'mercury') || (a.transit === 'mercury' && a.target === 'mercury'), 'Mercury–Mercury link: easy conversation, or crossed wires.'],
  ];
  for (const [f, text] of rules) {
    const a = find(f);
    if (a) themes.push({ text, tone: a.tone });
  }
  const strengths = top.filter((a) => a.tone === 'flowing').slice(0, 3).map((a) => describeSynastry(a, nameA, nameB));
  const frictions = top.filter((a) => a.tone !== 'flowing').slice(0, 3).map((a) => describeSynastry(a, nameA, nameB));
  return { climate, climateText, themes, strengths, frictions };
}
const LUM_OR_PERSONAL = new Set(['sun', 'moon', 'venus', 'mars', 'mercury', 'asc']);
