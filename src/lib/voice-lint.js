// Checks interpretive text against docs/voice-guide.md. It is a safety net, not a judge of warmth:
// it flags unsupported certainty, unhedged outcome claims, stacked hedges, hedge density and repetition,
// and deliberately leaves facts, conventions and advice alone.

export const splitSentences = (text) =>
  String(text ?? '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

/** Words and phrases that assert certainty about life outcomes. */
export const CERTAINTY = [
  /\bforces?\b/i, /\bensures?\b/i, /\bguarantee[sd]?\b/i, /\binevitabl[ey]\b/i, /\bdestined\b/i,
  /\bbound to\b/i, /\bsure to\b/i, /\bdefinitely\b/i, /\bcertainly\b/i, /\bsurely\b/i, /\bwithout fail\b/i,
  /\bfor certain\b/i, /\balways\b/i, /\bnever\b/i, /\breliable guide\b/i,
  // "will" about what a transit does to someone; plain future facts ("the Moon will be full") are fine
  /\b(?:will|won't) (?:bring|lead|cause|result|make|change|end|happen|force|open|transform|attract|heal|solve|fix|ruin|destroy|define|reward)\b/i,
  /\b(?:you|they|it)(?:'ll| will) (?:find|meet|feel|get|see|have|discover|experience|attract|lose|succeed)\b/i,
];

/** Outcome claims that need a qualifier unless they are advice, facts or conventions. */
export const OUTCOME = [
  /\bpays? off\b/i, /\bland(?:s)? well\b/i, /\b(?:is|are) rewarded\b/i, /\bdoors? open\b/i,
  /\bcomes? (?:more )?easily\b/i, /\bcome (?:more )?easily\b/i, /\bgets? (?:exposed|pressed)\b/i,
  /\b(?:is|are) (?:stripped back|reborn)\b/i, /\bgets? a big push\b/i, /\bbecomes? an asset\b/i,
  /\bfeels? natural\b/i, /\bcommitments hold\b/i, /\bsmoother\b/i, /\bgrows?\b(?= for years)/i,
];

const HEDGE_WORDS = [
  'can', 'could', 'may', 'might', 'often', 'tend', 'tends', 'typically', 'usually', 'sometimes', 'likely',
  'possible', 'possibly', 'perhaps', 'maybe', 'chance', 'opportunity', 'invites', 'invite', 'suggests', 'suggest',
  'traditionally', 'window', 'asks', 'offers', 'seems', 'associated', 'common', 'commonly', 'worth',
  'potential', 'capacity', 'room', 'tendency', 'feels', 'feel', 'read',
];
export const HEDGE = new RegExp(`\\b(?:${HEDGE_WORDS.join('|')})\\b|\\bpoints? to\\b|\\bgood (?:time|window|moment|chance)\\b|\\ba time (?:for|to)\\b`, 'i');
// Strict hedges are the ones that read as hesitation when piled up.
const STRICT = /\b(?:may|might|could|perhaps|possibly|maybe|tends?|often|sometimes|usually|typically)\b/gi;

const IMPERATIVE_START = /^(?:pace|put|name|trust|re-read|pitch|say|plan|channel|take|do|avoid|stop|choose|invest|share|be|get|make|commit|experiment|verify|ask|leave|keep|stay|set|notice|go|hold|test|reach|try|let|give|start|finish|rest|check|focus|look|listen|write|call|slow|build)\b/i;
const ADVICE_LEAD = /\b(?:may (?:also )?do well|could (?:try|help)|a good move|has room to|can also|worth (?:trying|noticing))\b/i;
const DEFINITION = /^(?:in astrology|an? (?:conjunction|opposition|square|trine|sextile)\b)|\bthe planet of\b|\btraditionally\b|\bis (?:often )?read as\b/i;

const isAdvice = (s) => IMPERATIVE_START.test(s) || ADVICE_LEAD.test(s);

/**
 * Findings for one interpretive passage.
 * @returns {{type:string, sentence:string}[]}
 */
export function lintText(text) {
  const findings = [];
  for (const s of splitSentences(text)) {
    for (const re of CERTAINTY) {
      if (re.test(s)) { findings.push({ type: 'certainty', sentence: s, match: s.match(re)[0] }); break; }
    }
    const outcome = OUTCOME.find((re) => re.test(s));
    if (outcome && !HEDGE.test(s) && !isAdvice(s) && !DEFINITION.test(s)) {
      findings.push({ type: 'unhedged-outcome', sentence: s, match: s.match(outcome)[0] });
    }
    // stacked hedges: two strict hedges within one short span, or three in a sentence
    const strict = s.match(STRICT) ?? [];
    if (strict.length >= 3 || /\b(?:may|might|could)\b[^.;,]{0,40}\b(?:may|might|could|perhaps|possibly|maybe)\b/i.test(s) || /\b(?:perhaps|possibly|maybe)\b[^.;,]{0,30}\b(?:may|might|could|can)\b/i.test(s)) {
      findings.push({ type: 'stacked-hedge', sentence: s });
    }
  }
  return findings;
}

/** Share of sentences that carry some hedge. Imperative advice is excluded: it is neither claim nor hedge. */
export function hedgeDensity(sentences) {
  const claims = sentences.filter((s) => !isAdvice(s));
  if (!claims.length) return { density: 0, claims: 0, hedged: 0 };
  const hedged = claims.filter((s) => HEDGE.test(s)).length;
  return { density: hedged / claims.length, claims: claims.length, hedged };
}

const opener = (s, n = 3) => s.toLowerCase().replace(/[^a-z' ]/g, '').split(/\s+/).slice(0, n).join(' ');

/** Openers shared by too many items in a list ("Acme may do well to…" four times in a row). */
export function repeatedOpeners(items, { n = 3, maxShare = 0.5, minItems = 3 } = {}) {
  if (items.length < minItems) return [];
  const counts = new Map();
  for (const t of items) counts.set(opener(t, n), (counts.get(opener(t, n)) ?? 0) + 1);
  return [...counts].filter(([, c]) => c / items.length > maxShare).map(([o, c]) => ({ type: 'repeated-opener', opener: o, count: c, of: items.length }));
}

/** The same sentence appearing too often within one reading. */
export function repeatedSentences(sentences, max = 2) {
  const counts = new Map();
  for (const s of sentences) counts.set(s, (counts.get(s) ?? 0) + 1);
  return [...counts].filter(([s, c]) => c > max && s.length > 25).map(([s, c]) => ({ type: 'repeated-sentence', sentence: s, count: c }));
}
