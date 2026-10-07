import test from 'node:test';
import assert from 'node:assert/strict';
import { highlight, aspectsFor, sameSelection, aspectKey } from '../src/ui/selection.js';

const aspects = [
  { transit: 'saturn', aspect: 'square', target: 'sun', strength: 50 },
  { transit: 'saturn', aspect: 'trine', target: 'moon', strength: 90 },
  { transit: 'mars', aspect: 'conjunction', target: 'sun', strength: 70 },
  { transit: 'venus', aspect: 'sextile', target: 'mc', strength: 20 },
];

test('no selection highlights nothing', () => {
  const h = highlight(aspects, null);
  assert.equal(h.active, false);
  assert.equal(h.lines.size, 0);
});

test('selecting an aspect highlights its line and both planets', () => {
  const h = highlight(aspects, { aspect: 'saturn-square-sun' });
  assert.ok(h.active);
  assert.deepEqual([...h.lines], ['saturn-square-sun']);
  assert.deepEqual([...h.natal], ['sun']);
  assert.deepEqual([...h.transit], ['saturn']);
  assert.equal(h.primaryLine, 'saturn-square-sun');
});

test('selecting a transiting planet highlights all its aspects and partners', () => {
  const h = highlight(aspects, { planet: { side: 'transit', key: 'saturn' } });
  assert.deepEqual([...h.lines].sort(), ['saturn-square-sun', 'saturn-trine-moon']);
  assert.deepEqual([...h.natal].sort(), ['moon', 'sun']);
  assert.deepEqual([...h.transit], ['saturn']);
  assert.equal(h.primaryLine, null);
});

test('selecting a natal planet highlights every transit touching it', () => {
  const h = highlight(aspects, { planet: { side: 'natal', key: 'sun' } });
  assert.deepEqual([...h.transit].sort(), ['mars', 'saturn']);
  assert.deepEqual([...h.natal], ['sun']);
  assert.equal(h.lines.size, 2);
});

test('a planet with no aspects is still "active" so everything else fades', () => {
  const h = highlight(aspects, { planet: { side: 'natal', key: 'pluto' } });
  assert.ok(h.active);
  assert.equal(h.lines.size, 0);
  assert.deepEqual([...h.natal], ['pluto']);
});

test('a stale selection (aspect no longer present) falls back to no highlight', () => {
  assert.equal(highlight(aspects, { aspect: 'pluto-square-venus' }).active, false);
});

test('aspectsFor sorts by strength and respects side', () => {
  assert.deepEqual(aspectsFor(aspects, { side: 'transit', key: 'saturn' }).map(aspectKey), ['saturn-trine-moon', 'saturn-square-sun']);
  assert.deepEqual(aspectsFor(aspects, { side: 'natal', key: 'sun' }).map(aspectKey), ['mars-conjunction-sun', 'saturn-square-sun']);
});

test('sameSelection compares aspects and planets', () => {
  assert.ok(sameSelection(null, null));
  assert.ok(!sameSelection({ aspect: 'a' }, null));
  assert.ok(sameSelection({ aspect: 'a' }, { aspect: 'a' }));
  assert.ok(sameSelection({ planet: { side: 'natal', key: 'sun' } }, { planet: { side: 'natal', key: 'sun' } }));
  assert.ok(!sameSelection({ planet: { side: 'natal', key: 'sun' } }, { planet: { side: 'transit', key: 'sun' } }));
});
