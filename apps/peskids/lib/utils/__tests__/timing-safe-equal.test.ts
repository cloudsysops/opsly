import { describe, expect, it } from 'vitest'
import { timingSafeEqual, timingSafeIncludes } from '../timing-safe-equal'

describe('timingSafeEqual', () => {
  it('returns true for identical strings', () => {
    expect(timingSafeEqual('secret-123', 'secret-123')).toBe(true)
  })

  it('returns false for different strings of the same length', () => {
    expect(timingSafeEqual('secret-123', 'secret-124')).toBe(false)
  })

  it('returns false for different-length strings without throwing', () => {
    expect(timingSafeEqual('short', 'much-longer-value')).toBe(false)
  })

  it('returns false when comparing to an empty string', () => {
    expect(timingSafeEqual('secret', '')).toBe(false)
  })

  it('returns true for two empty strings', () => {
    expect(timingSafeEqual('', '')).toBe(true)
  })
})

describe('timingSafeIncludes', () => {
  it('matches one of several candidates', () => {
    expect(timingSafeIncludes(['a', 'b', 'target'], 'target')).toBe(true)
  })

  it('returns false when no candidate matches', () => {
    expect(timingSafeIncludes(['a', 'b', 'c'], 'target')).toBe(false)
  })

  it('returns false for an empty candidate list', () => {
    expect(timingSafeIncludes([], 'target')).toBe(false)
  })
})
