/**
 * Consume cola `webhooks-processing` (Ingestion Bunker).
 * Verifica firma Stripe y reenvía el cuerpo crudo a la API interna (misma ruta que Stripe directo).
 */
import { Job, Worker } from 'bullmq';
import Stripe from 'stripe';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { connection } from '../queue.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

export const WEBHOOKS_PROCESSING_QUEUE = 'webhooks-processing';

export interface StripeIngestJobData {
  readonly provider: 'stripe';
  readonly rawBodyBase64: string;
  readonly headers: Record<string, string>;
  readonly receivedAt?: string;
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getStripeClient(): Stripe {
  const key = isProductionRuntime()
    ? process.env.STRIPE_SECRET_KEY?.trim()
    : process.env.STRIPE_TEST_SECRET_KEY?.trim();
  if (!key) {
    throw new Error(
      isProductionRuntime()
        ? 'STRIPE_SECRET_KEY es requerido para verificar webhooks Stripe'
        : 'STRIPE_TEST_SECRET_KEY es requerido para verificar webhooks Stripe (no-producción)'
    );
  }
  return new Stripe(key, {
    apiVersion: '2024-06-20' as unknown as Stripe.LatestApiVersion,
  });
}

/** Misma regla que `apps/api/lib/stripe/webhook-env.ts` (Live vs Test). */
function resolveWebhookEndpointSecret(): string {
  if (isProductionRuntime()) {
    const live = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!live) {
      throw new Error('STRIPE_WEBHOOK_SECRET no configurado');
    }
    return live;
  }
  const testSecret = process.env.STRIPE_WEBHOOK_SECRET_TEST?.trim();
  if (testSecret) {
    return testSecret;
  }
  throw new Error('STRIPE_WEBHOOK_SECRET_TEST requerido (no-producción)');
}

function resolveStripeSignature(headers: Record<string, string>): string | null {
  const direct =
    headers['stripe-signature'] ?? headers['Stripe-Signature'] ?? headers['STRIPE-SIGNATURE'];
  return direct && direct.length > 0 ? direct : null;
}

async function deliverStripeIngest(job: Job<StripeIngestJobData>): Promise<void> {
  const t0 = Date.now();
  logWorkerLifecycle('start', 'webhooks-processing', job);

  const webhookSecret = resolveWebhookEndpointSecret();

  const rawBuf = Buffer.from(job.data.rawBodyBase64, 'base64');
  const sig = resolveStripeSignature(job.data.headers);
  if (!sig) {
    throw new Error('Falta cabecera stripe-signature en el job de ingesta');
  }

  const stripe = getStripeClient();
  try {
    stripe.webhooks.constructEvent(rawBuf, sig, webhookSecret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Verificación Stripe fallida: ${msg}`);
  }

  const apiBase = process.env.OPSLY_API_INTERNAL_URL?.trim() ?? 'http://app:3000';
  const url = `${apiBase.replace(/\/$/, '')}/api/webhooks/stripe`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'stripe-signature': sig,
    },
    body: rawBuf,
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const snippet = (await res.text()).slice(0, 500);
    throw new Error(`Reenvío API ${res.status}: ${snippet}`);
  }

  logWorkerLifecycle('complete', 'webhooks-processing', job, {
    duration_ms: Date.now() - t0,
  });
}

export function startWebhooksProcessingWorker(): Worker<StripeIngestJobData> {
  const concurrency = getWorkerConcurrency('webhooks-processing');
  const worker = new Worker<StripeIngestJobData>(
    WEBHOOKS_PROCESSING_QUEUE,
    async (job: Job<StripeIngestJobData>) => {
      if (job.data.provider !== 'stripe') {
        throw new Error(`Proveedor no soportado: ${String(job.data.provider)}`);
      }
      await deliverStripeIngest(job);
    },
    { connection, concurrency }
  );

  worker.on('failed', (job, err) => {
    console.error(
      JSON.stringify({
        event: 'worker_fail',
        worker: 'WebhooksProcessingWorker',
        jobId: job?.id,
        error: err instanceof Error ? err.message : String(err),
      })
    );
  });

  return worker;
}
