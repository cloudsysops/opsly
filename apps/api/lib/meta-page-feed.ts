import { HTTP_STATUS } from './constants';

/** Límite práctico por debajo del tope de Facebook (~63k). */
export const META_PAGE_MESSAGE_MAX_LENGTH = 8_000;

const GRAPH_TIMEOUT_MS = 20_000;
/** Códigos HTTP de error de Graph suelen ser 4xx/5xx; fuera de rango → 500. */
const GRAPH_HTTP_STATUS_CEILING_EXCLUSIVE = 600;

export type MetaPageFeedPublishResult =
  | { ok: true; post_id: string; dry_run: boolean }
  | { ok: false; error: string; status: number };

type GraphFeedSuccess = { id?: string };
type GraphErrorBody = { error?: { message?: string; code?: number } };

type GraphFetchOutcome =
  | { kind: 'network_error' }
  | { kind: 'invalid_json' }
  | { kind: 'response'; res: Response; json: unknown };

export function isMetaPageFeedConfigured(): boolean {
  const pageId = process.env.META_PAGE_ID?.trim() ?? '';
  const token = process.env.META_PAGE_ACCESS_TOKEN?.trim() ?? '';
  return pageId.length > 0 && token.length > 0;
}

export function resolveMetaGraphApiVersion(): string {
  const v = process.env.META_GRAPH_API_VERSION?.trim();
  return v && v.length > 0 ? v : 'v21.0';
}

export function graphErrorMessage(json: unknown): string {
  if (!json || typeof json !== 'object') {
    return 'Graph API error';
  }
  const err = (json as GraphErrorBody).error;
  const msg = typeof err?.message === 'string' ? err.message.trim() : '';
  return msg.length > 0 ? msg : 'Graph API error';
}

function readPageCredentials(): { pageId: string; token: string } | null {
  const pageId = process.env.META_PAGE_ID?.trim() ?? '';
  const token = process.env.META_PAGE_ACCESS_TOKEN?.trim() ?? '';
  if (pageId.length === 0 || token.length === 0) {
    return null;
  }
  return { pageId, token };
}

function buildFeedPostUrl(pageId: string): string {
  const version = resolveMetaGraphApiVersion();
  return `https://graph.facebook.com/${version}/${encodeURIComponent(pageId)}/feed`;
}

function graphErrorHttpStatus(status: number): number {
  const inRange = status >= HTTP_STATUS.BAD_REQUEST && status < GRAPH_HTTP_STATUS_CEILING_EXCLUSIVE;
  return inRange ? status : HTTP_STATUS.INTERNAL_ERROR;
}

async function postGraphPageFeed(
  url: string,
  message: string,
  token: string
): Promise<GraphFetchOutcome> {
  const body = new URLSearchParams();
  body.set('message', message);
  body.set('access_token', token);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
    });
  } catch {
    return { kind: 'network_error' };
  }

  try {
    const json = await res.json();
    return { kind: 'response', res, json };
  } catch {
    return { kind: 'invalid_json' };
  }
}

function outcomeFromGraph(outcome: GraphFetchOutcome): MetaPageFeedPublishResult {
  if (outcome.kind === 'network_error') {
    return {
      ok: false,
      error: 'Graph API request failed (timeout or network)',
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
    };
  }
  if (outcome.kind === 'invalid_json') {
    return {
      ok: false,
      error: 'Invalid JSON from Graph API',
      status: HTTP_STATUS.BAD_GATEWAY,
    };
  }

  const { res, json } = outcome;
  if (!res.ok) {
    return {
      ok: false,
      error: graphErrorMessage(json),
      status: graphErrorHttpStatus(res.status),
    };
  }

  const id = (json as GraphFeedSuccess).id;
  if (typeof id !== 'string' || id.length === 0) {
    return {
      ok: false,
      error: 'Graph API response missing post id',
      status: HTTP_STATUS.INTERNAL_ERROR,
    };
  }

  return { ok: true, post_id: id, dry_run: false };
}

/**
 * Publica un post de texto en el feed de la Page (Graph API).
 * Requiere META_PAGE_ID y META_PAGE_ACCESS_TOKEN (Page token con permisos adecuados).
 */
export async function publishMetaPageFeedPost(options: {
  message: string;
  dryRun: boolean;
}): Promise<MetaPageFeedPublishResult> {
  if (options.dryRun) {
    return { ok: true, post_id: '', dry_run: true };
  }

  const creds = readPageCredentials();
  if (!creds) {
    return {
      ok: false,
      error: 'META_PAGE_ID and META_PAGE_ACCESS_TOKEN must be set',
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
    };
  }

  const url = buildFeedPostUrl(creds.pageId);
  const outcome = await postGraphPageFeed(url, options.message, creds.token);
  return outcomeFromGraph(outcome);
}
