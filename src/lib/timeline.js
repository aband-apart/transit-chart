// Forecast timeline helpers: classify events and group them by week or month. Pure, so it can be tested.

const jdToMs = (jd) => (jd - 2440587.5) * 86400000;
const WEEK = 7;

/** A short badge for each event type. */
export function eventKind(e) {
  if (e.type === 'aspect') return { key: 'aspect', label: 'Transit' };
  if (e.type === 'outer') return { key: 'outer', label: 'World cycle' };
  if (e.type === 'station') return { key: 'station', label: e.direction === 'retrograde' ? 'Retrograde' : 'Direct' };
  if (e.type === 'ingress') return { key: 'ingress', label: 'Sign change' };
  if (e.type === 'lunation') return { key: 'lunation', label: e.eclipse ? 'Eclipse' : e.phase === 'new' ? 'New Moon' : 'Full Moon' };
  return { key: 'other', label: 'Event' };
}

/** First sentence of a longer passage, for one-line summaries. */
export function firstSentence(text, max = 140) {
  const m = /^.*?[.!?](?=\s|$)/.exec(String(text ?? '').trim());
  const s = (m ? m[0] : String(text ?? '')).trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

const fmt = (jd, opts, locale) => new Date(jdToMs(jd)).toLocaleDateString(locale, opts);

/**
 * Group events (sorted by jd) for display.
 * Up to 90 days: weekly groups counted from `fromJd`; longer: calendar months.
 * @returns {{key:string, label:string, items:object[]}[]}
 */
export function groupEvents(events, fromJd, days, locale) {
  const groups = new Map();
  for (const e of events) {
    let key;
    let label;
    if (days <= 90) {
      const w = Math.max(0, Math.floor((e.jd - fromJd) / WEEK));
      key = `w${w}`;
      const start = fromJd + w * WEEK;
      const range = `${fmt(start, { month: 'short', day: 'numeric' }, locale)} – ${fmt(start + WEEK - 1, { month: 'short', day: 'numeric' }, locale)}`;
      label = w === 0 ? `This week · ${range}` : w === 1 ? `Next week · ${range}` : range;
    } else {
      const d = new Date(jdToMs(e.jd));
      key = `m${d.getFullYear()}-${d.getMonth()}`;
      label = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
    if (!groups.has(key)) groups.set(key, { key, label, items: [] });
    groups.get(key).items.push(e);
  }
  return [...groups.values()];
}

/** How many of the filter switches are not at their default, for the "Filters (n)" label. */
export function activeFilterCount(filters, defaults) {
  return Object.keys(defaults).filter((k) => !!filters[k] !== !!defaults[k]).length;
}
