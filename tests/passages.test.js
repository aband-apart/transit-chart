// Passage-level checks: generate whole readings for every chart Type and scan the text,
// rather than testing single strings in isolation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { initEphemeris, dateToJd } from '../src/astro/ephemeris.js';
import { natalFromBirth, buildChart } from '../src/astro/chart.js';
import { transitAspects } from '../src/astro/aspects.js';
import { forecast, outerAspects } from '../src/astro/transits.js';
import { synastryAspects } from '../src/astro/aspects.js';
import * as I from '../src/astro/interpret.js';

await initEphemeris();
const birth = { year: 2010, month: 9, day: 1, hour: 12, minute: 0, timeZone: 'America/New_York', lat: 40.7, lon: -74, houseSystem: 'W' };
const natal = natalFromBirth(birth);
const other = natalFromBirth({ ...birth, year: 1988, month: 3, day: 15 });
const jd = dateToJd(Date.UTC(2026, 9, 7, 12));
const transit = buildChart({ jd, lat: 40.7, lon: -74 });
const aspects = transitAspects(transit.points, natal.points);
const events = [...forecast(natal, jd, jd + 365), ...outerAspects(natal, jd, jd + 365)];
const ALL_POINTS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'node', 'southnode', 'lilith', 'pallas', 'asc', 'mc', 'ic', 'dsc'];

/** Every kind of generated passage for the active subject. */
function passages(kindA, kindB, nameA = 'Subject', nameB = 'Partner') {
  const out = [];
  for (const a of aspects) {
    const d = I.describeAspect(a, natal);
    out.push(d.text, d.note, d.pace, d.tip, d.avoid || '');
  }
  for (const e of events) out.push(I.describeEvent(e, natal).text);
  const r = I.buildReading({ natal, transit, aspects, events });
  out.push(r.headline, r.climateText, r.focusText, ...r.seasons.map((s) => s.text), ...r.tips.do.map((t) => t.text), ...r.tips.avoid.map((t) => t.text));
  out.push(I.skyToday(natal, transit).text);
  const portrait = I.natalPortrait(natal);
  out.push(portrait.sun, portrait.moon, portrait.rising, portrait.dominant, portrait.ruler);
  for (const k of ALL_POINTS) out.push(I.voice(`${I.placementLine(k)}, expressed through ${I.houseInfo(natal.points[k].house).theme}.`));
  const syn = synastryAspects(other.points, natal.points).slice(0, 15);
  for (const a of syn) out.push(I.describeSynastry(a, nameA, nameB, kindA, kindB).text);
  const sum = I.compareSummary(syn, nameA, nameB, kindA, kindB);
  out.push(sum.climateText, ...sum.themes.map((t) => t.text));
  return out.filter(Boolean);
}

// Phrases that legitimately contain they/them regardless of subject
const IDIOMS = /what they (seem|appear)|healing that comes from them|comes from them/gi;
const HUMAN = /\b(emotional|feeling unsafe|unsafe|meditat\w*|romanc\w*|romantic|body|soothes?|self-doubt|self-criticism|childhood|siblings|children|lovers?|therapy|gut|instincts?|embarrass\w*|relationship friction)\b/i;
const JUNK = /undefined|NaN|\[object|\bnull\b|  |\s,|,,|\.\.(?!\.)| \./;

const sentences = (list) => list.flatMap((t) => t.split(/(?<=[.!?])\s+/));

test('self chart speaks to the reader and never uses they', () => {
  I.setSubject('HG', 'self');
  const list = passages('self', 'self', 'HG', 'Alex');
  const raw = list.join('\n');
  const text = raw.replace(IDIOMS, '');
  assert.ok(/\byou(r)?\b/i.test(text));
  assert.ok(!/\b(they|them|their|themselves)\b/i.test(text), 'person pronoun in a self chart');
  assert.ok(!JUNK.test(raw), 'template junk: ' + raw.match(JUNK));
});

test('another person: name and they; no second person anywhere, including advice', () => {
  I.setSubject('Alex', 'person');
  const list = passages('person', 'person', 'Alex', 'Sam');
  const text = list.join('\n');
  assert.ok(!/\byou(r|rself)?\b/i.test(text), 'second person: ' + sentences(list).find((s) => /\byou(r|rself)?\b/i.test(s)));
  assert.ok(/\b(they|their|themselves)\b/i.test(text));
  assert.ok(!/\bthey[.,;:!?]/i.test(text.replace(IDIOMS, '')), 'subject "they" used as an object: ' + sentences(list).find((x) => /\bthey[.,;:!?]/i.test(x)));
  assert.ok(!JUNK.test(text), 'template junk: ' + text.match(JUNK));
  assert.ok(!/may do well to do not/i.test(text));
});

for (const [kind, name] of [['place', 'United States'], ['event', 'Acme Inc']]) {
  test(`${kind} chart: no second person, no person pronouns, no human metaphors, clean agreement`, () => {
    I.setSubject(name, kind);
    const list = passages(kind, kind === 'place' ? 'event' : 'place', name, 'Partner Org');
    const text = list.join('\n');
    const bad = (re, label) => assert.ok(!re.test(text.replace(IDIOMS, '')), `${label}: ${sentences(list).find((s) => re.test(s.replace(IDIOMS, '')))}`);
    bad(/\byou(r|rself)?\b/i, 'second person');
    bad(/\b(they|them|their|themselves)\b/i, 'person pronoun for a non-person');
    bad(HUMAN, 'human metaphor');
    assert.ok(!JUNK.test(text), 'template junk: ' + text.match(JUNK)); // unmodified text: the idiom filter would itself leave gaps
    // a second verb after "and" must agree with "it": "presents itself and move" is wrong
    bad(/\bit (?:\w+ ){0,3}\w+s\b(?: itself)? (?:and|or|but) (?:move|make|take|bring|hold|build|get|find|create|use|act|feel|go|keep|see|let|present|show|lead|follow|reach|grow|start|stop|set|put)\b/i, 'verb agreement');
    bad(/\bit (are|have|were|do|go|don't)\b/i, 'verb agreement (it are/have/do)');
    assert.ok(/\b(it|its|itself)\b/i.test(text));
  });
}

test('place/event readings still carry the collective world layer and their own house language', () => {
  I.setSubject('Acme Inc', 'event');
  const text = passages('event', 'event').join('\n');
  assert.ok(/reputation|finances|operations|partners|foundations/i.test(text));
  I.setSubject('', 'self');
});

test('every sentence in every Type begins like a sentence', () => {
  for (const [name, kind] of [['HG', 'self'], ['Alex', 'person'], ['United States', 'place'], ['Acme Inc', 'event']]) {
    I.setSubject(name, kind);
    for (const s of sentences(passages(kind, kind))) {
      const t = s.trim();
      if (!t) continue;
      assert.ok(/^[A-Z0-9☉☽☿♀♂♃♄♅♆♇⚷"'(]/.test(t), `${kind}: "${t.slice(0, 60)}"`);
    }
  }
  I.setSubject('', 'self');
});

test('person vs organization comparison: each side is described in its own terms', () => {
  I.setSubject('Alex', 'person');
  const syn = synastryAspects(other.points, natal.points).slice(0, 25);
  const text = syn.map((a) => I.describeSynastry(a, 'Alex', 'Acme Inc', 'person', 'event').text).join('\n');
  // Acme Inc is chart B (its planets are the first possessive), Alex is chart A
  assert.ok(/Acme Inc's \w+ \((?:identity and leadership|public mood|communication|alliances and values|drive and competition|growth and goodwill|structure and commitment|change and unpredictability|ideals and image|power and transformation|old vulnerabilities and repair|shared direction|public image|reputation and role)\)/.test(text), 'collective wording for the organization side');
  assert.ok(!/Acme Inc's \w+ \((?:emotional needs|affection and values|tender spots and healing)\)/.test(text), 'person wording on the organization side');
  assert.ok(/Alex's \w+ \((?:identity and vitality|emotional needs|affection and values|drive and desire|commitment and limits)\)/.test(text), 'person wording on the person side');
  const sum = I.compareSummary(syn, 'Alex', 'Acme Inc', 'person', 'event');
  assert.ok(!/attraction/i.test(sum.climateText), 'romantic framing for an organization comparison');
  I.setSubject('', 'self');
});
