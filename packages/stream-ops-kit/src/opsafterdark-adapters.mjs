// Modulo de adaptadores para `publisher.mjs --adapters`. Une el YouTubePublisher de lib/content-studio (TypeScript)
// con la cola de OpsAfterDark. Debe ejecutarse con tsx, p. ej.:
//   doppler run -p ops-intcloudsysops -c prd --only-secrets YOUTUBE_CLIENT_ID,YOUTUBE_CLIENT_SECRET,YOUTUBE_OPSAFTERDARK_REFRESH_TOKEN,YOUTUBE_OPSAFTERDARK_PRIVACY -- \
//     node_modules/.bin/tsx packages/stream-ops-kit/src/publisher.mjs --queue <publish-queue.json> --adapters packages/stream-ops-kit/src/opsafterdark-adapters.mjs
// Solo hay adaptador de YouTube: TikTok e Instagram quedan como "sin adaptador" (se omiten) hasta tener credenciales.
import { YouTubePublisher } from '../../../lib/content-studio/src/index.js';
import { createYouTubeShortsAdapter } from './youtube-bridge.mjs';

export default {
  youtube_shorts: createYouTubeShortsAdapter({ env: process.env, YouTubePublisher }),
};
