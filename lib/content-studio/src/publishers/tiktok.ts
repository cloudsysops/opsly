import { readFileSync, statSync } from 'node:fs';
import type {
  TikTokCredentials,
  TikTokPublishRequest,
  TikTokPublishResult,
} from '../types.js';

const TIKTOK_API_BASE = 'https://open.tiktokapis.com/v2';
const MAX_SINGLE_CHUNK_BYTES = 64 * 1024 * 1024;

interface TikTokInitResponse {
  data?: {
    publish_id?: string;
    upload_url?: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
}

/**
 * Thin wrapper around the TikTok Content Posting API (Direct Post,
 * FILE_UPLOAD source) — https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
 *
 * Safety by construction, mirroring publishers/youtube.ts:
 * - `credentials` must be passed in explicitly by the caller (read from
 *   Doppler env vars at the CLI boundary, never hardcoded or read directly
 *   from this module).
 * - This class performs the actual upload when `publish()` is called — the
 *   dry-run / human-approval gate lives above this layer (see
 *   content-engine/publishing.ts `assertHumanApprovedPublish`), not here, so
 *   this class stays a plain, testable API wrapper.
 * - Single-chunk upload only (`total_chunk_count: 1`); files above 64 MB fail
 *   closed before any network request because multi-chunk upload is not yet
 *   implemented here.
 */
export class TikTokPublisher {
  constructor(private readonly credentials: TikTokCredentials) {
    if (!credentials.access_token) {
      throw new Error('TikTokPublisher requires access_token');
    }
  }

  async publish(request: TikTokPublishRequest): Promise<TikTokPublishResult> {
    const stat = statSync(request.file_path);
    if (!stat.isFile() || stat.size === 0) {
      throw new Error(`Video file not found or empty: ${request.file_path}`);
    }
    if (stat.size > MAX_SINGLE_CHUNK_BYTES) {
      throw new Error(
        `TikTok single-chunk upload limit exceeded: ${stat.size} bytes > ${MAX_SINGLE_CHUNK_BYTES} bytes`
      );
    }

    const initResponse = await fetch(`${TIKTOK_API_BASE}/post/publish/video/init/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.credentials.access_token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: request.title,
          privacy_level: request.privacy_level,
          disable_duplicate_check: request.disable_duplicate_check ?? false,
          disable_comment: request.disable_comment ?? false,
          disable_stitch: request.disable_stitch ?? false,
          disable_duet: request.disable_duet ?? false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: stat.size,
          chunk_size: stat.size,
          total_chunk_count: 1,
        },
      }),
    });

    const initData = (await initResponse.json()) as TikTokInitResponse;

    if (!initResponse.ok || initData.error?.code) {
      throw new Error(`TikTok publish init failed: ${initData.error?.message ?? initResponse.statusText}`);
    }

    const publishId = initData.data?.publish_id;
    const uploadUrl = initData.data?.upload_url;
    if (!publishId || !uploadUrl) {
      throw new Error('TikTok API did not return publish_id/upload_url');
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${stat.size - 1}/${stat.size}`,
      },
      body: readFileSync(request.file_path),
    });

    if (!uploadResponse.ok) {
      throw new Error(`TikTok video upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    return {
      publish_id: publishId,
      status: 'PROCESSING_UPLOAD',
    };
  }
}

/** Reads a TikTok access token from environment variables (populated via Doppler). */
export function loadTikTokCredentialsFromEnv(
  env: NodeJS.ProcessEnv = process.env
): TikTokCredentials {
  const access_token = env.TIKTOK_ACCESS_TOKEN;

  if (!access_token) {
    throw new Error(
      'Missing TIKTOK_ACCESS_TOKEN. Run via: doppler run --project ops-intcloudsysops --config prd -- <cmd>'
    );
  }

  return { access_token };
}
