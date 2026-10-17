// Modulo de adaptadores para `publisher.mjs --adapters`.
// - YouTube Shorts: YouTubePublisher (lib/content-studio) + token OpsAfterDark
// - TikTok / Instagram Reels: Make.com webhook (cuentas conectadas en Make UI)
import { YouTubePublisher } from '../../../lib/content-studio/src/index.js';
import { createYouTubeShortsAdapter } from './youtube-bridge.mjs';
import {
  createTikTokMakeAdapter,
  createInstagramReelsMakeAdapter,
} from './make-bridge.mjs';

export default {
  youtube_shorts: createYouTubeShortsAdapter({ env: process.env, YouTubePublisher }),
  tiktok: createTikTokMakeAdapter({ env: process.env }),
  instagram_reels: createInstagramReelsMakeAdapter({ env: process.env }),
};
