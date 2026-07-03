import { describe, expect, it } from 'vitest';
import {
  feedbackSchema,
  isLowSatisfactionRating,
  parentFeedbackFormSchema,
  toFeedbackApiPayload,
} from '@/lib/validation/feedback.schema';

describe('parentFeedbackFormSchema', () => {
  const valid = {
    child_name: 'Emma Martínez',
    satisfaction: 5,
    suggestion: 'Nos encanta el programa',
    contact_me_back: false,
    parent_email: 'familia@peskids.co',
  };

  it('accepts Sprint 01 parent feedback fields', () => {
    const parsed = parentFeedbackFormSchema.parse(valid);
    expect(parsed.satisfaction).toBe(5);
    expect(parsed.contact_me_back).toBe(false);
  });

  it('rejects satisfaction outside 1-5', () => {
    const result = parentFeedbackFormSchema.safeParse({ ...valid, satisfaction: 6 });
    expect(result.success).toBe(false);
  });

  it('allows empty suggestion', () => {
    const parsed = parentFeedbackFormSchema.parse({ ...valid, suggestion: '' });
    expect(parsed.suggestion).toBeUndefined();
  });

  it('rejects suggestion over 500 chars', () => {
    const result = parentFeedbackFormSchema.safeParse({
      ...valid,
      suggestion: 'x'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('isLowSatisfactionRating', () => {
  it('flags ratings below 3 for admin alert', () => {
    expect(isLowSatisfactionRating(2)).toBe(true);
    expect(isLowSatisfactionRating(3)).toBe(false);
    expect(isLowSatisfactionRating(5)).toBe(false);
  });
});

describe('toFeedbackApiPayload', () => {
  it('maps contact_me_back to contact_wanted', () => {
    const payload = toFeedbackApiPayload({
      child_name: 'Lucas',
      satisfaction: 4,
      contact_me_back: true,
    });
    expect(payload.contact_wanted).toBe(true);
    expect(payload.child_name).toBe('Lucas');
  });
});

describe('feedbackSchema', () => {
  it('still accepts staff composer payloads', () => {
    const parsed = feedbackSchema.parse({
      child_name: 'Ana',
      body: 'Excelente clase',
      rating: 5,
      author_type: 'teacher',
    });
    expect(parsed.author_type).toBe('teacher');
  });
});
