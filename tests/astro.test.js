import test from 'node:test';
import assert from 'node:assert/strict';
import { initEphemeris, dateToJd, lonAt } from '../src/astro/ephemeris.js';
import { natalFromBirth, houseOf, signIndex } from '../src/astro/chart.js';
import { localToUtcMs } from '../src/astro/time.js';
import { angDiff, transitAspects } from '../src/astro/aspects.js';
import { forecast, aspectPasses } from '../src/astro/transits.js';

await initEphemeris();

test('Sun at J2000 is ~280.37° (10° Capricorn)', () => {
  const lon = lonAt('sun', dateToJd(Date.UTC(2000, 0, 1, 12)));
  assert.ok(Math.abs(lon - 280.37) < 0.02, `got ${lon}`);
});

test('local time converts through DST correctly', () => {
  // New York, 4 July 1990 14:30 EDT = 18:30 UTC
  const ms = localToUtcMs({ year: 1990, month: 7, day: 4, hour: 14, minute: 30 }, 'America/New_York');
  assert.equal(new Date(ms).toISOString(), '1990-07-04T18:30:00.000Z');
  // Winter: EST = UTC-5
  const w = localToUtcMs({ year: 1990, month: 1, day: 4, hour: 14, minute: 30 }, 'America/New_York');
  assert.equal(new Date(w).toISOString(), '1990-01-04T19:30:00.000Z');
});

test('natal chart for a known birth', () => {
  const n = natalFromBirth({ year: 1990, month: 7, day: 4, hour: 14, minute: 30, timeZone: 'America/New_York', lat: 40.7128, lon: -74.006 });
  assert.equal(signIndex(n.points.sun.lon), 3); // Cancer
  assert.equal(signIndex(n.points.asc.lon), 6); // Libra rising
  assert.equal(n.cusps.length, 12);
  assert.equal(n.points.sun.house, 9);
});

test('houseOf wraps around 360°', () => {
  const cusps = [350, 20, 50, 80, 110, 140, 170, 200, 230, 260, 290, 320];
  assert.equal(houseOf(355, cusps), 1);
  assert.equal(houseOf(10, cusps), 1);
  assert.equal(houseOf(25, cusps), 2);
  assert.equal(houseOf(330, cusps), 12);
});

test('angDiff is signed and wrapped', () => {
  assert.equal(angDiff(10, 350), 20);
  assert.equal(angDiff(350, 10), -20);
});

test('transit aspects respect orbs and applying/separating', () => {
  const natalPts = { sun: { lon: 100 } };
  const t = { saturn: { lon: 190.5, speed: 0.05, retro: false } };
  const a = transitAspects(t, natalPts).find((x) => x.aspect === 'square');
  assert.ok(a);
  assert.ok(Math.abs(a.orb - 0.5) < 1e-9);
  assert.equal(a.applying, false); // already past exact and moving away
});

test('exact passes are found and bracket the exact degree', () => {
  const n = natalFromBirth({ year: 1990, month: 7, day: 4, hour: 14, minute: 30, timeZone: 'America/New_York', lat: 40.7128, lon: -74.006 });
  const jd = dateToJd(Date.UTC(2026, 9, 6, 12));
  const asp = { transit: 'saturn', targetLon: n.points.sun.lon, angle: 90 };
  const { all } = aspectPasses(asp, jd);
  assert.ok(all.length >= 1);
  for (const j of all) {
    const lon = lonAt('saturn', j);
    const d = Math.min(
      Math.abs(angDiff(lon, n.points.sun.lon + 90)),
      Math.abs(angDiff(lon, n.points.sun.lon - 90)),
    );
    assert.ok(d < 0.01, `pass off by ${d}°`);
  }
});

test('forecast contains lunations ~29.5 days apart and is sorted', () => {
  const n = natalFromBirth({ year: 1990, month: 7, day: 4, hour: 14, minute: 30, timeZone: 'America/New_York', lat: 40.7128, lon: -74.006 });
  const jd = dateToJd(Date.UTC(2026, 9, 6));
  const ev = forecast(n, jd, jd + 120);
  const news = ev.filter((e) => e.type === 'lunation' && e.phase === 'new');
  assert.ok(news.length >= 4);
  assert.ok(Math.abs(news[1].jd - news[0].jd - 29.5) < 1);
  for (let i = 1; i < ev.length; i++) assert.ok(ev[i].jd >= ev[i - 1].jd);
});

test('house systems: Whole Sign counts houses from the Rising sign', () => {
  const birth = { year: 1990, month: 7, day: 4, hour: 14, minute: 30, timeZone: 'America/New_York', lat: 40.7128, lon: -74.006 };
  const placidus = natalFromBirth({ ...birth, houseSystem: 'P' });
  const whole = natalFromBirth({ ...birth, houseSystem: 'W' });
  // Libra rising, Sun in Cancer: Cancer is the 10th sign from Libra
  assert.equal(whole.points.sun.house, 10);
  assert.equal(placidus.points.sun.house, 9);
  assert.ok(whole.cusps.every((c, i) => c === ((6 + i) % 12) * 30));
  assert.equal(whole.asc, placidus.asc); // angles don't depend on house system
});

test('natal chart includes South Node, true Lilith and Pallas', () => {
  const n = natalFromBirth({ year: 1990, month: 7, day: 4, hour: 14, minute: 30, timeZone: 'America/New_York', lat: 40.7128, lon: -74.006 });
  assert.ok(Math.abs(angDiff(n.points.southnode.lon, n.points.node.lon + 180)) < 1e-9);
  for (const k of ['lilith', 'pallas', 'ic', 'dsc']) assert.ok(Number.isFinite(n.points[k].lon), k);
});
