// Builds everything a person sees across the Reading, Forecast, Natal and Compare views, for one chart type,
// so the voice tests can read complete readings instead of single strings.
import { initEphemeris, dateToJd } from '../../src/astro/ephemeris.js';
import { natalFromBirth, buildChart } from '../../src/astro/chart.js';
import { transitAspects, synastryAspects } from '../../src/astro/aspects.js';
import { forecast, outerAspects } from '../../src/astro/transits.js';
import * as I from '../../src/astro/interpret.js';

await initEphemeris();
const birth = { year: 2010, month: 9, day: 1, hour: 12, minute: 0, timeZone: 'America/New_York', lat: 40.7, lon: -74, houseSystem: 'W' };
const NAMES = { self: 'HG', person: 'Alex', place: 'United States', event: 'Acme Inc' };
const OTHERS = { self: ['person', 'Sam'], person: ['person', 'Sam'], place: ['event', 'Partner Org'], event: ['place', 'Partner Land'] };
const ALL_POINTS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'node', 'southnode', 'lilith', 'pallas', 'asc', 'mc', 'ic', 'dsc'];

/** @param {string} when ISO date for "today" so different seasons can be sampled */
export function buildBundle(kind, when = '2026-10-07T12:00:00Z', { year = 2010 } = {}) {
  const natal = natalFromBirth({ ...birth, year });
  const other = natalFromBirth({ ...birth, year: 1988, month: 3, day: 15 });
  const jd = dateToJd(Date.parse(when));
  const transit = buildChart({ jd, lat: 40.7, lon: -74 });
  const aspects = transitAspects(transit.points, natal.points);
  const events = [...forecast(natal, jd, jd + 365), ...outerAspects(natal, jd, jd + 365)].sort((a, b) => a.jd - b.jd);
  I.setSubject(NAMES[kind], kind);

  const top = aspects.slice(0, 4);
  const reading = I.buildReading({ natal, transit, aspects, events: events.filter((e) => e.jd <= jd + 60) });
  const sections = {};
  sections.lead = [reading.headline, reading.climateText, reading.focusText, I.skyToday(natal, transit).text];
  // Mirrors the Reading: advice and pace show once per planet, so repeated planets don't repeat themselves.
  const seen = new Set();
  let shown = 0;
  sections.transits = [];
  sections.advice = [];
  for (const a of top) {
    const brief = seen.has(a.transit);
    seen.add(a.transit);
    const d = I.describeAspect(a, natal, brief ? undefined : shown);
    sections.transits.push(d.text);
    if (!brief) { sections.transits.push(d.pace); sections.advice.push(d.tip, ...(d.avoid ? [d.avoid] : [])); shown++; }
  }
  sections.tipsDo = reading.tips.do.map((t) => t.text);
  sections.tipsAvoid = reading.tips.avoid.map((t) => t.text);
  sections.seasons = reading.seasons.flatMap((s) => [s.text, s.world].filter(Boolean));
  const OUT = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  sections.upcoming = reading.upcoming.slice(0, 10).map((e) => I.describeEvent(e, natal).text);
  sections.world = events.filter((e) => e.type === 'outer' || (e.type === 'lunation' && e.eclipse) || (['ingress', 'station'].includes(e.type) && OUT.includes(e.transit))).slice(0, 12).map((e) => I.describeEvent(e, natal).text);
  const portrait = I.natalPortrait(natal);
  sections.portrait = [portrait.sun, portrait.moon, portrait.rising, portrait.dominant, portrait.ruler].filter(Boolean);
  sections.placements = ALL_POINTS.map((k) => I.voice(`${I.placementLine(k)}, expressed through ${I.houseInfo(natal.points[k].house).theme}.`));
  const [kindB, nameB] = OTHERS[kind];
  const syn = synastryAspects(other.points, natal.points).slice(0, 8);
  const sum = I.compareSummary(syn, NAMES[kind], nameB, kind, kindB);
  sections.compare = [sum.climateText, ...sum.themes.map((t) => t.text), ...syn.map((a, i) => I.describeSynastry(a, NAMES[kind], nameB, kind, kindB, i).text)];
  // every forecast card (all event types), as the Forecast tab shows them
  sections.forecast = events.filter((e) => e.jd <= jd + 90).slice(0, 40).map((e) => I.describeEvent(e, natal).text);

  const all = Object.values(sections).flat().filter(Boolean);
  return { kind, name: NAMES[kind], sections, all, natal, transit, aspects, events };
}

export { I };
