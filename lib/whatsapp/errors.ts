/**
 * Typed WhatsApp errors — no I/O.
 */

import type { WhatsAppProviderName } from './types.js';

export class WhatsAppError extends Error {
  readonly code: string;
  readonly provider: WhatsAppProviderName;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    provider: WhatsAppProviderName,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'WhatsAppError';
    this.code = code;
    this.provider = provider;
    this.details = details;
  }
}

export class WhatsAppSignatureError extends WhatsAppError {
  constructor(provider: WhatsAppProviderName) {
    super('SIGNATURE_INVALID', 'Webhook signature validation failed', provider);
    this.name = 'WhatsAppSignatureError';
  }
}

export class WhatsAppProviderError extends WhatsAppError {
  constructor(
    provider: WhatsAppProviderName,
    message: string,
    details?: Record<string, unknown>
  ) {
    super('PROVIDER_ERROR', message, provider, details);
    this.name = 'WhatsAppProviderError';
  }
}

export class WhatsAppNotWiredError extends WhatsAppError {
  constructor(provider: WhatsAppProviderName, operation: string) {
    super(
      'NOT_WIRED',
      `WhatsApp ${provider} operation "${operation}" is not wired in this package version`,
      provider,
      { operation }
    );
    this.name = 'WhatsAppNotWiredError';
  }
}
