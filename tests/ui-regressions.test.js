// Guards for UI behaviours that live in CSS and markup, which the Node tests can't render.
// They read the source, so they catch the regression (a rule deleted, a name changed) without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

/** Declarations of every rule whose selector list contains `selector` (compared with whitespace squeezed). */
function rulesFor(selector) {
  const squeeze = (t) => t.replace(/\s+/g, ' ').trim();
  const out = [];
  for (const block of css.split('}')) {
    const [sel, body] = block.split('{');
    if (!body) continue;
    if (sel.split(',').map(squeeze).some((x) => x.endsWith(squeeze(selector)))) out.push(squeeze(body));
  }
  return out;
}

test('an expanded Reading transit hides its one-line summary (the full reading starts with the same sentence)', () => {
  // the summary line really is the first sentence of the body, so leaving it visible would repeat it
  assert.match(main, /<span class="tsum">\$\{esc\(firstSentence\(d\.text/);
  assert.match(main, /<p>\$\{esc\(d\.text\)\}<\/p>/);
  const hidden = rulesFor('details.tx[open] > summary .tsum');
  assert.ok(hidden.some((b) => /display:\s*none/.test(b)), 'details.tx[open] > summary .tsum must be display: none');
});

test('an expanded Forecast event hides its one-line summary too', () => {
  assert.match(main, /<div class="tsum">\$\{esc\(firstSentence\(d\.text/);
  const hidden = rulesFor('details.fev[open] .main .tsum');
  assert.ok(hidden.some((b) => /display:\s*none/.test(b)), 'details.fev[open] .main .tsum must be display: none');
});

test('the hide rule is not overridden later for phone layouts', () => {
  // any later rule that sets display on .tsum inside an open transit would bring the summary back
  const reveals = rulesFor('details.tx > summary .tsum').filter((b) => /display:\s*(?!none)/.test(b));
  assert.deepEqual(reveals, [], 'a rule sets display on details.tx > summary .tsum; the [open] rule must still win');
});

test('the demo charts use a simple fictional name, not a label like "Example chart"', () => {
  const names = [...main.matchAll(/const EXAMPLE2? = \{[^}]*?name: '([^']+)'/g)].map((m) => m[1]);
  assert.equal(names.length, 2, 'both demo charts found');
  for (const n of names) {
    assert.match(n, /^[A-Z][a-z]+( [A-Z][a-z]+)?$/, `"${n}" should read as a name`);
    assert.doesNotMatch(n, /example|sample|test|demo|chart/i, `"${n}" reads like a label, not a subject`);
  }
  assert.equal(names[0], 'Alex');
});

test('the demo still announces that it is an unsaved example', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /Exploring an example chart\. Nothing is saved\./);
});

test('exact dates: several passes use a compact label with a list, not one long chip', () => {
  assert.match(main, /import \{ describePasses \} from '\.\/lib\/passes\.js'/);
  // the old behaviour built "Exact on <date>, <date>, ..." with join() and put it in a chip
  assert.doesNotMatch(main, /Exact on \$\{parts\.join/);
  assert.doesNotMatch(main, /function exactText/);
  // multi-pass output is a <details> whose summary is the short label, with the dates in a list
  assert.match(main, /<details class="passes exact"><summary class="chip hot">\$\{esc\(info\.label\)\}<\/summary>/);
  assert.match(main, /<ul class="pass-list">/);
  // and the styles for it exist
  assert.ok(rulesFor('.pass-list').length > 0, '.pass-list styles');
  assert.ok(rulesFor('details.passes > summary').some((b) => /inline-flex/.test(b)), 'the summary is styled like a chip');
});
