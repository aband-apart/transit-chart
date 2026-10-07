// Pure helpers for exporting, validating and merging saved charts (no DOM, easy to test).
import { isValidTimeZone } from '../astro/time.js';

export const KINDS = ['self', 'person', 'place', 'event'];
export const HOUSE_SYSTEM_KEYS = ['W', 'P', 'E'];
export const EXPORT_FORMAT = 'transit-chart-backup';
export const EXPORT_VERSION = 1;
export const MAX_FILE_BYTES = 1_000_000;
export const MAX_CHARTS = 200;

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, max);

/** Older saves only knew 'person'. A person with no name was the owner's own chart. */
export function migrateKind(profile) {
  if (KINDS.includes(profile.kind) && profile.kind !== 'person') return profile.kind;
  if (profile.kind === 'person' || !profile.kind) return profile.name ? 'person' : 'self';
  return 'person';
}

/** Two charts are "the same" when name, moment and place match. */
export function signature(p) {
  return [
    String(p.name ?? '').trim().toLowerCase(),
    p.date,
    p.timeUnknown ? '?' : p.time,
    Number(p.lat).toFixed(3),
    Number(p.lon).toFixed(3),
    p.tz,
  ].join('|');
}

/**
 * Validate one chart from untrusted input and rebuild it from known fields only.
 * @returns {{ok:true, profile:object}|{ok:false, reason:string}}
 */
export function normalizeProfile(raw, newId) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'not a chart object' };

  const date = String(raw.date ?? '');
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dm) return { ok: false, reason: 'date must look like 1990-07-04' };
  const [y, mo, d] = [+dm[1], +dm[2], +dm[3]];
  const check = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1000 || y > 2399 || check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    return { ok: false, reason: 'date is not a real date between 1000 and 2399' };
  }

  const timeUnknown = raw.timeUnknown === true;
  let time = '12:00';
  if (!timeUnknown) {
    const tm = /^(\d{2}):(\d{2})$/.exec(String(raw.time ?? '12:00'));
    if (!tm || +tm[1] > 23 || +tm[2] > 59) return { ok: false, reason: 'time must look like 14:30' };
    time = `${tm[1]}:${tm[2]}`;
  }

  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return { ok: false, reason: 'latitude must be between -90 and 90' };
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) return { ok: false, reason: 'longitude must be between -180 and 180' };

  const tz = clean(raw.tz, 64);
  if (!tz || !isValidTimeZone(tz)) return { ok: false, reason: 'time zone is not recognised' };

  return {
    ok: true,
    profile: {
      id: newId(),
      kind: KINDS.includes(raw.kind) ? raw.kind : 'person',
      name: clean(raw.name, 80),
      date,
      time,
      timeUnknown,
      place: clean(raw.place, 160),
      lat,
      lon,
      tz,
      houseSystem: HOUSE_SYSTEM_KEYS.includes(raw.houseSystem) ? raw.houseSystem : 'W',
    },
  };
}

/** The backup file's contents and a dated filename. */
export function buildExport(profiles, now = new Date()) {
  const payload = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    note: 'Contains birth details. Keep this file private.',
    charts: profiles.map(({ id, ...rest }) => rest),
  };
  const stamp = now.toISOString().slice(0, 10);
  return { json: JSON.stringify(payload, null, 2), filename: `transit-charts-${stamp}.json` };
}

/**
 * Parse and validate a backup file's text.
 * @returns {{fileError?:string, charts:object[], errors:{index:number,name:string,reason:string}[]}}
 */
export function parseImport(text, newId) {
  if (typeof text !== 'string' || text.length > MAX_FILE_BYTES) return { fileError: 'That file is too large to be a chart backup.', charts: [], errors: [] };
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return { fileError: "That file isn't valid JSON, so it can't be a chart backup.", charts: [], errors: [] };
  }
  if (!data || typeof data !== 'object' || data.format !== EXPORT_FORMAT) {
    return { fileError: 'That file is not a Transit Chart backup.', charts: [], errors: [] };
  }
  if (!Number.isInteger(data.version) || data.version > EXPORT_VERSION) {
    return { fileError: 'That backup was made by a newer version of the app.', charts: [], errors: [] };
  }
  if (!Array.isArray(data.charts)) return { fileError: 'That backup has no list of charts.', charts: [], errors: [] };
  if (data.charts.length > MAX_CHARTS) return { fileError: `That backup has more than ${MAX_CHARTS} charts.`, charts: [], errors: [] };

  const charts = [];
  const errors = [];
  data.charts.forEach((raw, index) => {
    const r = normalizeProfile(raw, newId);
    if (r.ok) charts.push(r.profile);
    else errors.push({ index: index + 1, name: clean(raw?.name, 40) || `Chart ${index + 1}`, reason: r.reason });
  });
  return { charts, errors };
}

/**
 * Work out what an import would do, without changing anything.
 * @param {object[]} existing saved charts
 * @param {object[]} incoming validated charts from the file
 * @param {'merge'|'replace'} mode
 */
export function planImport(existing, incoming, mode) {
  const seen = new Set(mode === 'merge' ? existing.map(signature) : []);
  const toAdd = [];
  const duplicates = [];
  for (const c of incoming) {
    const sig = signature(c);
    if (seen.has(sig)) duplicates.push(c);
    else { seen.add(sig); toAdd.push(c); }
  }
  const result = mode === 'replace' ? toAdd : [...existing, ...toAdd];
  return { mode, toAdd, duplicates, removed: mode === 'replace' ? existing.length : 0, result };
}
