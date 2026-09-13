#!/usr/bin/env tsx
/**
 * Read-only YouTube connectivity doctor.
 *
 * Verifies OAuth credential presence, refresh-token exchange, and
 * channels.list({ mine: true }). It never uploads or mutates YouTube state.
 */
import {
  YouTubePublisher,
  loadYouTubeCredentialsFromEnv,
} from '../../lib/content-studio/src/index.js';

type FailureClass = 'ACCESS' | 'AUTH' | 'API' | 'CONFIG' | 'UNKNOWN';

function classifyError(error: unknown): FailureClass {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('missing youtube_client_id') || normalized.includes('requires client_id')) {
    return 'CONFIG';
  }
  if (
    normalized.includes('invalid_grant') ||
    normalized.includes('unauthorized') ||
    normalized.includes('token') ||
    normalized.includes('oauth')
  ) {
    return 'AUTH';
  }
  if (
    normalized.includes('forbidden') ||
    normalized.includes('insufficient') ||
    normalized.includes('permission') ||
    normalized.includes('scope')
  ) {
    return 'ACCESS';
  }
  if (
    normalized.includes('youtube') ||
    normalized.includes('googleapi') ||
    normalized.includes('quota') ||
    normalized.includes('api')
  ) {
    return 'API';
  }
  return 'UNKNOWN';
}

function printEvidence(lines: Record<string, string | number>): void {
  for (const [key, value] of Object.entries(lines)) {
    console.log(`${key}=${value}`);
  }
}

async function main(): Promise<void> {
  const required = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'] as const;
  const missing = required.filter((name) => !process.env[name]?.trim());

  if (missing.length > 0) {
    printEvidence({
      checked_at: new Date().toISOString(),
      environment: process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local',
      oauth_variables: 'missing',
      oauth_token_exchange: 'FAIL',
      channels_mine: 'FAIL',
      channel_count: 0,
      read_connection: 'NO',
      failure_class: 'CONFIG',
      missing_variables: missing.join(','),
    });
    console.log('YOUTUBE_CONNECTION_NO:CONFIG_MISSING');
    process.exitCode = 2;
    return;
  }

  try {
    const credentials = loadYouTubeCredentialsFromEnv();
    const publisher = new YouTubePublisher(credentials);
    const result = await publisher.probeConnection();

    const primary = result.channels[0];
    printEvidence({
      checked_at: result.checked_at,
      environment: process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local',
      oauth_variables: 'present',
      oauth_token_exchange: result.token_exchange,
      channels_mine: 'PASS',
      channel_count: result.channel_count,
      channel_id: primary?.channel_id ?? 'none',
      channel_title: primary?.title ?? 'none',
      channel_custom_url: primary?.custom_url ?? 'none',
      read_connection: result.channel_count > 0 ? 'YES' : 'NO',
      failure_class: result.channel_count > 0 ? 'NONE' : 'CONFIG',
    });

    if (result.channel_count > 0 && primary) {
      console.log(`YOUTUBE_CONNECTION_YES:${primary.channel_id}`);
      return;
    }

    console.log('YOUTUBE_CONNECTION_NO:NO_OWNED_CHANNEL');
    process.exitCode = 3;
  } catch (error) {
    const failureClass = classifyError(error);
    const message = error instanceof Error ? error.message : String(error);
    printEvidence({
      checked_at: new Date().toISOString(),
      environment: process.env.GITHUB_ACTIONS === 'true' ? 'github-actions' : 'local',
      oauth_variables: 'present',
      oauth_token_exchange: failureClass === 'AUTH' ? 'FAIL' : 'UNKNOWN',
      channels_mine: 'FAIL',
      channel_count: 0,
      read_connection: 'NO',
      failure_class: failureClass,
      error_name: error instanceof Error ? error.name : 'Error',
    });
    // Deliberately do not print credential/token values or full response bodies.
    console.error(`youtube_doctor_error=${message.split('\n')[0]?.slice(0, 240) ?? 'unknown'}`);
    console.log(`YOUTUBE_CONNECTION_NO:${failureClass}`);
    process.exitCode = 4;
  }
}

void main();
