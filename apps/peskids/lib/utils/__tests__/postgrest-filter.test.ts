import { describe, expect, it } from 'vitest'
import { pgFilterValue } from '../postgrest-filter'

describe('pgFilterValue', () => {
  it('wraps plain values in double quotes', () => {
    expect(pgFilterValue('john')).toBe('"john"')
  })

  it('preserves % wildcards used for ilike patterns', () => {
    expect(pgFilterValue('%john%')).toBe('"%john%"')
  })

  it('SECURITY: neutralizes commas so extra filter conditions cannot be appended', () => {
    const malicious = 'x,role.eq.owner'
    expect(pgFilterValue(malicious)).toBe('"x,role.eq.owner"')
    // the comma is now literal content inside the quotes, not a condition separator
  })

  it('SECURITY: neutralizes parentheses used for filter grouping', () => {
    expect(pgFilterValue('x)or(id.neq.0')).toBe('"x)or(id.neq.0"')
  })

  it('escapes embedded double quotes', () => {
    expect(pgFilterValue('say "hi"')).toBe('"say \\"hi\\""')
  })

  it('escapes embedded backslashes', () => {
    expect(pgFilterValue('a\\b')).toBe('"a\\\\b"')
  })
})
