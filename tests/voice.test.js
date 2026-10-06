import test from 'node:test';
import assert from 'node:assert/strict';
import { setSubject, voice, possessive } from '../src/astro/interpret.js';

test('voice is a no-op without a name', () => {
  setSubject('');
  assert.equal(voice('Your Moon makes you shine'), 'Your Moon makes you shine');
});

test('voice rewrites possessives, subjects and objects', () => {
  setSubject('Alex');
  assert.equal(voice('Your core identity and what makes you shine'), "Alex's core identity and what makes them shine");
  assert.equal(voice('how others mirror you and what you value'), 'how others mirror them and what they value');
  assert.equal(voice('You are asked to take responsibility.'), 'They are asked to take responsibility.');
  assert.equal(voice('people feel at ease with you'), 'people feel at ease with them');
  assert.equal(voice("you're ready, express yourself"), "they're ready, express themselves");
  setSubject('');
});

test('possessive handles names ending in s', () => {
  setSubject('Chris');
  assert.equal(possessive(), "Chris'");
  setSubject('United States');
  assert.equal(possessive(), "United States'");
  setSubject('');
});
