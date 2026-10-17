// Adaptador Make.com: dispara un webhook con el clip aprobado.
// Make (no Twitch) es quien publica a TikTok / Instagram cuando el escenario tiene
// esas cuentas conectadas en la UI de Make.
//
// Limitacion: Make cloud no lee D:\… — el payload incluye rutas locales + metadatos.
// El escenario Make debe obtener el video por URL publica (Drive/CDN) o modulo de
// fichero que configures. Mientras tanto marcamos la plataforma como publicada
// en sentido "handed-off-to-make" cuando el webhook responde 2xx.
import fs from 'node:fs';
import { toLocalPath } from './publisher-util.mjs';

export const MAKE_REQUIRED_ENV = ['MAKE_OPSAFTERDARK_WEBHOOK_URL'];

/**
 * @param {{ env?: NodeJS.ProcessEnv, fetchImpl?: typeof fetch, toLocalPathFn?: typeof toLocalPath }} [opts]
 */
export function createMakeSocialAdapter({
  env = process.env,
  fetchImpl = globalThis.fetch,
  toLocalPathFn = toLocalPath,
  platform = 'make',
} = {}) {
  return {
    name: platform,
    ready() {
      const miss = MAKE_REQUIRED_ENV.filter((n) => !String(env[n] ?? '').trim());
      return miss.length ? { ok: false, missing: miss } : { ok: true };
    },
    async publish(entry) {
      const webhook = String(env.MAKE_OPSAFTERDARK_WEBHOOK_URL).trim();
      if (!entry.vertical) throw new Error('la entrada no tiene video vertical');
      const verticalPath = toLocalPathFn(entry.vertical);
      if (!fs.existsSync(verticalPath)) throw new Error(`vertical missing: ${verticalPath}`);
      const st = fs.statSync(verticalPath);

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
          path: verticalPath,
          path_posix: verticalPath.replace(/^([A-Za-z]):\\/, (_, d) => `/mnt/${d.toLowerCase()}/`).replace(/\\/g, '/'),
          bytes: st.size,
          name: verticalPath.split(/[/\\]/).pop(),
        },
        horizontal: entry.horizontal
          ? {
              path: toLocalPathFn(entry.horizontal),
            }
          : null,
        platforms: entry.platforms ?? [],
        note:
          'Video is local to the stream PC. Make scenario must fetch via a public URL you configure (Drive/CDN) or a file module. Twitch connected accounts are NOT used here.',
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
        id: parsed?.executionId || parsed?.id || `make-${entry.id}-${platform}`,
        url: parsed?.url ?? null,
        note: 'handed_off_to_make',
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
