import { describe, expect, it } from 'vitest';
import { extractJsonObject } from '../parse-agent-json.js';

describe('extractJsonObject', () => {
  it('parses raw JSON object', () => {
    const out = extractJsonObject('  {"a":1}  ');
    expect(out).toEqual({ a: 1 });
  });

  it('parses fenced json block', () => {
    const out = extractJsonObject('```json\n{"x":"y"}\n```');
    expect(out).toEqual({ x: 'y' });
  });

  it('parses object embedded in prose', () => {
    const out = extractJsonObject('Here: {"k": true} thanks');
    expect(out).toEqual({ k: true });
  });
});
