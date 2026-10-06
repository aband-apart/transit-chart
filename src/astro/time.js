// Convert a local wall-clock time in an IANA time zone to a UTC instant.
// Uses Intl, which carries the historical DST/offset rules of the tz database.

function offsetMs(utcMs, timeZone) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  });
  const p = Object.fromEntries(dtf.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * @param {{year:number,month:number,day:number,hour:number,minute:number}} local
 * @param {string} timeZone IANA name, e.g. "America/New_York"
 * @returns {number} UTC milliseconds
 */
export function localToUtcMs({ year, month, day, hour, minute }, timeZone) {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wall;
  // Iterate so we land on the right side of DST transitions.
  for (let i = 0; i < 3; i++) guess = wall - offsetMs(guess, timeZone);
  return guess;
}

export function isValidTimeZone(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
