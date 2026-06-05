import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { clearRuleIndexCache, loadRuleIndex, searchRules } from '../src/rule-index.js';

describe('rule-index fixtures', () => {
  afterEach(() => {
    clearRuleIndexCache();
    delete process.env.SIGMA_VENDOR_DIR;
  });

  it('loads yaml rules from fixture vendor path', () => {
    process.env.SIGMA_VENDOR_DIR = path.join(process.cwd(), '__fixtures__');
    const rules = loadRuleIndex({ force: true });
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]?.id).toBe('test-powershell-exec');
  });

  it('searches by keyword', () => {
    process.env.SIGMA_VENDOR_DIR = path.join(process.cwd(), '__fixtures__');
    clearRuleIndexCache();
    const hits = searchRules('powershell');
    expect(hits.some((r) => r.id === 'test-powershell-exec')).toBe(true);
  });
});
