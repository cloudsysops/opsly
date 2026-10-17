// Adaptador Make.com: sube el vertical a Drive (URL publica) y dispara el webhook.
// Make publica a TikTok / Instagram cuando el escenario tiene esas cuentas conectadas.
// No envia rutas D:\ ni /mnt/... al webhook externo.
import fs from 'node:fs';
import { toLocalPath } from './publisher-util.mjs';
import { driveStageReady, stageVideoToDrive, DRIVE_STAGE_REQUIRED } from './drive-stage.mjs';

export const MAKE_REQUIRED_ENV = ['MAKE_OPSAFTERDARK_WEBHOOK_URL', ...DRIVE_STAGE_REQUIRED];

/**
 * @param {{ env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch, toLocalPathFn?: typeof toLocalPath, stageFn?: typeof stageVideoToDrive }} [opts]
 */
export function createMakeSocialAdapter({
  env = process.env,
  fetchImpl = globalThis.fetch,
  toLocalPathFn = toLocalPath,
  stageFn = stageVideoToDrive,
  platform = 'make',
} = {}) {
  return {
    name: platform,
    ready() {
      const miss = [];
      if (!String(env.MAKE_OPSAFTERDARK_WEBHOOK_URL ?? '').trim()) miss.push('MAKE_OPSAFTERDARK_WEBHOOK_URL');
      const drive = driveStageReady(env);
      if (!drive.ok) miss.push(...drive.missing);
      return miss.length ? { ok: false, missing: [...new Set(miss)] } : { ok: true };
    },
    async publish(entry) {
      const webhook = String(env.MAKE_OPSAFTERDARK_WEBHOOK_URL).trim();
      if (!entry.vertical) throw new Error('la entrada no tiene video vertical');
      const verticalPath = toLocalPathFn(entry.vertical);
      if (!fs.existsSync(verticalPath)) throw new Error(`vertical missing: ${verticalPath}`);
      const st = fs.statSync(verticalPath);
      const baseName = `${entry.id || 'clip'}_${platform}.mp4`;

      const staged = await stageFn({
        filePath: verticalPath,
        fileName: baseName,
        env,
      });

      // Payload seguro: sin rutas locales. Solo URL publica + metadatos.
      const payload = {
        source: 'opsafterdark-poststream',
        event: 'publish_clip',
        platform,
        entry_id: entry.id,
        stamp: entry.stamp ?? null,
        caption: String(entry.caption ?? '').trim(),
        scheduled_at: entry.scheduledAt ?? null,
        timezone: entry.timezone ?? 'America/New_York',
        privacy: env.YOUTUBE_OPSAFTERDARK_PRIVACY || 'private',
        vertical: {
          public_url: staged.publicUrl,
          drive_file_id: staged.fileId,
          web_view_link: staged.webViewLink,
          bytes: st.size,
          name: baseName,
        },
        platforms: entry.platforms ?? [],
        note: 'Video staged on Google Drive (anyone-with-link). Twitch connected accounts are NOT used.',
      };

      const res = await fetchImpl(webhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Opsly-Source': 'opsafterdark-publisher',
          'X-Opsly-Entry-Id': String(entry.id),
          'X-Opsly-Platform': platform,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        throw new Error(`Make webhook HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }
      return {
        state: 'delivered_to_make',
        id: parsed?.executionId || parsed?.id || `make-${entry.id}-${platform}`,
        url: staged.publicUrl,
        note: 'delivered_to_make',
        privacy: payload.privacy,
      };
    },
  };
}

export function createTikTokMakeAdapter(opts) {
  return createMakeSocialAdapter({ ...opts, platform: 'tiktok' });
}

export function createInstagramReelsMakeAdapter(opts) {
  return createMakeSocialAdapter({ ...opts, platform: 'instagram_reels' });
}
