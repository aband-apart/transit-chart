import test from 'node:test';
import assert from 'node:assert/strict';
import { describePasses } from '../src/lib/passes.js';

const NOW = 2461320;
const fmt = (jd) => `D${jd - 2461000}`; // stable, locale-free

test('no exact passes: nothing to show', () => {
  assert.deepEqual(describePasses([], NOW, fmt), { kind: 'none' });
});

test('one pass stays a short single-date chip', () => {
  const ahead = describePasses([NOW + 30], NOW, fmt);
  assert.equal(ahead.kind, 'single');
  assert.equal(ahead.chip, 'Exact on D350');
  const past = describePasses([NOW - 30], NOW, fmt);
  assert.equal(past.chip, 'Exact on D290 (past)');
});

test('several passes become a compact label, never a run of dates in a chip', () => {
  const dates = [NOW - 400, NOW - 300, NOW - 100, NOW + 60, NOW + 200];
  const p = describePasses(dates, NOW, fmt);
  assert.equal(p.kind, 'multi');
  assert.equal(p.label, '5 exact passes');
  assert.equal(p.ahead, 2);
  assert.equal(p.chip, undefined, 'a multi-pass result has no chip text to wrap');
  assert.ok(!/D\d/.test(p.label), 'the label carries no dates');
  assert.equal(p.items.length, 5);
});

test('two passes pluralise, and the list is sorted with the next one flagged', () => {
  const p = describePasses([NOW + 90, NOW - 20], NOW, fmt); // deliberately out of order
  assert.equal(p.label, '2 exact passes');
  assert.deepEqual(p.items.map((i) => i.text), ['D300', 'D410']);
  assert.deepEqual(p.items.map((i) => i.past), [true, false]);
  assert.deepEqual(p.items.map((i) => i.next), [false, true]);
});

test('exactly one item is flagged "next", and none when every pass is past', () => {
  const some = describePasses([NOW - 5, NOW + 5, NOW + 50], NOW, fmt);
  assert.equal(some.items.filter((i) => i.next).length, 1);
  assert.equal(some.items.find((i) => i.next).jd, NOW + 5);
  const allPast = describePasses([NOW - 50, NOW - 5], NOW, fmt);
  assert.equal(allPast.ahead, 0);
  assert.equal(allPast.items.filter((i) => i.next).length, 0);
});

test('does not mutate its input', () => {
  const input = [NOW + 3, NOW - 3];
  describePasses(input, NOW, fmt);
  assert.deepEqual(input, [NOW + 3, NOW - 3]);
});
