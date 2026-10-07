// Validation for the guided chart form. Each step reports the first problem it finds, or '' when it is fine.
import { isValidTimeZone } from '../astro/time.js';

export const STEP_TITLES = { 1: 'Date and time', 2: 'Place', 3: 'Review' };

/** @param {{date:string,time:string,timeUnknown:boolean,lat:any,lon:any,tz:string}} v */
export function validateStep(step, v) {
  if (step === 1) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.date || '');
    if (!m) return 'Enter the date.';
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    const real = new Date(Date.UTC(y, mo - 1, d));
    if (y < 1000 || y > 2399 || real.getUTCMonth() !== mo - 1 || real.getUTCDate() !== d) return 'That date does not look right. Use a real date between the years 1000 and 2399.';
    if (!v.timeUnknown && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v.time || '')) return 'Enter the time, or tick "I don\'t know the time".';
    return '';
  }
  if (step === 2) {
    const lat = Number(v.lat);
    const lon = Number(v.lon);
    if (v.lat === '' || v.lon === '' || v.lat == null || v.lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      return 'Search for a place and choose a result, or enter coordinates manually.';
    }
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return 'Latitude must be −90 to 90 and longitude −180 to 180.';
    if (!v.tz) return 'A time zone is needed. Choose a search result, or enter one under Advanced options.';
    if (!isValidTimeZone(v.tz)) return 'That time zone is not recognised. Use a name like America/New_York.';
    return '';
  }
  if (step === 3) return validateStep(1, v) || validateStep(2, v);
  return '';
}

/** First step with a problem (so "Calculate" can send people back to it), or null. */
export function firstInvalidStep(v) {
  for (const s of [1, 2]) if (validateStep(s, v)) return s;
  return null;
}
