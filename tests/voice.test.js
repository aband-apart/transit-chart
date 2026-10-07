import test from 'node:test';
import assert from 'node:assert/strict';
import { setSubject, voice, advice, possessive, isSelfVoice } from '../src/astro/interpret.js';
import { PLANETS } from '../src/data/astro-data.js';

const reset = () => setSubject('', 'self');

test('self chart is left as written (you/your)', () => {
  setSubject('HG', 'self');
  assert.ok(isSelfVoice());
  assert.equal(voice('Your Moon makes you shine'), 'Your Moon makes you shine');
  assert.equal(advice('Pace yourself and pick one thing.'), 'Pace yourself and pick one thing.');
  reset();
});

test('another person: name + they/them', () => {
  setSubject('Alex', 'person');
  assert.equal(voice('Your core identity and what makes you shine'), "Alex's core identity and what makes them shine");
  assert.equal(voice('how others mirror you and what you value'), 'how others mirror them and what they value');
  assert.equal(voice('You are asked to take responsibility.'), 'They are asked to take responsibility.');
  assert.equal(voice("you're ready, express yourself"), "they're ready, express themselves");
  assert.equal(voice('Your emotional needs and what soothes you.'), "Alex's emotional needs and what soothes them.");
  assert.equal(voice('what moves you, and what you need'), 'what moves them, and what they need');
  reset();
});

test('country/event: name + it/its with agreeing verbs, never "they"', () => {
  setSubject('Acme Inc', 'event');
  assert.equal(voice('what you value and who you are'), 'what it values and who it is');
  assert.equal(voice('You are asked to take responsibility.'), 'It is asked to take responsibility.');
  assert.equal(voice('what you actually want, because you can rebuild it'), 'what it actually wants, because it can rebuild it');
  assert.equal(voice('express yourself and what makes you shine'), 'express itself and what makes it shine');
  assert.equal(voice('Your history'), "Acme Inc's history");
  assert.equal(voice('what soothes you.'), 'what soothes it.');
  assert.equal(voice('how you present yourself and move through the world'), 'how it presents itself and moves through the world');
  assert.equal(voice('you can build it and take it further'), 'it can build it and take it further');
  reset();
});

test('advice becomes suggestions about the subject, with lead-ins that rotate by list position', () => {
  setSubject('Alex', 'person');
  assert.equal(advice('Pace yourself and pick one thing to lead on instead of taking on everything.', 0),
    'Alex may do well to pace themselves and pick one thing to lead on instead of taking on everything.');
  assert.equal(advice('Put yourself forward; visibility can work in your favor right now.', 1),
    'It could help Alex to put themselves forward; visibility can work in their favor right now.');
  assert.equal(advice('Name the feeling before you act on it.', 2), 'Alex could try to name the feeling before they act on it.');
  assert.equal(advice('Do the unglamorous work and set a boundary you have been avoiding.', 3),
    'A good move for Alex is to do the unglamorous work and set a boundary they have been avoiding.');
  assert.equal(advice('Verify facts and keep your boundaries clear. Hold off on big decisions while things feel foggy.', 4),
    'Alex has room to verify facts and keep their boundaries clear. Alex might also hold off on big decisions while things feel foggy.');
  // neighbouring list items never share a lead-in
  const leads = [0, 1, 2, 3].map((i) => advice('Plan something beautiful.', i).split(' ').slice(0, 3).join(' '));
  assert.equal(new Set(leads).size, 4);
  // "avoid" lines only use lead-ins that read naturally with "avoid", and still rotate
  const avoidLeads = [0, 1, 2].map((i) => advice('Avoid shortcuts.', i));
  assert.equal(new Set(avoidLeads.map((x) => x.split(' ').slice(0, 3).join(' '))).size, 3);
  assert.ok(avoidLeads.every((x) => /to avoid shortcuts\.$/.test(x)));
  assert.ok(!avoidLeads.some((x) => /could try to avoid|has room to avoid/.test(x)));
  setSubject('United States', 'place');
  assert.equal(advice('Say what you actually want and avoid people-pleasing.', 0), 'United States may do well to say what it actually wants and avoid people-pleasing.');
  assert.equal(advice('Share what you have learned. Your history helps others.', 0), 'United States may do well to share what it has learned. Its history helps others.');
  assert.equal(advice('Take decisive action on something you have been delaying.', 1), 'It could help United States to take decisive action on something it has been delaying.');
  reset();
});

test('every advice line is rewritten cleanly in every voice', () => {
  const lines = Object.values(PLANETS).flatMap((p) => [p.hardTip, p.softTip, p.avoid]).filter(Boolean);
  assert.ok(lines.length >= 30);
  for (const [name, kind] of [['Alex', 'person'], ['Acme Inc', 'event']]) {
    setSubject(name, kind);
    for (const line of lines) {
      const out = advice(line);
      assert.ok(!/\byou(r|rself)?\b/i.test(out), `leftover second person: ${out}`);
      assert.ok(!/may do well to do not|may do well to avoid avoid/i.test(out), `awkward: ${out}`);
      assert.ok(out.startsWith(name) || !/^[A-Z][a-z-]+ /.test(line) || out.length > 0);
      if (kind === 'event') assert.ok(!/\bthey\b|\bthemselves\b/i.test(out), `person pronoun for non-person: ${out}`);
    }
  }
  reset();
});

test('possessive handles names ending in s, and self falls back to your', () => {
  setSubject('Chris', 'person');
  assert.equal(possessive(), "Chris'");
  setSubject('United States', 'place');
  assert.equal(possessive(), "United States'");
  reset();
  assert.equal(possessive(), 'your');
});

test('the name appears once per sentence; later possessives become their/its', () => {
  setSubject('Alex', 'person');
  assert.equal(voice('How you meet the world and your motivation for living.'), 'How they meet the world and their motivation for living.');
  assert.equal(voice('Your core identity and what makes you shine, and your sense of purpose.'), "Alex's core identity and what makes them shine, and their sense of purpose.");
  // a new sentence starts fresh
  assert.equal(voice('Your Moon is steady. Your Sun is bright.'), "Alex's Moon is steady. Alex's Sun is bright.");
  setSubject('Acme Inc', 'event');
  assert.equal(voice('Your reputation and your public direction.'), "Acme Inc's reputation and its public direction.");
  reset();
});
