import { createReadStream, statSync } from 'node:fs';
import { google } from 'googleapis';
import type {
  YouTubeCredentials,
  YouTubePublishRequest,
  YouTubePublishResult,
  YouTubeConnectionProbeResult,
} from '../types.js';

/**
 * Thin wrapper around the YouTube Data API v3 `videos.insert` call.
 *
 * Safety by construction:
 * - `credentials` must be passed in explicitly by the caller (read from
 *   Doppler env vars at the CLI boundary, never hardcoded or read directly
 *   from this module) — see docs/runbooks/YOUTUBE-PUBLISHING.md.
 * - `made_for_kids` has no default; the caller must decide it per video.
 * - This class performs the actual upload when `publish()` is called — the
 *   dry-run / approval gate lives in the CLI (scripts/content/youtube-publish.ts),
 *   not here, so this class stays a plain, testable API wrapper.
 */
export class YouTubePublisher {
  private readonly auth: InstanceType<typeof google.auth.OAuth2>;

  constructor(credentials: YouTubeCredentials) {
    if (!credentials.client_id || !credentials.client_secret || !credentials.refresh_token) {
      throw new Error(
        'YouTubePublisher requires client_id, client_secret, and refresh_token — see docs/runbooks/YOUTUBE-PUBLISHING.md'
      );
    }
    this.auth = new google.auth.OAuth2(credentials.client_id, credentials.client_secret);
    this.auth.setCredentials({ refresh_token: credentials.refresh_token });
  }

  /**
   * Read-only connectivity probe.
   *
   * Exchanges the configured refresh token for an access token and asks
   * YouTube which channel(s) the authenticated user owns/manages. This method
   * never uploads or mutates YouTube state.
   */
  async probeConnection(): Promise<YouTubeConnectionProbeResult> {
    const token = await this.auth.getAccessToken();
    if (!token?.token) {
      throw new Error('YouTube OAuth token exchange returned no access token');
    }

    const youtube = google.youtube({ version: 'v3', auth: this.auth });
    const response = await youtube.channels.list({
      part: ['snippet'],
      mine: true,
      maxResults: 50,
    });

    const channels = (response.data.items ?? [])
      .map((item) => ({
        channel_id: item.id ?? '',
        title: item.snippet?.title ?? '',
        custom_url: item.snippet?.customUrl ?? undefined,
      }))
      .filter((item) => Boolean(item.channel_id));

    return {
      token_exchange: 'PASS',
      channel_count: channels.length,
      channels,
      checked_at: new Date().toISOString(),
    };
  }

  async publish(request: YouTubePublishRequest): Promise<YouTubePublishResult> {
    if (typeof request.made_for_kids !== 'boolean') {
      throw new Error('made_for_kids must be explicitly true or false (COPPA requirement)');
    }

    const stat = statSync(request.file_path);
    if (!stat.isFile() || stat.size === 0) {
      throw new Error(`Video file not found or empty: ${request.file_path}`);
    }

    const youtube = google.youtube({ version: 'v3', auth: this.auth });

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: request.title,
          description: request.description,
          tags: request.tags,
          categoryId: request.category_id ?? '22',
        },
        status: {
          privacyStatus: request.privacy_status,
          selfDeclaredMadeForKids: request.made_for_kids,
        },
      },
      media: {
        body: createReadStream(request.file_path),
      },
    });

    const videoId = response.data.id;
    if (!videoId) {
      throw new Error('YouTube API did not return a video id');
    }

    if (request.playlist_id) {
      await youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId: request.playlist_id,
            resourceId: { kind: 'youtube#video', videoId },
          },
        },
      });
    }

    return {
      video_id: videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      uploaded_at: new Date().toISOString(),
    };
  }
}

/** Reads YouTube OAuth2 credentials from environment variables (populated via Doppler). */
export function loadYouTubeCredentialsFromEnv(
  env: NodeJS.ProcessEnv = process.env
): YouTubeCredentials {
  const client_id = env.YOUTUBE_CLIENT_ID;
  const client_secret = env.YOUTUBE_CLIENT_SECRET;
  const refresh_token = env.YOUTUBE_REFRESH_TOKEN;

  if (!client_id || !client_secret || !refresh_token) {
    throw new Error(
      'Missing YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN. ' +
        'Run via: doppler run --project ops-intcloudsysops --config prd -- <cmd> ' +
        '— see docs/runbooks/YOUTUBE-PUBLISHING.md'
    );
  }

  return { client_id, client_secret, refresh_token };
}
