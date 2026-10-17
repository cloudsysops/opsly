// Puente entre la cola de OpsAfterDark y el YouTubePublisher que YA existe en lib/content-studio.
// No sube nada por su cuenta: recibe la clase YouTubePublisher por inyeccion (asi se prueba sin red).
//
// Seguridad por construccion:
//  - Usa SOLO YOUTUBE_OPSAFTERDARK_REFRESH_TOKEN. El YOUTUBE_REFRESH_TOKEN del entorno autoriza el canal Opsly y
//    NUNCA se usa aqui: sin el token propio del canal de OpsAfterDark, ready() dice que faltan credenciales y no se sube nada.
//  - Privacidad por defecto 'private' (YOUTUBE_OPSAFTERDARK_PRIVACY: private | unlisted | public).
//  - made_for_kids = false (gameplay para publico general), categoria 20 (Gaming).
import { hashtagsOf, titleFrom, toLocalPath as defaultToLocalPath } from './publisher-util.mjs';

export const REQUIRED_ENV = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_OPSAFTERDARK_REFRESH_TOKEN'];
const PRIVACIES = ['private', 'unlisted', 'public'];

export function createYouTubeShortsAdapter({ env = process.env, YouTubePublisher, toLocalPath = defaultToLocalPath } = {}) {
  if (typeof YouTubePublisher !== 'function') throw new Error('createYouTubeShortsAdapter necesita la clase YouTubePublisher');
  return {
    name: 'youtube_shorts',
    ready() {
      const miss = REQUIRED_ENV.filter((n) => !env[n]);
      return miss.length ? { ok: false, missing: miss } : { ok: true };
    },
    async publish(entry) {
      if (!entry.vertical) throw new Error('la entrada no tiene video vertical');
      const privacy = PRIVACIES.includes(env.YOUTUBE_OPSAFTERDARK_PRIVACY) ? env.YOUTUBE_OPSAFTERDARK_PRIVACY : 'private';
      const publisher = new YouTubePublisher({
        client_id: env.YOUTUBE_CLIENT_ID,
        client_secret: env.YOUTUBE_CLIENT_SECRET,
        refresh_token: env.YOUTUBE_OPSAFTERDARK_REFRESH_TOKEN,
      });
      const result = await publisher.publish({
        file_path: toLocalPath(entry.vertical),
        title: titleFrom(entry),
        description: String(entry.caption ?? '').trim(),
        tags: ['shorts', ...hashtagsOf(entry.caption).filter((t) => t !== 'shorts')],
        category_id: '20',
        privacy_status: privacy,
        made_for_kids: false,
      });
      return { id: result.video_id, url: result.url, privacy };
    },
  };
}
