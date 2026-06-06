import type {
  ContentDraft,
  MoneyPrinterTurboRenderConfig,
  TenantContentPreset,
  VideoRenderManifest,
  VideoRenderRequest,
} from '../types.js';

const renderableStates = new Set<ContentDraft['state']>(['approved', 'ready_to_copy']);

export interface MoneyPrinterTurboPayload {
  tenant_slug: string;
  request_id: string;
  draft_id: string;
  preset: TenantContentPreset;
  draft: ContentDraft;
}

export interface MoneyPrinterTurboRenderClientOptions extends MoneyPrinterTurboRenderConfig {
  api_key_header?: string;
}

function ensureRenderableDraft(draft: ContentDraft): void {
  if (!renderableStates.has(draft.state)) {
    throw new Error(
      `Draft ${draft.id} is not renderable in state "${draft.state}". Expected approved or ready_to_copy.`
    );
  }
}

function ensureRequestIntegrity(request: VideoRenderRequest): void {
  if (!request.tenant_slug.trim()) {
    throw new Error('tenant_slug is required');
  }

  if (!request.request_id.trim()) {
    throw new Error('request_id is required');
  }

  if (!request.draft_id.trim()) {
    throw new Error('draft_id is required');
  }

  if (request.draft.tenant_slug !== request.tenant_slug) {
    throw new Error('Draft tenant_slug must match the render request tenant_slug');
  }

  if (request.draft.id !== request.draft_id) {
    throw new Error('Draft id must match the render request draft_id');
  }

  ensureRenderableDraft(request.draft);
}

function normalizeAsset(
  asset: unknown
): VideoRenderManifest['asset'] {
  if (!asset || typeof asset !== 'object') {
    return undefined;
  }

  const candidate = asset as Record<string, unknown>;

  return {
    url: String(candidate.url ?? ''),
    thumbnail_url: typeof candidate.thumbnail_url === 'string' ? candidate.thumbnail_url : undefined,
    subtitle_url: typeof candidate.subtitle_url === 'string' ? candidate.subtitle_url : undefined,
    duration_sec: typeof candidate.duration_sec === 'number' ? candidate.duration_sec : undefined,
    aspect_ratio:
      candidate.aspect_ratio === '9:16' ||
      candidate.aspect_ratio === '1:1' ||
      candidate.aspect_ratio === '16:9'
        ? candidate.aspect_ratio
        : undefined,
  };
}

function normalizeManifest(
  request: VideoRenderRequest,
  raw: unknown
): VideoRenderManifest {
  if (!raw || typeof raw !== 'object') {
    throw new Error('MoneyPrinterTurbo returned an empty response');
  }

  const response = raw as Record<string, unknown>;
  const candidate = (response.manifest ?? response.render ?? response.data ?? response) as
    | Record<string, unknown>
    | undefined;

  if (!candidate || typeof candidate !== 'object') {
    throw new Error('MoneyPrinterTurbo response did not include a render manifest');
  }

  const status = String(candidate.status ?? 'queued') as VideoRenderManifest['status'];
  const provider = String(candidate.provider ?? 'moneyprinterturbo') as VideoRenderManifest['provider'];

  return {
    provider,
    status,
    tenant_slug: String(candidate.tenant_slug ?? request.tenant_slug),
    request_id: String(candidate.request_id ?? request.request_id),
    draft_id: String(candidate.draft_id ?? request.draft_id),
    preset_slug: String(candidate.preset_slug ?? request.preset.slug),
    submitted_at: String(candidate.submitted_at ?? new Date().toISOString()),
    completed_at:
      typeof candidate.completed_at === 'string' ? candidate.completed_at : undefined,
    job_id: typeof candidate.job_id === 'string' ? candidate.job_id : undefined,
    output_key: typeof candidate.output_key === 'string' ? candidate.output_key : undefined,
    error: typeof candidate.error === 'string' ? candidate.error : undefined,
    asset: normalizeAsset(candidate.asset),
  };
}

export function buildMoneyPrinterTurboPayload(
  request: VideoRenderRequest
): MoneyPrinterTurboPayload {
  ensureRequestIntegrity(request);

  return {
    tenant_slug: request.tenant_slug,
    request_id: request.request_id,
    draft_id: request.draft_id,
    preset: request.preset,
    draft: request.draft,
  };
}

export class MoneyPrinterTurboRenderClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly renderPath: string;
  private readonly timeoutMs: number;
  private readonly apiKeyHeader: string;

  constructor(options: MoneyPrinterTurboRenderClientOptions) {
    if (!options.base_url?.trim()) {
      throw new Error('MoneyPrinterTurboRenderClient requires base_url');
    }

    this.baseUrl = options.base_url.replace(/\/+$/, '');
    this.apiKey = options.api_key;
    this.renderPath = options.render_path ?? '/render';
    this.timeoutMs = options.timeout_ms ?? 30_000;
    this.apiKeyHeader = options.api_key_header ?? 'x-api-key';
  }

  async render(request: VideoRenderRequest): Promise<VideoRenderManifest> {
    const payload = buildMoneyPrinterTurboPayload(request);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const resp = await fetch(`${this.baseUrl}${this.renderPath}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.apiKey ? { [this.apiKeyHeader]: this.apiKey } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '(no body)');
        throw new Error(`MoneyPrinterTurbo error ${resp.status}: ${body}`);
      }

      const data = (await resp.json()) as unknown;
      return normalizeManifest(request, data);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`MoneyPrinterTurbo render timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
