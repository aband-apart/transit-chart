import { SIGNS, HOUSES, PLANETS, TARGETS, ASPECT_TEXT, LUNATION } from '../data/astro-data.js';
import { SIGN_NAMES, signIndex } from './chart.js';
import { moonPhase } from './transits.js';

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
    return { title: `${P.name} stations ${ev.direction}`, text };
  }
  if (ev.type === 'ingress') {
    const P = PLANETS[ev.transit];
    const h = house(ev.house);
    const re = ev.retro ? ' (backing into the sign while retrograde)' : '';
    return {
      title: `${P.name} enters ${SIGN_NAMES[ev.sign]}`,
      text: `${P.name}${re} moves into ${SIGN_NAMES[ev.sign]}, bringing its focus on ${P.principle} into your ${ordinal(ev.house)} house of ${h.label} (${h.theme}).`,
    };
  }
  if (ev.type === 'lunation') {
    const h = house(ev.house);
    const kind = ev.eclipse ? (ev.phase === 'new' ? 'newEclipse' : 'fullEclipse') : ev.phase;
    const name = ev.eclipse ? (ev.phase === 'new' ? 'Solar Eclipse' : 'Lunar Eclipse') : ev.phase === 'new' ? 'New Moon' : 'Full Moon';
    return {
      title: `${name} in ${SIGN_NAMES[ev.sign]}`,
      text: `${LUNATION[kind]} ${h.theme}, in your ${ordinal(ev.house)} house.`,
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
