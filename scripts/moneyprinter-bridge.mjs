#!/usr/bin/env node
// MoneyPrinter bridge for PC-gamer / Content Studio (Splashitos + tenants).
//
// Exposes Opsly's VideoRenderRequest contract over HTTP:
//   POST /render  -> MoneyPrinterTurboRenderClient-compatible VideoRenderManifest
//   GET  /health  -> liveness
//
// The worker (ContentVideoWorker) POSTs { tenant_slug, request_id, draft_id, preset, draft }
// to MONEY_PRINTER_TURBO_URL /render. This bridge validates the request, persists the
// render artifacts under MPT_BRIDGE_OUT_DIR, and returns a manifest whose asset.url is
// reachable via MPT_BRIDGE_PUBLIC_BASE (HTTP static or local).
//
// This is the integration seam for the real GPU renderer: replace renderDraft() with a
// call to MoneyPrinterTurbo (or external API) that returns a VideoRenderManifest.
//
// Env:
//   MPT_BRIDGE_PORT        default 8080
//   MPT_BRIDGE_HOST        default 0.0.0.0
//   MPT_BRIDGE_OUT_DIR     default runtime/content-studio/renders
//   MPT_BRIDGE_PUBLIC_BASE default http://127.0.0.1:8080  (prefix for asset.url)
//   MPT_BRIDGE_API_KEY     optional; if set, POST /render requires x-api-key
//   MPT_FONT               optional font hint passed to renderer
//
// Run (repo root):
//   node scripts/moneyprinter-bridge.mjs
// or via compose:
//   docker compose -f infra/docker-compose.pc-gamer-moneyprinter.yml --env-file .env.worker up -d

import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const PORT = Number(process.env.MPT_BRIDGE_PORT ?? 8080);
const HOST = process.env.MPT_BRIDGE_HOST ?? '0.0.0.0';
const OUT_DIR = resolve(REPO_ROOT, process.env.MPT_BRIDGE_OUT_DIR ?? 'runtime/content-studio/renders');
const PUBLIC_BASE = (process.env.MPT_BRIDGE_PUBLIC_BASE ?? `http://127.0.0.1:${PORT}`).replace(/\/+$/, '');
const API_KEY = process.env.MPT_BRIDGE_API_KEY?.trim() || '';

const REQUESTED_STATES = new Set(['approved', 'ready_to_copy']);

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (err) {
        rejectBody(err);
      }
    });
    req.on('error', rejectBody);
  });
}

function authorized(req) {
  return !API_KEY || req.headers['x-api-key'] === API_KEY;
}

function assertRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('body must be a JSON object');
  for (const field of ['tenant_slug', 'request_id', 'draft_id']) {
    if (!body[field] || typeof body[field] !== 'string' || !body[field].trim()) {
      throw new Error(`field "${field}" is required`);
    }
  }
  if (!body.preset || typeof body.preset !== 'object' || !body.preset.slug) {
    throw new Error('preset.slug is required');
  }
  if (!body.draft || typeof body.draft !== 'object' || !body.draft.id) {
    throw new Error('draft.id is required');
  }
  if (body.draft.id !== body.draft_id) {
    throw new Error('draft.id must match draft_id');
  }
  if (body.draft.tenant_slug !== body.tenant_slug) {
    throw new Error('draft.tenant_slug must match tenant_slug');
  }
  if (body.draft.state && !REQUESTED_STATES.has(body.draft.state)) {
    throw new Error(
      `Draft ${body.draft.id} is not renderable in state "${body.draft.state}"`,
    );
  }
}

function sanitizeSegment(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'draft';
}

// Deterministic local render: persists artifacts, returns a compatible manifest.
// Replace/augment this async body with the real GPU renderer when available.
async function renderDraft({ tenant_slug, request_id, draft_id, preset, draft }) {
  const dir = join(OUT_DIR, sanitizeSegment(tenant_slug), sanitizeSegment(draft_id));
  await mkdir(dir, { recursive: true });

  const manifest = {
    provider: 'moneyprinterturbo',
    status: 'completed',
    tenant_slug,
    request_id,
    draft_id,
    preset_slug: preset.slug,
    submitted_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    job_id: `mpt-${request_id}`,
    output_key: relative(OUT_DIR, dir),
    asset: {
      url: '',
      duration_sec:
        Array.isArray(draft.reel_script)
          ? draft.reel_script.reduce((sum, s) => sum + Number(s?.duration_sec ?? 0), 0)
          : undefined,
      aspect_ratio: preset.aspect_ratio,
    },
  };

  const baseFilename = sanitizeSegment(draft_id);
  const videoFile = `${baseFilename}.mp4`;
  // asset.url is relative to OUT_DIR (served under PUBLIC_BASE), not the repo root.
  const urlRelative = relative(OUT_DIR, join(dir, videoFile)).split('\\').join('/');
  manifest.asset.url = `${PUBLIC_BASE}/${urlRelative}`;
  manifest.output_key = relative(OUT_DIR, dir).split('\\').join('/');

  // Renderable artifacts (POC): articulated script + payload, ready for a real renderer.
  await writeFile(
    join(dir, 'draft.json'),
    JSON.stringify({ tenant_slug, request_id, draft_id, preset, draft }, null, 2),
  );
  await writeFile(
    join(dir, `${baseFilename}.txt`),
    [
      draft.title || '',
      '',
      ...(Array.isArray(draft.reel_script)
        ? draft.reel_script.map((s) => `[${s?.duration_sec ?? 0}s] ${s?.copy ?? ''}`)
        : []),
      '',
      ...(draft.hashtags && Array.isArray(draft.hashtags) ? draft.hashtags.join(' ') : []),
    ].join('\n'),
  );
  // Placeholder video so `asset.url` resolves during manual upload / review.
  await writeFile(join(dir, videoFile), PLACEHOLDER_MP4);

  return { manifest, dir };
}

const PLACEHOLDER_MP4 = Buffer.from(
  '00000018ftypmp42' +
    '00000008mp42' +
    '00000008isom' +
    '00000000mdat00000000' +
    'Placeholder render: replace with a real MoneyPrinterTurbo MP4 output.',
  'utf8',
);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
    return json(res, 200, { ok: true, service: 'moneyprinter-bridge', port: PORT });
  }

  if (req.method === 'POST' && url.pathname === '/render') {
    if (!authorized(req)) {
      return json(res, 401, { ok: false, error: 'unauthorized' });
    }
    try {
      const body = await readBody(req);
      assertRequest(body);
      const { manifest, dir } = await renderDraft(body);
      console.log('[moneyprinter-bridge] render completed', {
        tenant_slug: body.tenant_slug,
        draft_id: body.draft_id,
        request_id: body.request_id,
        dir,
      });
      return json(res, 200, { manifest });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = /required|must match|renderable/i.test(message) ? 400 : 500;
      console.error('[moneyprinter-bridge] render error:', message);
      return json(res, status, { ok: false, error: message });
    }
  }

  return json(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`[moneyprinter-bridge] listening on http://${HOST}:${PORT}`);
  console.log(`[moneyprinter-bridge] out_dir=${OUT_DIR}`);
  console.log(`[moneyprinter-bridge] public_base=${PUBLIC_BASE}`);
});
