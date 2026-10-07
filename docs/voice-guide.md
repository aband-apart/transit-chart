# Voice guide

How Transit Chart sounds. Every interpretive string in the app (`src/data/*.js`, the templates in `src/astro/interpret.js`) follows this guide, and `tests/voice-quality.test.js` checks generated readings against its main rules.

This is an original voice, not a house style borrowed from another astrology product. If a line could appear in someone else's app word for word, rewrite it.

## The voice in one line

**Warm, reflective and concrete, with honest uncertainty.** A thoughtful friend who has read the chart, who tells you what the sky tends to stir up and leaves the decisions to you.

## Principles

1. **Describe tendencies and invitations, not outcomes.** The sky sets a tone; it does not decide what happens.
   - Yes: "Steady effort tends to count for more than usual."
   - No: "Effort now pays off, and commitments hold."
2. **Keep facts plain.** Positions, dates, stations, signs, houses, aspect names and orbs are stated without hedging. "Pluto turns direct in Aquarius" needs no "may".
3. **Hedge interpretation once, and vary how.** One hedge per claim, never a stack. Not every sentence needs one; a reading where everything is "may" says nothing. Rotate the toolkit:
   - *tends to, often, usually, typically, sometimes*
   - *can, could, might, may* (use "may" sparingly)
   - *invites, asks for, leaves room for, is a good window for*
   - *traditionally, is read as, is associated with* (for conventions)
4. **Say something concrete.** Name the area of life and, where it helps, one thing to notice or try. Prefer "a conversation you've been avoiding" to "energy shifts".
5. **Keep agency with the reader.** "You decide what to do with it" is always true. Never "you must", "you should", "you need to", "never", "always".
6. **No fear, no flattery, no cosmic instructions.** No doom, no "the universe wants you to". Hard aspects are pressure with a use, not punishment.
7. **Plain words.** Say "pressure" before "energy". Avoid jargon that needs a glossary (the guide dialog covers the symbols).
8. **Advice is small and reversible.** Gentle imperatives ("Re-read before you hit send") are good. No medical, financial or legal directions.

## Three registers

| Register | What it covers | How it sounds |
|---|---|---|
| **Fact** | positions, dates, stations, signs, houses, orbs, which planet aspects which | Plain statement. No hedge. |
| **Convention** | what a planet, aspect or house traditionally means | Attributed or definitional: "In astrology, a square describes friction that asks for action." |
| **Interpretation** | what this might feel like or invite for this chart now | Hedged once, concrete, warm. |

Advice lines are a fourth kind: short imperatives, with at most one light reason.

## Hedging: enough, not too much

- Aim for roughly a third to a half of interpretive sentences carrying a hedge. Fewer reads as a promise; more reads as mush.
- One hedge per clause. Not "this may possibly tend to", not "could perhaps".
- Don't open consecutive items with the same phrase. In a list of tips, vary the lead-in.
- Don't hedge facts to look careful.
- "Will" is fine when it states something that is simply so ("the Moon will be full on Oct 26", "this will take you to the Forecast tab"). It is not fine for predictions about a person's life ("this will bring a breakthrough").

## Words and patterns to avoid

Unsupported certainty about life outcomes: *forces, ensures, guarantees, inevitably, destined, bound to, sure to, definitely, certainly, without fail, always, never* (as claims), and bare outcome claims such as *pays off, lands well, is rewarded, doors open, comes easily* when nothing in the sentence qualifies them.

Also avoid: pop-psychology diagnoses, "manifest", "the universe", and anything that reads as a horoscope slogan.

## Who is the reading about?

The reading's subject changes the grammar, not the tone.

| Chart type | Voice | Example |
|---|---|---|
| **Me** | second person | "Your energy and sense of self can feel pushed." |
| **Another person** | their name, *they/their* | "Alex's energy and sense of self can feel pushed." |
| **Country or place**, **event or organization** | the name, *it/its*, and language that fits an institution: reputation, operations, partners, public mood, foundations. Never moods, bodies, romance, feeling unsafe, meditation. | "Acme Inc's leadership and public face can come under pressure." |

Advice for a self chart stays direct ("Pace yourself"). For anyone else it becomes a suggestion about them, and the lead-in varies ("Alex could try to…", "It could help Alex to…").

## Before and after

| Before | After | Why |
|---|---|---|
| "Effort now pays off, and commitments hold." | "Steady effort tends to count for more than usual, and commitments made now have a good chance of holding." | Tendency, not a promise. |
| "That usually feels like pressure, but it is also the kind of period that forces real growth and decisive change." | "That can feel like pressure, and periods like this are often when people make changes they've been putting off." | No "forces"; concrete. |
| "Intuition is a reliable guide now." | "Make art, rest or take quiet time, and test inspired ideas against reality." | Removes an unsupported claim; gives something to do. |
| "Words land well." | "Pitch, write or negotiate; words tend to land well." | One light hedge. |
| "Venus–Mars contact is classic chemistry." | "Venus–Mars contact is traditionally read as chemistry." | Attributes the convention. |

## Review checklist

Before a string ships:

- [ ] Is every sentence a fact, a convention, an interpretation or advice, and does it sound like that register?
- [ ] Would I be comfortable if the reader repeated it back to me as a prediction?
- [ ] At most one hedge per claim, and not the same hedge as the line above it?
- [ ] Does it name something concrete?
- [ ] Does it read naturally for all four chart types, after pronouns are rewritten?
- [ ] Could it appear in someone else's app unchanged?

## What the tests check

`tests/voice-quality.test.js` generates complete readings for all four chart types and flags:

- **certainty**: the words and phrases under "Words and patterns to avoid", wherever they appear in interpretive text;
- **unhedged outcome**: an outcome claim in a sentence with no qualifier, that is not advice, a fact or a convention;
- **stacked hedges**: two or more hedges in one clause;
- **hedge density**: a reading where almost every sentence, or almost none, is hedged;
- **repetition**: the same opener repeated across a list, or the same sentence repeated across the cards of one view. The readings mirror the real screens: advice and pace lines show once per planet, so a planet that appears in three transits does not repeat itself.

The tests are a safety net. They can't judge warmth or concreteness, so read the output too (see the checklist).
