import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStep, firstInvalidStep } from '../src/lib/form-steps.js';

const ok = { date: '1990-07-04', time: '14:30', timeUnknown: false, lat: 40.7, lon: -74, tz: 'America/New_York' };

test('a complete chart validates on every step', () => {
  for (const s of [1, 2, 3]) assert.equal(validateStep(s, ok), '');
  assert.equal(firstInvalidStep(ok), null);
});

test('step 1: date and time', () => {
  assert.match(validateStep(1, { ...ok, date: '' }), /Enter the date/);
  assert.match(validateStep(1, { ...ok, date: '1990-02-30' }), /real date/);
  assert.match(validateStep(1, { ...ok, date: '0999-01-01' }), /real date/);
  assert.match(validateStep(1, { ...ok, time: '' }), /Enter the time/);
  assert.match(validateStep(1, { ...ok, time: '25:61' }), /Enter the time/);
  assert.equal(validateStep(1, { ...ok, time: '', timeUnknown: true }), '');
});

test('step 2: place needs coordinates and a time zone', () => {
  assert.match(validateStep(2, { ...ok, lat: '', lon: '' }), /Search for a place/);
  assert.match(validateStep(2, { ...ok, lat: null, lon: null }), /Search for a place/);
  assert.match(validateStep(2, { ...ok, lat: 95 }), /Latitude/);
  assert.match(validateStep(2, { ...ok, lon: 200 }), /Latitude must be/);
  assert.match(validateStep(2, { ...ok, tz: '' }), /time zone is needed/);
  assert.match(validateStep(2, { ...ok, tz: 'Mars/Base' }), /not recognised/);
  assert.equal(validateStep(2, { ...ok, lat: '0', lon: '0' }), ''); // 0,0 is a valid place
});

test('step 3 re-checks everything and firstInvalidStep points at the culprit', () => {
  assert.match(validateStep(3, { ...ok, date: '' }), /Enter the date/);
  assert.equal(firstInvalidStep({ ...ok, date: '' }), 1);
  assert.equal(firstInvalidStep({ ...ok, tz: '' }), 2);
});
