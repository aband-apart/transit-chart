// What is selected on the wheel, and which marks should light up or fade because of it.
// A selection is either one aspect ({ aspect: 'saturn-square-sun' }) or one planet
// ({ planet: { side: 'natal' | 'transit', key: 'moon' } }).

export const aspectKey = (a) => `${a.transit}-${a.aspect}-${a.target}`;

export function sameSelection(a, b) {
  if (!a || !b) return !a && !b;
  if (a.aspect || b.aspect) return a.aspect === b.aspect;
  return a.planet?.side === b.planet?.side && a.planet?.key === b.planet?.key;
}

/**
 * @param {{transit:string,target:string,aspect:string}[]} aspects the aspects drawn on the wheel
 * @param {object|null} selection
 * @returns {{active:boolean, lines:Set<string>, natal:Set<string>, transit:Set<string>, primaryLine:string|null}}
 */
export function highlight(aspects, selection) {
  const out = { active: false, lines: new Set(), natal: new Set(), transit: new Set(), primaryLine: null };
  if (!selection) return out;

  if (selection.aspect) {
    const a = aspects.find((x) => aspectKey(x) === selection.aspect);
    if (!a) return out;
    out.active = true;
    out.primaryLine = selection.aspect;
    out.lines.add(selection.aspect);
    out.natal.add(a.target);
    out.transit.add(a.transit);
    return out;
  }

  const { side, key } = selection.planet ?? {};
  if (!side || !key) return out;
  out.active = true;
  (side === 'natal' ? out.natal : out.transit).add(key);
  for (const a of aspects) {
    const hit = side === 'natal' ? a.target === key : a.transit === key;
    if (!hit) continue;
    out.lines.add(aspectKey(a));
    out.natal.add(a.target);
    out.transit.add(a.transit);
  }
  return out;
}

/** The aspects that involve the selected planet, strongest first (for the detail card). */
export function aspectsFor(aspects, planet) {
  return aspects
    .filter((a) => (planet.side === 'natal' ? a.target === planet.key : a.transit === planet.key))
    .sort((x, y) => y.strength - x.strength);
}
