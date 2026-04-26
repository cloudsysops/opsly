/**
 * Ingestion Bunker — servicio ligero (sin Next.js, sin apps/api).
 * Encola payloads en BullMQ para que el orchestrator procese con calma.
 */
'use strict';

const express = require('express');
const { Queue } = require('bullmq');

const WEBHOOKS_QUEUE = 'webhooks-processing';
const GENERAL_EVENTS_QUEUE = 'general-events';

const PORT = Number.parseInt(process.env.PORT || process.env.INGESTION_PORT || '3040', 10);

function buildConnection() {
  const raw = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('REDIS_URL inválida');
  }
  return {
    host: url.hostname,
    port: Number.parseInt(url.port || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

const connection = buildConnection();

const webhooksQueue = new Queue(WEBHOOKS_QUEUE, { connection });
const generalEventsQueue = new Queue(GENERAL_EVENTS_QUEUE, { connection });

/**
 * @param {import('express').Request} req
 * @returns {Record<string, string>}
 */
function plainHeaders(req) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (v === undefined) {
      continue;
    }
    out[k.toLowerCase()] = Array.isArray(v) ? v.join(', ') : String(v);
  }
  return out;
}

const app = express();

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'ingestion-bunker' });
});

/**
 * Stripe: cuerpo crudo (sin verificar firma aquí).
 * POST /ingest/stripe
 */
app.post('/ingest/stripe', express.raw({ type: '*/*', limit: '2mb' }), async (req, res) => {
  const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(String(req.body ?? ''), 'utf8');
  const payload = {
    provider: 'stripe',
    rawBodyBase64: buf.toString('base64'),
    headers: plainHeaders(req),
    receivedAt: new Date().toISOString(),
  };
  await webhooksQueue.add('stripe-ingest', payload, {
    attempts: 8,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 200 },
  });
  res.status(202).json({ accepted: true, queue: WEBHOOKS_QUEUE });
});

app.use(express.json({ limit: '512kb' }));

/**
 * Eventos generales de aplicación.
 * POST /ingest/event — body: { type, tenantId, data }
 */
app.post('/ingest/event', async (req, res) => {
  const body = req.body;
  if (
    body === null ||
    typeof body !== 'object' ||
    typeof body.type !== 'string' ||
    typeof body.tenantId !== 'string'
  ) {
    res.status(400).json({
      error: 'invalid_body',
      message: 'Se requiere JSON con type (string), tenantId (string) y data opcional.',
    });
    return;
  }

  const jobPayload = {
    type: body.type,
    tenantId: body.tenantId,
    data: 'data' in body ? body.data : undefined,
    receivedAt: new Date().toISOString(),
    headers: plainHeaders(req),
  };

  await generalEventsQueue.add('app-event', jobPayload, {
    attempts: 5,
    backoff: { type: 'fixed', delay: 3000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 300 },
  });

  res.status(202).json({ accepted: true, queue: GENERAL_EVENTS_QUEUE });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      event: 'ingestion_bunker_listen',
      port: PORT,
      queues: [WEBHOOKS_QUEUE, GENERAL_EVENTS_QUEUE],
    })
  );
});

function shutdown() {
  server.close(() => {
    void Promise.all([webhooksQueue.close(), generalEventsQueue.close()]).finally(() => {
      process.exit(0);
    });
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
