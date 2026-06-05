import { Job, Worker } from 'bullmq';
import { connection } from '../queue.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import { logWorkerLifecycle, logWorkerInfo, logWorkerError } from '../observability/worker-log.js';
import {
  MoneyPrinterTurboRenderClient,
  MoneyPrinterTurboRenderClientOptions,
  ContentDraft,
  TenantContentPreset,
  VideoRenderManifest,
} from '@intcloudsysops/content-studio';

export const CONTENT_VIDEO_QUEUE = 'content-video';

export interface ContentVideoPayload {
  tenant_slug: string;
  request_id: string;
  draft_id: string;
  draft: ContentDraft;
  preset: TenantContentPreset;
  mpt_base_url?: string;
  mpt_api_key?: string;
}

function resolveMptConfig(): MoneyPrinterTurboRenderClientOptions {
  const base_url = process.env.MONEY_PRINTER_TURBO_URL?.trim() || 'http://127.0.0.1:8080';
  const api_key = process.env.MONEY_PRINTER_TURBO_API_KEY?.trim();
  return {
    base_url,
    api_key: api_key || undefined,
    render_path: '/render',
    timeout_ms: 120_000,
  };
}

export async function processContentVideo(job: Job<ContentVideoPayload>): Promise<VideoRenderManifest> {
  const t0 = Date.now();
  logWorkerLifecycle('start', 'content-video', job);

  const { tenant_slug, request_id, draft_id, draft, preset, mpt_base_url, mpt_api_key } = job.data;

  const config: MoneyPrinterTurboRenderClientOptions = {
    base_url: mpt_base_url?.trim() || resolveMptConfig().base_url,
    api_key: mpt_api_key?.trim() || resolveMptConfig().api_key,
    render_path: '/render',
    timeout_ms: 120_000,
  };

  logWorkerInfo('content-video', 'Rendering video', {
    tenant_slug,
    draft_id,
    request_id,
    preset_slug: preset.slug,
    mpt_url: config.base_url,
  });

  const client = new MoneyPrinterTurboRenderClient(config);
  const manifest = await client.render({
    tenant_slug,
    request_id,
    draft_id,
    preset,
    draft,
  });

  logWorkerLifecycle('complete', 'content-video', job, {
    duration_ms: Date.now() - t0,
    manifest_status: manifest.status,
    job_id: manifest.job_id,
  });

  return manifest;
}

export function startContentVideoWorker(): Worker<ContentVideoPayload> {
  const concurrency = getWorkerConcurrency('content-video');
  const worker = new Worker<ContentVideoPayload>(
    CONTENT_VIDEO_QUEUE,
    async (job) => {
      try {
        return await processContentVideo(job);
      } catch (err) {
        logWorkerError('content-video', 'Render failed', {
          jobId: job.id,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    },
    { connection, concurrency },
  );

  logWorkerInfo('content-video', 'Worker started', { concurrency });
  return worker;
}
