import { describe, it, expect, afterEach } from 'vitest';
import {
  isEmailDeliverySkipped,
  isNonFatalEmailDeliveryError,
  isResendTestRecipientRestriction,
} from '../delivery-mode';

describe('delivery-mode', () => {
  afterEach(() => {
    delete process.env.EMAIL_DELIVERY_MODE;
    delete process.env.DISABLE_EMAIL_SEND;
  });

  it('detects skipped delivery modes', () => {
    process.env.EMAIL_DELIVERY_MODE = 'test';
    expect(isEmailDeliverySkipped()).toBe(true);
    process.env.EMAIL_DELIVERY_MODE = 'skip';
    expect(isEmailDeliverySkipped()).toBe(true);
    process.env.EMAIL_DELIVERY_MODE = 'production';
    expect(isEmailDeliverySkipped()).toBe(false);
    process.env.DISABLE_EMAIL_SEND = 'true';
    expect(isEmailDeliverySkipped()).toBe(true);
    delete process.env.DISABLE_EMAIL_SEND;
  });

  it('detects Resend sandbox recipient restriction', () => {
    expect(
      isResendTestRecipientRestriction(
        'You can only send testing emails to your own email address (cboteros1@gmail.com).'
      )
    ).toBe(true);
    expect(isResendTestRecipientRestriction('Resend rate limit')).toBe(false);
  });

  it('classifies non-fatal email errors', () => {
    expect(
      isNonFatalEmailDeliveryError(
        new Error('You can only send testing emails to your own email address')
      )
    ).toBe(true);
    expect(isNonFatalEmailDeliveryError(new Error('SMTP connection refused'))).toBe(false);
  });
});
