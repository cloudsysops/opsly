import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} root
 * @returns {Record<string, unknown>}
 */
export function loadBrandKit(root) {
  return JSON.parse(readFileSync(join(root, 'config/content-studio/brand-kit.json'), 'utf8'));
}

/**
 * Prefix image_prompt with the channel visual canon and attach reference paths.
 * @param {Record<string, unknown>} kit
 * @param {string} channelKey
 * @param {string} imagePrompt
 */
export function applyBrandKit(kit, channelKey, imagePrompt) {
  const channels = kit.channels && typeof kit.channels === 'object' ? kit.channels : {};
  const channel = channels[channelKey];
  const base = String(imagePrompt || '').trim();
  if (!channel || typeof channel !== 'object') {
    return { image_prompt: base, visual_refs: [], style_tokens: [] };
  }
  const entry = /** @type {{ image_prompt_prefix?: string, reference_images?: string[], style_tokens?: string[] }} */ (
    channel
  );
  const prefix = String(entry.image_prompt_prefix || '').trim();
  const marker = prefix.slice(0, 28).toLowerCase();
  const alreadyPrefixed = Boolean(marker && base.toLowerCase().includes(marker));
  const prompt = prefix && !alreadyPrefixed ? `${prefix}${base ? `. ${base}` : ''}` : base;
  return {
    image_prompt: prompt,
    visual_refs: Array.isArray(entry.reference_images) ? entry.reference_images : [],
    style_tokens: Array.isArray(entry.style_tokens) ? entry.style_tokens : [],
  };
}
