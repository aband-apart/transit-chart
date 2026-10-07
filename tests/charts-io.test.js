import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProfile, parseImport, planImport, buildExport, signature, migrateKind, MAX_CHARTS } from '../src/lib/charts-io.js';

let n = 0;
const newId = () => `id${++n}`;
const good = { kind: 'person', name: 'Alex', date: '1992-02-10', time: '08:15', timeUnknown: false, place: 'Paris, France', lat: 48.85, lon: 2.35, tz: 'Europe/Paris', houseSystem: 'W' };
const file = (charts, extra = {}) => JSON.stringify({ format: 'transit-chart-backup', version: 1, charts, ...extra });

test('a valid chart is rebuilt from known fields only', () => {
  const r = normalizeProfile({ ...good, evil: '<script>', __proto__: { x: 1 }, id: 'attacker' }, newId);
  assert.ok(r.ok);
  assert.deepEqual(Object.keys(r.profile).sort(), ['date', 'houseSystem', 'id', 'kind', 'lat', 'lon', 'name', 'place', 'timeUnknown', 'tz', 'time'].sort());
  assert.notEqual(r.profile.id, 'attacker');
});

test('invalid charts are rejected with a reason', () => {
  const bad = (patch) => normalizeProfile({ ...good, ...patch }, newId);
  assert.match(bad({ date: '1992-13-40' }).reason, /date/);
  assert.match(bad({ date: '1992-02-30' }).reason, /real date/);
  assert.match(bad({ date: 'yesterday' }).reason, /date/);
  assert.match(bad({ time: '25:00' }).reason, /time/);
  assert.match(bad({ lat: 120 }).reason, /latitude/);
  assert.match(bad({ lon: 'x' }).reason, /longitude/);
  assert.match(bad({ tz: 'Mars/Olympus' }).reason, /time zone/);
  assert.equal(normalizeProfile(null, newId).ok, false);
  assert.equal(normalizeProfile([], newId).ok, false);
});

test('names and places are cleaned and capped; unknown kind/house fall back', () => {
  const r = normalizeProfile({ ...good, name: '  <b>Al\u0000ex</b>  '.padEnd(200, 'x'), kind: 'robot', houseSystem: 'Z' }, newId);
  assert.ok(r.ok);
  assert.ok(r.profile.name.length <= 80);
  assert.ok(!/[<>\u0000]/.test(r.profile.name));
  assert.equal(r.profile.kind, 'person');
  assert.equal(r.profile.houseSystem, 'W');
});

test('unknown birth time ignores the time field', () => {
  const r = normalizeProfile({ ...good, timeUnknown: true, time: 'garbage' }, newId);
  assert.ok(r.ok);
  assert.equal(r.profile.time, '12:00');
});

test('export then import round-trips and drops ids', () => {
  const saved = [{ id: 'a', ...good }, { id: 'b', ...good, name: 'Acme', kind: 'event' }];
  const { json, filename } = buildExport(saved, new Date('2026-10-07T12:00:00Z'));
  assert.equal(filename, 'transit-charts-2026-10-07.json');
  assert.ok(!json.includes('"id"'));
  const parsed = parseImport(json, newId);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.charts.length, 2);
  assert.equal(signature(parsed.charts[1]), signature(saved[1]));
});

test('files that are not backups are refused', () => {
  assert.match(parseImport('not json', newId).fileError, /valid JSON/);
  assert.match(parseImport('{"hello":1}', newId).fileError, /not a Transit Chart backup/);
  assert.match(parseImport(file([good], { version: 99 }), newId).fileError, /newer version/);
  assert.match(parseImport(JSON.stringify({ format: 'transit-chart-backup', version: 1, charts: 'x' }), newId).fileError, /no list/);
  assert.match(parseImport(file(Array.from({ length: MAX_CHARTS + 1 }, () => good)), newId).fileError, /more than/);
  assert.match(parseImport('x'.repeat(1_000_001), newId).fileError, /too large/);
});

test('a mixed file imports the valid charts and lists the invalid ones', () => {
  const p = parseImport(file([good, { ...good, date: 'nope', name: 'Broken' }, { ...good, name: 'Sam' }]), newId);
  assert.equal(p.charts.length, 2);
  assert.equal(p.errors.length, 1);
  assert.equal(p.errors[0].name, 'Broken');
  assert.equal(p.errors[0].index, 2);
});

test('merge skips duplicates (also inside the file); replace uses only the file', () => {
  const existing = [{ id: 'e1', ...good }, { id: 'e2', ...good, name: 'Sam' }];
  const incoming = parseImport(file([good, { ...good, name: 'Kim' }, { ...good, name: 'Kim' }]), newId).charts;
  const merge = planImport(existing, incoming, 'merge');
  assert.equal(merge.toAdd.length, 1);
  assert.equal(merge.duplicates.length, 2);
  assert.equal(merge.result.length, 3);
  assert.equal(merge.removed, 0);
  const replace = planImport(existing, incoming, 'replace');
  assert.equal(replace.result.length, 2); // Alex + Kim; the second Kim is a duplicate within the file
  assert.equal(replace.removed, 2);
  assert.ok(replace.result.every((c) => !existing.some((e) => e.id === c.id)));
});

test('planImport never mutates what is saved', () => {
  const existing = [{ id: 'e1', ...good }];
  const snapshot = JSON.stringify(existing);
  planImport(existing, parseImport(file([{ ...good, name: 'Kim' }]), newId).charts, 'merge');
  planImport(existing, parseImport(file([{ ...good, name: 'Kim' }]), newId).charts, 'replace');
  assert.equal(JSON.stringify(existing), snapshot);
});

test('migrateKind: old unnamed person charts become "self"', () => {
  assert.equal(migrateKind({ kind: 'person', name: '' }), 'self');
  assert.equal(migrateKind({ kind: 'person', name: 'Alex' }), 'person');
  assert.equal(migrateKind({ name: '' }), 'self');
  assert.equal(migrateKind({ kind: 'place', name: 'USA' }), 'place');
  assert.equal(migrateKind({ kind: 'self', name: 'HG' }), 'self');
  assert.equal(migrateKind({ kind: 'weird', name: 'x' }), 'person');
});
