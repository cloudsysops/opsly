-- Migration 0018: track last invoice fields on platform.subscriptions
-- Adds last_invoice_at and last_invoice_pdf to record successful Stripe payments.

ALTER TABLE platform.subscriptions
  ADD COLUMN IF NOT EXISTS last_invoice_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_invoice_pdf text;

COMMENT ON COLUMN platform.subscriptions.last_invoice_at IS 'UTC timestamp of last successful invoice payment (from invoice.payment_succeeded)';
COMMENT ON COLUMN platform.subscriptions.last_invoice_pdf IS 'URL to the Stripe-hosted PDF for the last invoice';
