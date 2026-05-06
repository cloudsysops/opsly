import { describe, expect, it } from 'vitest';
import {
  MAX_AUTO_ITERATIONS,
  buildRetryPromptMarkdown,
  decideValidationAction,
  extractTypeScriptErrorLines,
  safeCorrelationFileId,
  suggestFixHints,
  truncateTail,
} from '../src/lib/iteration-manager.js';

describe('iteration-manager', () => {
  it('extractTypeScriptErrorLines picks TS diagnostics', () => {
    const log = `foo\nsrc/x.ts(1,1): error TS2322: bad\nok\n`;
    expect(extractTypeScriptErrorLines(log)).toContain('src/x.ts(1,1): error TS2322: bad');
  });

  it('safeCorrelationFileId strips unsafe chars', () => {
    expect(safeCorrelationFileId('abc/..\\x')).toBe('abc____x');
  });

  it('truncateTail short-circuits', () => {
    expect(truncateTail('hi', 10)).toBe('hi');
    expect(truncateTail('abcdefghij', 5)).toContain('fghij');
    expect(truncateTail('abcdefghij', 5).length).toBeGreaterThan(5);
  });

  it('suggestFixHints returns at least one hint', () => {
    const hints = suggestFixHints({
      ok: false,
      correlation_id: 'c1',
      attempt: 0,
      failed_step: 'type-check',
      log_tail: 'cannot find module xyz',
    });
    expect(hints.length).toBeGreaterThan(0);
  });

  it('buildRetryPromptMarkdown includes iteration metadata', () => {
    const md = buildRetryPromptMarkdown({
      summary: {
        ok: false,
        correlation_id: 'corr-1',
        attempt: 0,
        failed_step: 'type-check',
        exit_code: 2,
        log_tail: 'error TS1005',
      },
      nextAttempt: 2,
      maxAttempts: MAX_AUTO_ITERATIONS,
    });
    expect(md).toContain('iteration_attempt: 2');
    expect(md).toContain('max_iterations: 3');
    expect(md).toContain('corr-1');
  });

  it('decideValidationAction commits when validation passed', () => {
    expect(
      decideValidationAction({
        ok: true,
        correlation_id: 'corr-commit',
        attempt: 0,
        log_tail: '',
      })
    ).toEqual({ action: 'commit' });
  });

  it('decideValidationAction retries failed validation before max iterations', () => {
    expect(
      decideValidationAction({
        ok: false,
        correlation_id: 'corr-retry',
        attempt: 0,
        failed_step: 'type-check',
        exit_code: 2,
        log_tail: 'error TS2322',
      })
    ).toEqual({ action: 'retry', nextAttempt: 1 });
  });

  it('decideValidationAction escalates failed validation at max iterations', () => {
    expect(
      decideValidationAction({
        ok: false,
        correlation_id: 'corr-escalate',
        attempt: MAX_AUTO_ITERATIONS,
        failed_step: 'test',
        exit_code: 1,
        log_tail: 'expected true to be false',
      })
    ).toEqual({ action: 'escalate', reason: 'max_iterations_reached' });
  });
});
