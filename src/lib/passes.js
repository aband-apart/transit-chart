// How a transit's exact dates are summarised. One date stays a short chip ("Exact on Oct 12, 2026").
// Several (retrograde loops make the same degree exact more than once) become a compact label
// ("5 exact passes") with the dates in a list, instead of a long run of dates wrapping inside a pill.

/**
 * @param {number[]} all exact Julian days, ascending
 * @param {number} nowJd the chart's current Julian day
 * @param {(jd:number)=>string} fmt formats a date
 * @returns {{kind:'none'}|{kind:'single', chip:string, items:object[]}|{kind:'multi', label:string, ahead:number, items:object[]}}
 */
export function describePasses(all, nowJd, fmt) {
  const items = [...all].sort((a, b) => a - b).map((jd) => ({ jd, text: fmt(jd), past: jd < nowJd, next: false }));
  if (!items.length) return { kind: 'none' };
  const nextIndex = items.findIndex((i) => !i.past);
  if (nextIndex >= 0) items[nextIndex].next = true;
  if (items.length === 1) {
    return { kind: 'single', chip: `Exact on ${items[0].text}${items[0].past ? ' (past)' : ''}`, items };
  }
  return {
    kind: 'multi',
    label: `${items.length} exact passes`,
    ahead: items.filter((i) => !i.past).length,
    items,
  };
}
