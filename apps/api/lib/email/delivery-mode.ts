/** Skip real Resend calls (CI, local smoke). Does not disable Supabase invite link generation. */
export function isEmailDeliverySkipped(): boolean {
  if (process.env.DISABLE_EMAIL_SEND === 'true') {
    return true;
  }
  const mode = process.env.EMAIL_DELIVERY_MODE?.trim().toLowerCase();
  return mode === 'test' || mode === 'skip' || mode === 'off';
}

/** Resend sandbox: only the account owner inbox may receive mail. */
export function isResendTestRecipientRestriction(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('only send testing emails to your own email address') ||
    normalized.includes('you can only send testing emails')
  );
}

export function isNonFatalEmailDeliveryError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return isResendTestRecipientRestriction(message);
}
