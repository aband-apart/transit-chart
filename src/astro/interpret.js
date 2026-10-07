import { SIGNS, HOUSES, PLANETS, TARGETS, ASPECT_TEXT, LUNATION, PLACEMENT_LINE } from '../data/astro-data.js';
import { SIGN_NAMES, signIndex } from './chart.js';
import { moonPhase } from './transits.js';
import { SIGN_WORLD, PLANET_WORLD, WORLD_OVERRIDE } from '../data/mundane.js';
import { PLANET_C, TARGET_C, HOUSES_C, PLACEMENT_C, REL_C, SEXTILE_NOTE_C, CLIMATE_C, COMPARE_THEMES_C } from '../data/collective-data.js';

export const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

const sign = (i) => SIGNS[i];

// ---- Voice: who is the reading about? ----
// 'self'   -> speak to the reader ("you/your")
// 'person' -> another person: their name, "they/their"
// 'place' / 'event' -> not a person: the name, "it/its", with verbs agreeing
let SUBJECT = null; // null = address the reader

export function setSubject(name, kind = 'person') {
  if (kind === 'self') { SUBJECT = null; return; }
  const n = name ? String(name).trim() : '';
  SUBJECT = { name: n || (kind === 'person' ? 'this person' : 'this chart'), mode: kind === 'person' ? 'they' : 'it' };
}

export const isSelfVoice = () => SUBJECT === null;
const collectiveVoice = () => SUBJECT?.mode === 'it';
export const isCollectiveVoice = collectiveVoice;

// Places, organizations and events use their own tables where the human metaphor doesn't fit.
const planet = (k) => (collectiveVoice() && PLANET_C[k] ? { ...PLANETS[k], ...PLANET_C[k] } : PLANETS[k]);
const targetInfo = (k) => (collectiveVoice() ? TARGET_C[k] : TARGETS[k]);
const house = (n) => (collectiveVoice() ? HOUSES_C : HOUSES)[n - 1];
export const houseInfo = house;
export const placementLine = (k) => (collectiveVoice() ? PLACEMENT_C : PLACEMENT_LINE)[k];

// Words after which "you" is an object ("with you", "mirror you") rather than a subject ("you need").
const OBJECT_CUES = 'with|around|mirror|mirrors|see|sees|for|to|asks|ask|tests|test|calls|call|pulls|pull|pushes|push|helps|help|hit|hits|gives|give|tells|tell|makes|make|lets|about|toward|towards|of|at|like|than|from|by|on|upon|into|onto|beyond|behind|near|needs';
const OBJECT_RE = new RegExp(`\\b(${OBJECT_CUES})(\\s+)you\\b`, 'gi');
const MODALS = new Set(['can', 'could', 'will', 'would', 'should', 'may', 'might', 'must', 'shall', 'cannot']);
const ADVERBS = 'actually|also|just|only|still|never|always|really|often|usually|simply|ever|already|even';
const COORD_VERBS = new Set(['move', 'make', 'take', 'bring', 'hold', 'build', 'get', 'find', 'create', 'use', 'act', 'feel', 'go', 'keep', 'see', 'let', 'present', 'show', 'lead', 'follow', 'reach', 'grow', 'start', 'stop', 'set', 'put', 'carry', 'offer', 'meet', 'read', 'enter', 'notice', 'project', 'mirror', 'shine', 'love', 'give', 'think', 'speak', 'learn']);
const IRREGULAR = { have: 'has', are: 'is', were: 'was', do: 'does', go: 'goes', "don't": "doesn't" };

function conjugate3(word) {
  const w = word.toLowerCase();
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (/(s|sh|ch|x|z|o)$/.test(w)) return `${w}es`;
  if (/[^aeiou]y$/.test(w)) return `${w.slice(0, -1)}ies`;
  return `${w}s`;
}

/** Possessive form of the subject name, e.g. "Alex's" or "Chris'". */
export const possessive = () => (SUBJECT ? (/s$/i.test(SUBJECT.name) ? `${SUBJECT.name}'` : `${SUBJECT.name}'s`) : 'your');

/** Rewrite "you/your" in generated text to match the chart's subject. No-op for a self chart. */
/** Within a sentence the name appears once; a possessive after a pronoun (or after the name) becomes their/its. */
function nameOnce(text, poss, it) {
  const escaped = poss.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pronouns = it ? '\\b(?:it|its|itself)\\b' : '\\b(?:they|them|their|themselves)\\b';
  const re = new RegExp(`${escaped}|${pronouns}`, 'gi');
  return text.split(/(?<=[.!?])\s+/).map((sentence) => {
    let seen = false;
    return sentence.replace(re, (m) => {
      if (m.toLowerCase() === poss.toLowerCase()) {
        if (!seen) { seen = true; return m; }
        return it ? 'its' : 'their';
      }
      seen = true;
      return m;
    });
  }).join(' ');
}

export function voice(text) {
  if (!SUBJECT || !text) return text;
  const poss = possessive();
  const it = SUBJECT.mode === 'it';
  let out = text
    .replace(/\bYour\b/g, poss)
    .replace(/\byour\b/g, poss)
    .replace(/\byourself\b/g, it ? 'itself' : 'themselves')
    .replace(OBJECT_RE, (_, cue, sp) => `${cue}${sp}${it ? 'it' : 'them'}`)
    // a clause-final "you" is an object ("what soothes you."); a subject is always followed by a verb
    .replace(/\byou(?=\s*(?:[.,;:!?)]|$))/g, it ? 'it' : 'them');
  if (it) {
    out = out
      .replace(/\b(You|you)'re\b/g, (_, y) => (y === 'You' ? "It's" : "it's"))
      .replace(/\b(You|you)'ve\b/g, (_, y) => (y === 'You' ? "It's" : "it's"))
      .replace(new RegExp(`\\b(You|you)((?:\\s+(?:${ADVERBS}))*)\\s+([A-Za-z']+)`, 'g'), (_, y, adv, verb) => `${y === 'You' ? 'It' : 'it'}${adv} ${MODALS.has(verb.toLowerCase()) ? verb : conjugate3(verb)}`)
      .replace(/\bYou\b/g, 'It')
      .replace(/\byou\b/g, 'it')
      // a second verb joined by and/or/but agrees with the same subject ("presents itself and moves")
      .replace(new RegExp(`\\b(it(?:\\s+(?:${ADVERBS}))* [a-z]+(?:s|es)(?: itself)?) (and|or|but) ([a-z]+)\\b`, 'g'), (m, head, conj, verb) => (COORD_VERBS.has(verb) ? `${head} ${conj} ${conjugate3(verb)}` : m));
  } else {
    out = out
      .replace(/\bYou're\b/g, "They're").replace(/\byou're\b/g, "they're").replace(/\byou've\b/g, "they've")
      .replace(/\bYou\b/g, 'They').replace(/\byou\b/g, 'they');
  }
  return nameOnce(out, poss, it);
}

const IMPERATIVES = new Set(['pace', 'put', 'name', 'trust', 're-read', 'pitch', 'say', 'plan', 'channel', 'take', 'do', 'avoid', 'stop', 'choose', 'invest', 'share', 'be', 'get', 'make', 'commit', 'experiment', 'verify', 'ask', 'leave', 'keep', 'stay', 'set', 'step', 'state', 'go', 'hold', 'notice', 'reach', 'test', 'try']);

// Lead-ins for advice written about someone else. Rotating them keeps a list of tips from reading
// "X may do well to… X may do well to… X may do well to…".
const LEADS = [
  (n) => `${n} may do well to`,
  (n) => `It could help ${n} to`,
  (n) => `${n} could try to`,
  (n) => `A good move for ${n} is to`,
  (n) => `${n} has room to`,
];
const LEADS_NOT = [
  (n) => `${n} may do well not to`,
  (n) => `It could help ${n} not to`,
  (n) => `A good move for ${n} is not to`,
];
const LEADS_AVOID = [
  (n) => `${n} may do well to`,
  (n) => `It could help ${n} to`,
  (n) => `A good move for ${n} is to`,
];
const LEADS_NEXT = [
  (n) => `${n} can also`,
  () => 'Another option is to',
  (n) => `${n} might also`,
];

const hash = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/**
 * Advice lines are written as direct imperatives ("Pace yourself."). For a self chart they stay as written;
 * for anyone or anything else they become suggestions about that subject. `index` is the item's position in
 * a list, so neighbouring tips get different lead-ins.
 */
export function advice(text, index) {
  if (!SUBJECT || !text) return text;
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  // a list position gives each neighbour a different lead-in; a lone line is spread by its text
  const seed = index === undefined ? hash(text) : index;
  let first = true;
  const out = sentences.map((raw, k) => {
    const sentence = raw.trim();
    const head = sentence.split(/\s+/)[0].replace(/[^A-Za-z-]/g, '').toLowerCase();
    if (!IMPERATIVES.has(head)) return sentence;
    const body = sentence.replace(/[.!?]+$/, '');
    const lower = body.charAt(0).toLowerCase() + body.slice(1);
    const N = SUBJECT.name;
    let rewritten;
    if (/^do not /i.test(body)) rewritten = `${LEADS_NOT[(seed + k) % LEADS_NOT.length](N)} ${body.slice(7)}`;
    else if (first && head === 'avoid') rewritten = `${LEADS_AVOID[seed % LEADS_AVOID.length](N)} ${lower}`;
    else if (first) {
      let lead = LEADS[seed % LEADS.length](N);
      if (/could try to$/.test(lead) && ['stop', 'try', 'experiment'].includes(head)) lead = LEADS[(seed + 1) % LEADS.length](N);
      rewritten = `${lead} ${lower}`;
    }
    else rewritten = `${LEADS_NEXT[(seed + k) % LEADS_NEXT.length](N)} ${lower}`;
    first = false;
    return `${rewritten}.`;
  });
  // inside advice the subject is already named, so possessives become pronouns instead of repeating the name
  const own = SUBJECT.mode === 'it' ? ['Its', 'its'] : ['Their', 'their'];
  return voice(out.join(' ').replace(/\bYour\b/g, own[0]).replace(/\byour\b/g, own[1]));
}

export const natalLabel = (k) => (k === 'asc' || k === 'mc' || k === 'dsc' || k === 'ic' ? PLANETS[k].name : `natal ${PLANETS[k].name}`);
export const planetName = (k) => PLANETS[k].name;

/** Collective (world-level) reading of a slow planet in a sign. */
export function collective(planetKey, signIdx, { short = false } = {}) {
  const o = short ? null : WORLD_OVERRIDE[`${planetKey}:${signIdx}`];
  if (o) return o;
  const P = PLANET_WORLD[planetKey];
  return P ? `${P.verb} ${SIGN_WORLD[signIdx]}.` : '';
}

// `pair` reads "Uranus (technology, revolt and sudden change) and Pluto (power, wealth and deep restructuring)".
const OUTER_PHRASE = {
  conjunction: (pair) => `${pair} meet, which is traditionally read as the start of a new cycle.`,
  opposition: (pair) => `${pair} stand opposite each other, which tends to bring tension and polarization.`,
  square: (pair) => `${pair} form a square, and friction like this tends to push action and change.`,
  trine: (pair) => `${pair} form a trine, which tends to support progress and make it easier.`,
  sextile: (pair) => `${pair} form a sextile, an opening that can reward those who act on it.`,
};

const stableHash = (text) => [...String(text)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
/** Pick one option, the same way every time for the same seed, so repeated structures don't all read alike. */
const pick = (options, seed) => options[stableHash(seed) % options.length];

// Second sentence of an aspect reading: what it can offer or what to watch. Several phrasings so a list of
// cards doesn't repeat one line.
const OFFER = [
  (g) => `This can support ${g}.`,
  (g) => `That leaves room for ${g}.`,
  (g) => `It is a good moment for ${g}.`,
];
const WATCH = [
  (r) => `Watch for ${r}.`,
  (r) => `The thing to watch is ${r}.`,
  (r) => `Keep an eye on ${r}.`,
];
const MIXED = [
  (g, r) => `At its best this can bring ${g}; the risk is ${r}.`,
  (g, r) => `It can open the way to ${g}, with ${r} as the shadow side.`,
  (g, r) => `The upside is ${g}; the thing to guard against is ${r}.`,
];
const toneLine = (tone, T, seed) => (tone === 'flowing' ? pick(OFFER, seed)(T.gift) : tone === 'challenging' ? pick(WATCH, seed)(T.risk) : pick(MIXED, seed)(T.gift, T.risk));

// What kind of cycle a pair of slow planets makes.
function outerNote(a, b, seed) {
  const set = new Set([a, b]);
  if (set.has('jupiter') && set.has('saturn')) return pick(['Jupiter and Saturn meet often enough to mark the rhythm of the decade.', 'Meetings between the two are traditionally read as setting the tone of a decade.'], seed);
  if (set.has('jupiter')) return pick(['Jupiter moves faster than the rest, so this is a shorter chapter inside a longer story.', 'With Jupiter involved, the effect is usually felt over months rather than years.', 'Jupiter adds momentum, so this tends to be one of the more visible turns.'], seed);
  if (set.has('saturn')) return pick(['Saturn contacts tend to bring structure, and consequences, to the theme.', 'With Saturn involved, the theme often shows up as rules, limits or accountability.', 'Saturn tends to make the theme concrete.'], seed);
  return pick(['Aspects between the outermost planets unfold over years and are traditionally read as marking whole eras.', 'Cycles this slow tend to be felt as background change rather than single events.', 'These are the slowest cycles in the sky, read as the long arc behind everyday news.'], seed);
}

/** Narrative for one active transit-to-natal aspect. */
export function describeAspect(a, natal, rank) {
  const P = planet(a.transit);
  const T = targetInfo(a.target);
  const A = ASPECT_TEXT[a.aspect];
  const targetHouse = natal.points[a.target].house;

  const parts = [`${P.name}, the planet of ${P.principle}, ${A.mode} ${T.arena}.`];
  const seed = `${a.transit}-${a.target}-${a.aspect}`;
  if (a.tone === 'challenging') parts.push(`${P.hard} ${toneLine('challenging', T, seed)}`);
  else if (a.tone === 'flowing') parts.push(`${P.soft} ${toneLine('flowing', T, seed)}`);
  else parts.push(P.conj, toneLine('intense', T, seed));
  if (a.retro && P.retro) {
    parts.push(pick([
      `With ${P.name} retrograde, this theme tends to turn inward and revisit the same ground more than once.`,
      `${P.name} is retrograde, so this often comes back around for a second look.`,
      `Since ${P.name} is retrograde, the theme often returns for another pass before it settles.`,
    ], `${a.transit}-${a.target}`));
  }
  if (!['asc', 'mc'].includes(a.target)) {
    const what = natalLabel(a.target).replace('natal ', '');
    const where = `${ordinal(targetHouse)} house`;
    parts.push(pick([
      `Because your ${what} is in the ${where}, this tends to play out through ${house(targetHouse).label}.`,
      `With your ${what} in the ${where}, this tends to show up through ${house(targetHouse).label}.`,
      `Your ${what} sits in the ${where}, so this tends to play out through ${house(targetHouse).label}.`,
    ], `${a.transit}-${a.target}-house`));
  }

  const hard = a.tone !== 'flowing';
  return {
    title: `${P.name} ${A.name} ${natalLabel(a.target)}`,
    text: voice(parts.join(' ')),
    note: voice(a.aspect === 'sextile' && collectiveVoice() ? SEXTILE_NOTE_C : A.note),
    pace: voice(P.pace),
    tip: advice(hard ? P.hardTip : P.softTip, rank === undefined ? undefined : rank * 2),
    avoid: hard ? advice(P.avoid, rank === undefined ? undefined : rank * 2 + 1) : null,
    timing: a.applying ? 'approaching exact' : 'easing off for now',
  };
}

/** Short narrative for one forecast event. */
function describeEventRaw(ev, natal) {
  if (ev.type === 'aspect') {
    const P = planet(ev.transit);
    const T = targetInfo(ev.target);
    const A = ASPECT_TEXT[ev.aspect];
    const pass = ev.passes > 1 ? `, pass ${ev.pass} of ${ev.passes}` : '';
    const first = `${P.name} ${A.mode} ${T.arena}.`;
    const second = toneLine(ev.tone, T, `${ev.transit}-${ev.target}-${ev.aspect}-${Math.floor(ev.jd)}`);
    return {
      title: `${P.name} exact ${A.name} ${natalLabel(ev.target)}${pass}`,
      text: `${first} ${second}`,
    };
  }
  if (ev.type === 'station') {
    const P = planet(ev.transit);
    const where = `${SIGN_NAMES[ev.sign]}, your ${ordinal(ev.house)} house of ${house(ev.house).label}`;
    const text = ev.direction === 'retrograde'
      ? `${P.name} slows to a stop and turns retrograde in ${where}. ${P.retro ?? 'Its themes tend to turn inward and call for review.'}`
      : `${P.name} turns direct in ${where}. Things that stalled, especially around ${P.principle}, often start moving forward again.`;
    const world = PLANET_WORLD[ev.transit] ? ` In the world, ${lowerFirst(collective(ev.transit, ev.sign, { short: true }))}` : '';
    return { title: `${P.name} stations ${ev.direction}`, text: text + world };
  }
  if (ev.type === 'ingress') {
    const P = planet(ev.transit);
    const h = house(ev.house);
    const re = ev.retro ? ' (backing into the sign while retrograde)' : '';
    return {
      title: `${P.name} enters ${SIGN_NAMES[ev.sign]}`,
      text: `${P.name}${re} moves into ${SIGN_NAMES[ev.sign]}, bringing ${P.principle} into your ${ordinal(ev.house)} house of ${h.label}.${PLANET_WORLD[ev.transit] ? ' In the world, ' + lowerFirst(collective(ev.transit, ev.sign, { short: true })) : ''}`,
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
    const phrase = OUTER_PHRASE[ev.aspect](`${A.name} (${PLANET_WORLD[ev.a].domain}) and ${B.name} (${PLANET_WORLD[ev.b].domain})`);
    return {
      title: `${A.name} ${asp.name} ${B.name}`,
      text: `${phrase} ${outerNote(ev.a, ev.b, `${ev.a}-${ev.b}-${ev.aspect}-${Math.floor(ev.jd)}`)} The pair moves through ${SIGN_NAMES[ev.signA]} and ${SIGN_NAMES[ev.signB]}, touching your ${ordinal(ev.houseA)} house (${house(ev.houseA).label}) and ${ordinal(ev.houseB)} house (${house(ev.houseB).label}).`,
    };
  }
  return { title: '', text: '' };
}

export function describeEvent(ev, natal) {
  const r = describeEventRaw(ev, natal);
  return { ...r, text: voice(r.text) };
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
    text: voice(`The ${phase.name} is in ${SIGN_NAMES[signIndex(moon.lon)]}, moving through your ${ordinal(mh)} house of ${house(mh).label}. ${collectiveVoice() ? 'Public' : 'Emotional'} attention tends to gravitate toward ${house(mh).theme}.`),
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
  const col = collectiveVoice();
  const out = {
    sun: col ? `Sun in ${S('sun').name} (${ordinal(p.sun.house)} house): its core character tends to be shaped by ${SIGN_WORLD[p.sun.sign]}.` : `Sun in ${S('sun').name} (${ordinal(p.sun.house)} house) often shows up as ${S('sun').sun}.`,
    moon: col ? `Moon in ${S('moon').name} (${ordinal(p.moon.house)} house): its public mood and everyday needs tend to lean toward ${SIGN_WORLD[p.moon.sign]}.` : `Moon in ${S('moon').name} (${ordinal(p.moon.house)} house) tends toward ${S('moon').moon}.`,
    rising: col ? `${S('asc').name} Rising: it tends to present itself to the world through ${SIGN_WORLD[p.asc.sign]}.` : `${S('asc').name} Rising tends to come across as ${S('asc').rising}.`,
    elements: top(el),
    modalities: top(mod),
    dominant: `Your chart leans ${top(el)[0][0]} and ${top(mod)[0][0]}.`,
    ruler: rulerPoint
      ? `Your chart ruler is ${PLANETS[ascRuler].name}, placed in ${S(ascRuler).name} in the ${ordinal(rulerPoint.house)} house. That is where ${col ? 'its direction' : 'your life'} tends to organize itself.`
      : '',
  };
  for (const k of ['sun', 'moon', 'rising', 'dominant', 'ruler']) out[k] = voice(out[k]);
  return out;
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

  const headline = voice(lead
    ? `${PLANETS[lead].name} sets the tone: a ${climate} stretch centered on ${planet(lead).principle}`
    : 'A quiet stretch with few major transits touching your chart');

  const climateText = {
    demanding: 'Challenging aspects outweigh supportive ones right now. That can feel like pressure, and periods like this are often when people make changes they have been putting off.',
    supportive: 'Supportive aspects outweigh challenging ones right now. Things can feel easier than usual, which makes this a good window to act on what you want.',
    mixed: 'Supportive and challenging influences are balanced right now. That can feel like being pulled in two directions, and the easier energy can help carry the harder parts.',
  }[climate];
  const climateOut = collectiveVoice() ? CLIMATE_C[climate] : climateText;

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
    const P = planet(k);
    const h = house(t.house);
    return {
      key: k,
      title: `${P.name} in ${SIGN_NAMES[t.sign]}${t.retro ? ' (retrograde)' : ''}`,
      house: t.house,
      world: PLANET_WORLD[k] ? collective(k, t.sign) : '',
      text: voice(`${P.name} ${P.inHouse} your ${ordinal(t.house)} house of ${h.label}. For the length of this transit, themes of ${P.principle} tend to run through ${h.theme}.${t.retro && P.retro ? ' ' + P.retro : ''}`),
    };
  });

  // Tips: one per distinct transiting planet, strongest first
  const doTips = []; const avoidTips = []; const seen = new Set();
  for (const a of top) {
    if (seen.has(a.transit)) continue;
    seen.add(a.transit);
    const P = planet(a.transit);
    const hard = a.tone !== 'flowing';
    doTips.push({ source: `${P.name} ${ASPECT_TEXT[a.aspect].name} ${natalLabel(a.target)}`, text: advice(hard ? P.hardTip : P.softTip, doTips.length) });
    if (hard) avoidTips.push({ source: P.name, text: advice(P.avoid, avoidTips.length) });
  }

  // Predictions: the next ~60 days of significant events
  const significant = events.filter((e) => {
    if (e.type === 'aspect') return ['pluto', 'neptune', 'uranus', 'saturn', 'jupiter', 'chiron', 'mars'].includes(e.transit) || ['sun', 'moon', 'asc', 'mc'].includes(e.target) && ['sun', 'venus', 'mercury'].includes(e.transit);
    return true;
  });

  const focusText = focusHouses.length
    ? `Most of the activity is in your ${focusHouses.map((h) => `${ordinal(h)} house (${house(h).label})`).join(' and ')}.`
    : '';

  return {
    headline,
    climate,
    climateText: voice(climateOut),
    focusText: voice(focusText),
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
  flowing: [
    'This tends to feel easy and natural.',
    'The two charts tend to cooperate here without much effort.',
    'Contact like this usually feels comfortable.',
    'Things tend to click here without much work.',
    'Here the connection tends to run smoothly.',
  ],
  challenging: [
    'This is a growth edge: it asks for patience and direct conversation.',
    'Friction here can be useful, though it asks for honesty and patience.',
    'This is a spot that tends to reward slow, direct conversation.',
    'Misreadings can come easily here, so it helps to say things plainly.',
    'This is where differences tend to show, and where openness tends to matter most.',
  ],
  intense: [
    'This tends to be a strong link that is hard to ignore.',
    'The pull here is strong and tends to be felt on both sides.',
    'This contact tends to stand out.',
    'There can be real intensity in this link, for better and worse.',
    'Links like this tend to be remembered.',
  ],
};
const isColl = (kind) => kind === 'place' || kind === 'event';
const has = (a, x, y) => (a.transit === x && a.target === y) || (a.transit === y && a.target === x);
const involves = (a, k) => a.transit === k || a.target === k;

function synFlavor(a, coll = false) {
  if (coll) {
    if (has(a, 'venus', 'mars')) return 'Venus–Mars contact can show up as a strong pull between values and drive.';
    if (has(a, 'sun', 'moon')) return 'Sun–Moon contact tends to line identity up with public mood.';
    if (a.transit === 'moon' && a.target === 'moon') return 'Moon–Moon contact often points to a shared public mood.';
    if (involves(a, 'saturn')) return 'Saturn contacts often bring structure, commitment, or a sense of being tested.';
    if (involves(a, 'neptune')) return 'Neptune can add idealization, so it helps to check what is real.';
  }
  if (has(a, 'venus', 'mars')) return 'Venus–Mars contact is traditionally read as chemistry.';
  if (has(a, 'sun', 'moon')) return 'Sun–Moon contact is traditionally read as a marker of compatibility.';
  if (a.transit === 'moon' && a.target === 'moon') return "Moon–Moon contact often means each instinctively reads the other's moods.";
  if (involves(a, 'saturn')) return 'Saturn contacts often bring seriousness, commitment, or a feeling of being tested.';
  if (involves(a, 'pluto')) return 'Pluto contacts tend to be intense and transformative, with strong pull and power dynamics.';
  if (involves(a, 'uranus')) return 'Uranus adds spark and unpredictability.';
  if (involves(a, 'neptune')) return 'Neptune can add romance and idealization, so it helps to check what is real.';
  if (involves(a, 'node')) return 'Node contacts often feel purposeful, even fated.';
  return '';
}

export function describeSynastry(a, nameA, nameB, kindA = 'person', kindB = 'person', rank) {
  const A = ASPECT_TEXT[a.aspect];
  const coll = isColl(kindA) || isColl(kindB);
  const REL_A = isColl(kindA) ? REL_C : REL;
  const REL_B = isColl(kindB) ? REL_C : REL;
  const pa = PLANETS[a.target].name;
  const pb = PLANETS[a.transit].name;
  return {
    title: `${nameB}'s ${pb} ${A.name} ${nameA}'s ${pa}`,
    text: `${nameB}'s ${pb} (${REL_B[a.transit]}) ${SYN_VERB[a.aspect]} ${nameA}'s ${pa} (${REL_A[a.target]}). ${rank === undefined ? pick(SYN_TONE[a.tone], `${a.transit}-${a.target}-${a.aspect}`) : SYN_TONE[a.tone][rank % SYN_TONE[a.tone].length]} ${synFlavor(a, coll)}`.trim(),
  };
}

/** Overall read of how two charts relate. */
export function compareSummary(aspects, nameA, nameB, kindA = 'person', kindB = 'person') {
  const coll = isColl(kindA) || isColl(kindB);
  const top = aspects.slice(0, 12);
  const hard = top.filter((a) => a.tone !== 'flowing').reduce((s, a) => s + a.strength, 0);
  const soft = top.filter((a) => a.tone === 'flowing').reduce((s, a) => s + a.strength, 0);
  const ratio = hard + soft ? hard / (hard + soft) : 0.5;
  const climate = ratio > 0.65 ? 'charged' : ratio < 0.4 ? 'harmonious' : 'balanced';
  const climateText = {
    charged: `${nameA} and ${nameB} meet with a lot of friction and intensity. ${coll ? 'That can show up as a strong pull or repeated conflict, and it tends to push both to adapt.' : 'That can read as strong attraction or repeated conflict, and it tends to push both to grow.'}`,
    harmonious: `${nameA} and ${nameB} fit together with relative ease. The risk is complacency, since comfort is rarely tested.`,
    balanced: `${nameA} and ${nameB} have a mix of ease and friction, so there is both comfort and something to work on.`,
  }[climate];
  const themes = [];
  const find = (f) => aspects.find(f);
  const rules = [
    [(a) => has(a, 'sun', 'moon'), 'Sun–Moon link: often a sense of being understood.'],
    [(a) => has(a, 'venus', 'mars'), 'Venus–Mars link: attraction and chemistry are common.'],
    [(a) => a.transit === 'moon' && a.target === 'moon', 'Moon–Moon link: a shared emotional wavelength is typical.'],
    [(a) => has(a, 'venus', 'venus') || (a.transit === 'venus' && a.target === 'venus'), 'Venus–Venus link: shared tastes and ways of loving tend to show up.'],
    [(a) => involves(a, 'saturn') && (LUM_OR_PERSONAL.has(a.transit) || LUM_OR_PERSONAL.has(a.target)), 'A Saturn contact: lasting commitment, or a sense of limits, is possible.'],
    [(a) => involves(a, 'pluto') && (LUM_OR_PERSONAL.has(a.transit) || LUM_OR_PERSONAL.has(a.target)), 'A Pluto contact: intensity and transformation are possible.'],
    [(a) => involves(a, 'asc'), 'An Ascendant contact: first impressions tend to be strong.'],
    [(a) => involves(a, 'node'), 'A Node contact: a sense of purpose, even fate, can come with it.'],
    [(a) => has(a, 'mercury', 'mercury') || (a.transit === 'mercury' && a.target === 'mercury'), 'Mercury–Mercury link: easy conversation, or crossed wires.'],
  ];
  const swap = coll ? [COMPARE_THEMES_C.sunMoon, COMPARE_THEMES_C.venusMars, COMPARE_THEMES_C.moonMoon, COMPARE_THEMES_C.venusVenus, null, null, COMPARE_THEMES_C.asc] : [];
  rules.forEach(([f, text], i) => {
    const a = find(f);
    if (a) themes.push({ text: swap[i] || text, tone: a.tone });
  });
  const strengths = top.filter((a) => a.tone === 'flowing').slice(0, 3).map((a, i) => describeSynastry(a, nameA, nameB, kindA, kindB, i));
  const frictions = top.filter((a) => a.tone !== 'flowing').slice(0, 3).map((a, i) => describeSynastry(a, nameA, nameB, kindA, kindB, i + 3));
  return { climate, climateText, themes, strengths, frictions };
}
const LUM_OR_PERSONAL = new Set(['sun', 'moon', 'venus', 'mars', 'mercury', 'asc']);
