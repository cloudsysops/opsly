// Pure classifier for the Open Review Agent verdict.
//
// The reviewer prompt allows exactly two shapes:
//   1) the literal clean phrase, or
//   2) a list of findings, one per line, each starting with P0/P1/P2.
// Anything else (an off-topic answer, a "plan mode" greeting, an empty string) is NOT a
// review. It must never be published as an approval, so it is classified `invalid`.

const FINDING_LINE = /^\s*(?:[-*]\s*)?P[012](?![A-Za-z0-9])/;
const BLOCKING_LINE = /^\s*(?:[-*]\s*)?P0(?![A-Za-z0-9])/;

/**
 * @param {unknown} verdict raw model output
 * @param {string} cleanPhrase the literal "no issues" phrase required by the prompt
 * @returns {'clean' | 'notes' | 'blocking' | 'invalid'}
 *   clean    - exact clean phrase
 *   notes    - findings format with only P1/P2 (non-blocking recommendations)
 *   blocking - findings format with at least one P0
 *   invalid  - does not follow the required format; fail closed
 */
export function classifyVerdict(verdict, cleanPhrase) {
  const text = String(verdict ?? '').trim();
  if (text.length === 0) return 'invalid';
  if (text === cleanPhrase) return 'clean';

  const lines = text.split('\n').filter((line) => line.trim().length > 0);
  // The first non-empty line must itself be a finding: a preamble means the model did not
  // follow the output contract (and may not have read the diff at all).
  if (!FINDING_LINE.test(lines[0])) return 'invalid';
  return lines.some((line) => BLOCKING_LINE.test(line)) ? 'blocking' : 'notes';
}
