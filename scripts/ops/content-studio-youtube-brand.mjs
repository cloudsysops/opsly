import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadBrandKit } from './content-studio-brand-kit.mjs';

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_UPLOAD = 'https://www.googleapis.com/upload/youtube/v3';

/**
 * @param {string} root
 * @param {string} channelKey
 */
export function loadChannelBrandPayload(root, channelKey) {
  const channels = JSON.parse(readFileSync(join(root, 'config/content-studio/youtube-channels.json'), 'utf8'));
  const meta = channels.channels?.[channelKey];
  if (!meta) throw new Error(`unknown channel ${channelKey}`);
  const kit = loadBrandKit(root);
  const kitChannel = kit.channels?.[channelKey] || {};
  const studio = kitChannel.studio || {};
  const avatarRel = studio.avatar || meta.studio_avatar || '';
  const bannerRel = studio.banner || meta.studio_banner || '';
  const aboutRel = studio.about || `config/content-studio/channels/${channelKey}/channel-about.txt`;
  const avatar = avatarRel ? join(root, avatarRel) : '';
  const banner = bannerRel ? join(root, bannerRel) : '';
  const aboutPath = join(root, aboutRel);
  const description = existsSync(aboutPath) ? readFileSync(aboutPath, 'utf8').trim() : '';
  return {
    channelKey,
    title: studio.name || meta.brand || channelKey,
    handle: meta.handle || kitChannel.handle || '',
    youtubeChannelId: meta.youtube_channel_id || '',
    description,
    keywords: 'Opsly, agentes, SaaS, multi-tenant, control plane, ICSO, IntCloud SysOps',
    defaultLanguage: 'es',
    country: 'CO',
    avatar,
    banner,
    avatarRel,
    bannerRel,
    aboutRel,
  };
}

/**
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string} refreshToken
 */
export async function refreshYoutubeAccessToken(clientId, clientSecret, refreshToken) {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!resp.ok) {
    throw new Error(`token refresh failed: ${resp.status}`);
  }
  const data = await resp.json();
  if (!data.access_token) throw new Error('token refresh returned no access_token');
  return String(data.access_token);
}

async function youtubeJson(accessToken, url, init = {}) {
  const headers = {
    authorization: `Bearer ${accessToken}`,
    ...(init.headers || {}),
  };
  const resp = await fetch(url, { ...init, headers });
  const text = await resp.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  if (!resp.ok) {
    const msg = body.error?.message || body.raw || text.slice(0, 200);
    throw new Error(`${init.method || 'GET'} ${url} → ${resp.status} ${msg}`);
  }
  return body;
}

export async function fetchOauthChannel(accessToken) {
  const data = await youtubeJson(
    accessToken,
    `${YOUTUBE_API}/channels?part=id,snippet,brandingSettings&mine=true`
  );
  const item = data.items?.[0];
  if (!item) throw new Error('OAuth mine=true returned no channel');
  return item;
}

async function uploadBanner(accessToken, bannerPath, channelId) {
  const media = readFileSync(bannerPath);
  const qs = new URLSearchParams({ uploadType: 'media' });
  if (channelId) qs.set('channelId', channelId);
  const resp = await fetch(`${YOUTUBE_UPLOAD}/channelBanners/insert?${qs}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'image/png',
      'content-length': String(media.byteLength),
    },
    body: media,
  });
  const text = await resp.text();
  let body = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = {};
  }
  if (!resp.ok || !body.url) {
    const msg = body.error?.message || text.slice(0, 200);
    throw new Error(`channelBanners.insert → ${resp.status} ${msg}`);
  }
  return String(body.url);
}

/**
 * Apply title/description/keywords + banner. Avatar is not supported by YouTube Data API.
 * @param {{ accessToken: string, payload: ReturnType<typeof loadChannelBrandPayload>, applyBanner: boolean }} opts
 */
export async function applyYoutubeChannelBrand({ accessToken, payload, applyBanner }) {
  const mine = await fetchOauthChannel(accessToken);
  if (payload.youtubeChannelId && mine.id !== payload.youtubeChannelId) {
    throw new Error(
      `OAuth is ${mine.id} (${mine.snippet?.title || ''}), target ${payload.channelKey} is ${payload.youtubeChannelId}`
    );
  }

  const branding = mine.brandingSettings || { channel: {}, image: {} };
  branding.channel = branding.channel || {};
  branding.image = branding.image || {};
  branding.channel.title = payload.title;
  branding.channel.description = payload.description;
  branding.channel.keywords = payload.keywords;
  branding.channel.defaultLanguage = payload.defaultLanguage;
  branding.channel.country = payload.country;

  let bannerUrl = branding.image.bannerExternalUrl || '';
  let bannerApplied = false;
  let bannerError = '';
  if (applyBanner) {
    if (!payload.banner || !existsSync(payload.banner)) {
      throw new Error(`missing banner ${payload.bannerRel}`);
    }
    try {
      bannerUrl = await uploadBanner(accessToken, payload.banner, mine.id);
      branding.image.bannerExternalUrl = bannerUrl;
      bannerApplied = true;
    } catch (err) {
      bannerError = err instanceof Error ? err.message : 'banner upload failed';
    }
  }

  const snippet = mine.snippet || {};
  snippet.title = payload.title;
  snippet.description = payload.description;
  snippet.defaultLanguage = payload.defaultLanguage;
  snippet.country = payload.country;

  await youtubeJson(accessToken, `${YOUTUBE_API}/channels?part=brandingSettings,snippet`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json; charset=UTF-8' },
    body: JSON.stringify({
      id: mine.id,
      snippet,
      brandingSettings: branding,
    }),
  });

  return {
    channelId: mine.id,
    title: payload.title,
    bannerApplied,
    bannerUrl: bannerApplied ? 'set' : '',
    bannerError,
    avatarApi: 'unsupported',
    descriptionChars: payload.description.length,
  };
}

export function summarizeBrandDryRun(payload) {
  return {
    channel: payload.channelKey,
    title: payload.title,
    handle: payload.handle,
    youtubeChannelId: payload.youtubeChannelId,
    avatar: existsSync(payload.avatar) ? payload.avatarRel : `MISSING ${payload.avatarRel}`,
    banner: existsSync(payload.banner) ? payload.bannerRel : `MISSING ${payload.bannerRel}`,
    about: payload.description ? payload.aboutRel : `MISSING ${payload.aboutRel}`,
    descriptionChars: payload.description.length,
    avatarApi: 'unsupported — Studio only',
  };
}
