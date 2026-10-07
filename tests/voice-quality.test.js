// Reads complete generated readings for all four chart types and checks them against docs/voice-guide.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBundle } from './helpers/bundle.js';
import { lintText, hedgeDensity, repeatedOpeners, repeatedSentences, splitSentences } from '../src/lib/voice-lint.js';

const KINDS = ['self', 'person', 'place', 'event'];
// different sky + different birth year, so a quirk of one date doesn't hide a problem
const SAMPLES = [['2026-10-07T12:00:00Z', 2010], ['2027-03-15T12:00:00Z', 1975], ['2026-06-01T12:00:00Z', 1999]];

const report = (findings) => findings.slice(0, 6).map((f) => `[${f.type}] ${f.match ? `"${f.match}" in ` : ''}${f.sentence ?? ''}`).join('\n');

for (const kind of KINDS) {
  for (const [when, year] of SAMPLES) {
    test(`${kind} reading (${when.slice(0, 10)}): no unsupported certainty, unhedged outcome claims or stacked hedges`, () => {
      const b = buildBundle(kind, when, { year });
      const findings = [...new Set(b.all)].flatMap((t) => lintText(t));
      assert.equal(findings.length, 0, `\n${report(findings)}`);
    });

    test(`${kind} reading (${when.slice(0, 10)}): hedging is balanced and not repetitive`, () => {
      const b = buildBundle(kind, when, { year });
      const sentences = b.all.flatMap(splitSentences);
      const { density } = hedgeDensity([...new Set(sentences)]);
      assert.ok(density >= 0.2, `too few hedged claims (${density.toFixed(2)}): it reads like a list of promises`);
      assert.ok(density <= 0.62, `too many hedged claims (${density.toFixed(2)}): nearly every sentence hedges`);
      const lists = { tipsDo: b.sections.tipsDo, tipsAvoid: b.sections.tipsAvoid, advice: b.sections.advice };
      for (const [name, items] of Object.entries(lists)) {
        const rep = repeatedOpeners(items, { n: 3, maxShare: 0.5, minItems: 3 });
        assert.equal(rep.length, 0, `${name} repeats an opener: ${JSON.stringify(rep)}`);
      }
      // the same event shown in two views is not repetition; the same sentence stamped on many cards is
      const unique = [...new Set(b.all)].flatMap(splitSentences);
      const rs = repeatedSentences(unique, 3);
      assert.equal(rs.length, 0, `repeated sentences: ${JSON.stringify(rs.slice(0, 4))}`);
      for (const [name, items] of Object.entries(b.sections)) {
        // not deduplicated: a user sees every card in a section, so a sentence repeated across cards is real
        const inSection = repeatedSentences(items.flatMap(splitSentences), name === 'forecast' ? 3 : 2);
        assert.equal(inSection.length, 0, `${name} repeats a sentence: ${JSON.stringify(inSection.slice(0, 3))}`);
      }
      // "may" is a fine hedge but a poor refrain
      const may = sentences.filter((s) => /\bmay\b/i.test(s)).length;
      assert.ok(may / sentences.length <= 0.14, `"may" in ${may} of ${sentences.length} sentences`);
    });
  }
}
