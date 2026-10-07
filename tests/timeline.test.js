import test from 'node:test';
import assert from 'node:assert/strict';
import { eventKind, firstSentence, groupEvents, activeFilterCount } from '../src/lib/timeline.js';

const day0 = 2461320.5; // an arbitrary JD
const ev = (offset, extra = {}) => ({ jd: day0 + offset, type: 'aspect', ...extra });

test('eventKind labels each event type', () => {
  assert.equal(eventKind({ type: 'aspect' }).label, 'Transit');
  assert.equal(eventKind({ type: 'outer' }).label, 'World cycle');
  assert.equal(eventKind({ type: 'station', direction: 'retrograde' }).label, 'Retrograde');
  assert.equal(eventKind({ type: 'station', direction: 'direct' }).label, 'Direct');
  assert.equal(eventKind({ type: 'ingress' }).label, 'Sign change');
  assert.equal(eventKind({ type: 'lunation', phase: 'new' }).label, 'New Moon');
  assert.equal(eventKind({ type: 'lunation', phase: 'full' }).label, 'Full Moon');
  assert.equal(eventKind({ type: 'lunation', phase: 'full', eclipse: true }).label, 'Eclipse');
  assert.equal(eventKind({ type: 'weird' }).key, 'other');
});

test('firstSentence takes one sentence and shortens long ones', () => {
  assert.equal(firstSentence('Saturn presses. Then it eases.'), 'Saturn presses.');
  assert.equal(firstSentence('No full stop here'), 'No full stop here');
  assert.equal(firstSentence(''), '');
  assert.ok(firstSentence('x'.repeat(300)).endsWith('…'));
  assert.equal(firstSentence('x'.repeat(300), 50).length, 50);
});

test('up to 90 days groups by week from the anchor, in order', () => {
  const groups = groupEvents([ev(0), ev(2), ev(6.9), ev(7), ev(15), ev(15.5)], day0, 30, 'en-US');
  assert.deepEqual(groups.map((g) => g.key), ['w0', 'w1', 'w2']);
  assert.deepEqual(groups.map((g) => g.items.length), [3, 1, 2]);
  assert.match(groups[0].label, /^This week/);
  assert.match(groups[1].label, /^Next week/);
  assert.ok(!/week/i.test(groups[2].label));
});

test('events before the anchor fall into the first week rather than a negative one', () => {
  assert.deepEqual(groupEvents([ev(-3)], day0, 30, 'en-US').map((g) => g.key), ['w0']);
});

test('longer ranges group by calendar month', () => {
  const groups = groupEvents([ev(0), ev(3), ev(40), ev(80)], day0, 365, 'en-US');
  assert.ok(groups.length >= 3 && groups.length <= 4);
  assert.ok(groups.every((g) => /^[A-Z][a-z]+ \d{4}$/.test(g.label)));
  assert.equal(groups.reduce((n, g) => n + g.items.length, 0), 4);
});

test('activeFilterCount counts switches away from their default', () => {
  const defaults = { aspect: true, station: true, minor: false };
  assert.equal(activeFilterCount({ aspect: true, station: true, minor: false }, defaults), 0);
  assert.equal(activeFilterCount({ aspect: false, station: true, minor: true }, defaults), 2);
});
