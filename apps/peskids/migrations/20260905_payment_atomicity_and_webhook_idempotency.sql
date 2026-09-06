-- Peskids data-safety: atomic payment writes + webhook idempotency ledger.
--
-- Two problems this fixes:
--
-- 1. Partial commits. Recording a checkout session and marking an enrollment
--    paid were each two separate PostgREST round-trips. A failure between them
--    left an enrollment marked paid with a payment row still 'pending' (or a
--    Stripe/Wompi session with no payment row at all, so the webhook's UPDATE
--    matched nothing and the family was charged without being confirmed).
--    PostgREST cannot span statements in one transaction, so the multi-step
--    writes move into plpgsql functions — a function body IS one transaction,
--    so either every statement commits or none do.
--
-- 2. Duplicate webhook deliveries. Stripe and Wompi both retry. There was no
--    ledger, so nothing proved a redelivery could not duplicate business state.
--
-- Idempotent / safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Webhook event ledger
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS peskids.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'peskids',
  provider text NOT NULL
    CHECK (provider IN ('stripe', 'wompi', 'jelou', 'wacrm', 'openwa', 'n8n')),
  -- Provider-assigned event id (Stripe `evt_...`, Wompi transaction id, ...).
  event_id text NOT NULL,
  event_type text,
  -- Correlates the delivery with application logs.
  request_id text,
  -- Provider-reported event timestamp, for replay-window diagnostics.
  event_created_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  status text NOT NULL DEFAULT 'claimed'
    CHECK (status IN ('claimed', 'processed', 'failed', 'ignored')),
  error_code text
);

-- The whole point: one row per (provider, event_id). A duplicate delivery
-- collides here instead of re-running the business write.
CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_key
  ON peskids.webhook_events (provider, event_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_received
  ON peskids.webhook_events (received_at DESC);

ALTER TABLE peskids.webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies: service role only. RLS on with zero policies denies every
-- anon/authenticated request, which is the intended fail-closed default.

-- ---------------------------------------------------------------------------
-- 2. Natural keys that make payment writes idempotent
-- ---------------------------------------------------------------------------

-- One payment row per checkout session. Without this a retried checkout POST
-- inserts a second 'pending' payment for the same session.
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_checkout_session_key
  ON peskids.payments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Wompi keeps the *payment link* id as the stable key; the transaction id is
-- recorded separately so a redelivery can still be matched (previously the
-- transaction id overwrote the link id, making retries unmatchable).
ALTER TABLE peskids.payments
  ADD COLUMN IF NOT EXISTS wompi_payment_link_id text;

ALTER TABLE peskids.class_enrollments
  ADD COLUMN IF NOT EXISTS wompi_payment_link_id text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_wompi_payment_link_key
  ON peskids.payments (wompi_payment_link_id)
  WHERE wompi_payment_link_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_class_enrollments_wompi_link
  ON peskids.class_enrollments (wompi_payment_link_id)
  WHERE wompi_payment_link_id IS NOT NULL;

-- Backfill: before this migration the link id lived in wompi_transaction_id.
UPDATE peskids.payments
   SET wompi_payment_link_id = wompi_transaction_id
 WHERE wompi_payment_link_id IS NULL
   AND wompi_transaction_id IS NOT NULL;

UPDATE peskids.class_enrollments
   SET wompi_payment_link_id = wompi_transaction_id
 WHERE wompi_payment_link_id IS NULL
   AND wompi_transaction_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Atomic: record a freshly created checkout session
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION peskids.record_checkout_session(
  p_enrollment_id uuid,
  p_family_user_id uuid,
  p_provider text,
  p_session_id text,
  p_amount_cents integer,
  p_currency text,
  p_tenant_slug text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (payment_id uuid, enrollment_id uuid)
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  IF p_provider NOT IN ('stripe', 'wompi') THEN
    RAISE EXCEPTION 'unsupported payment provider: %', p_provider
      USING ERRCODE = 'check_violation';
  END IF;

  -- Ownership is re-checked here so the transaction cannot be started for
  -- someone else's enrollment even if a caller skipped the service layer.
  UPDATE peskids.class_enrollments AS e
     SET stripe_checkout_session_id =
           CASE WHEN p_provider = 'stripe' THEN p_session_id
                ELSE e.stripe_checkout_session_id END,
         wompi_payment_link_id =
           CASE WHEN p_provider = 'wompi' THEN p_session_id
                ELSE e.wompi_payment_link_id END,
         payment_provider = p_provider
   WHERE e.id = p_enrollment_id
     AND e.family_user_id = p_family_user_id
     AND e.tenant_slug = p_tenant_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'enrollment % not found for this family', p_enrollment_id
      USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO peskids.payments (
    tenant_slug, family_user_id, enrollment_id, amount_cents, currency,
    status, provider, stripe_checkout_session_id, wompi_payment_link_id, metadata
  )
  VALUES (
    p_tenant_slug, p_family_user_id, p_enrollment_id, p_amount_cents, p_currency,
    'pending', p_provider,
    CASE WHEN p_provider = 'stripe' THEN p_session_id ELSE NULL END,
    CASE WHEN p_provider = 'wompi'  THEN p_session_id ELSE NULL END,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  -- A retried checkout must not create a second pending payment.
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_payment_id;

  IF v_payment_id IS NULL THEN
    SELECT p.id INTO v_payment_id
      FROM peskids.payments p
     WHERE (p_provider = 'stripe' AND p.stripe_checkout_session_id = p_session_id)
        OR (p_provider = 'wompi'  AND p.wompi_payment_link_id = p_session_id)
     LIMIT 1;
  END IF;

  RETURN QUERY SELECT v_payment_id, p_enrollment_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Atomic: mark an enrollment paid from a provider webhook
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION peskids.mark_enrollment_paid(
  p_provider text,
  p_session_id text,
  p_transaction_id text DEFAULT NULL,
  p_tenant_slug text DEFAULT 'peskids'
)
RETURNS TABLE (enrollment_id uuid, already_paid boolean)
LANGUAGE plpgsql
AS $$
DECLARE
  v_enrollment_id uuid;
  v_was_paid boolean;
BEGIN
  IF p_provider NOT IN ('stripe', 'wompi') THEN
    RAISE EXCEPTION 'unsupported payment provider: %', p_provider
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT e.id, e.payment_status = 'paid'
    INTO v_enrollment_id, v_was_paid
    FROM peskids.class_enrollments e
   WHERE e.tenant_slug = p_tenant_slug
     AND (
       (p_provider = 'stripe' AND e.stripe_checkout_session_id = p_session_id)
       OR (p_provider = 'wompi' AND e.wompi_payment_link_id = p_session_id)
     )
   FOR UPDATE;

  IF v_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'no enrollment for % session %', p_provider, p_session_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- Both statements below are in the same transaction as the SELECT ... FOR
  -- UPDATE above, so the enrollment and its payment can never disagree.
  UPDATE peskids.class_enrollments
     SET payment_status = 'paid',
         status = 'confirmed',
         wompi_transaction_id =
           CASE WHEN p_provider = 'wompi' THEN COALESCE(p_transaction_id, wompi_transaction_id)
                ELSE wompi_transaction_id END
   WHERE id = v_enrollment_id;

  UPDATE peskids.payments
     SET status = 'paid',
         paid_at = COALESCE(paid_at, now()),
         stripe_payment_intent_id =
           CASE WHEN p_provider = 'stripe' THEN COALESCE(p_transaction_id, stripe_payment_intent_id)
                ELSE stripe_payment_intent_id END,
         wompi_transaction_id =
           CASE WHEN p_provider = 'wompi' THEN COALESCE(p_transaction_id, wompi_transaction_id)
                ELSE wompi_transaction_id END
   WHERE enrollment_id = v_enrollment_id
     AND (
       (p_provider = 'stripe' AND stripe_checkout_session_id = p_session_id)
       OR (p_provider = 'wompi' AND wompi_payment_link_id = p_session_id)
     );

  RETURN QUERY SELECT v_enrollment_id, COALESCE(v_was_paid, false);
END;
$$;

COMMIT;
