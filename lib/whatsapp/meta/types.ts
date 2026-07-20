/**
 * Meta Cloud API — contract types (no HTTP).
 */

import { z } from 'zod';

export const metaWebhookChangeSchema = z.object({
  field: z.string(),
  value: z.record(z.unknown()),
}).passthrough();

export const metaWebhookEntrySchema = z.object({
  id: z.string().optional(),
  changes: z.array(metaWebhookChangeSchema).optional(),
}).passthrough();

/** Minimal Meta WhatsApp Cloud webhook envelope. */
export const metaWebhookPayloadSchema = z.object({
  object: z.string().optional(),
  entry: z.array(metaWebhookEntrySchema).optional(),
}).passthrough();

export type MetaWebhookPayload = z.infer<typeof metaWebhookPayloadSchema>;

export interface MetaProviderConfig {
  appId: string;
  appSecret: string;
  verifyToken: string;
  accessToken: string;
  wabaId: string;
  phoneNumberId: string;
  apiVersion?: string;
}

export function parseMetaProviderConfig(
  config: Record<string, unknown>
): MetaProviderConfig {
  const appId = String(config.appId ?? '');
  const appSecret = String(config.appSecret ?? '');
  const verifyToken = String(config.verifyToken ?? '');
  const accessToken = String(config.accessToken ?? '');
  const wabaId = String(config.wabaId ?? '');
  const phoneNumberId = String(config.phoneNumberId ?? '');
  const apiVersion = String(config.apiVersion ?? 'v21.0');

  if (!appId || !appSecret) {
    throw new Error('[Meta] appId and appSecret are required for contract construction');
  }

  return {
    appId,
    appSecret,
    verifyToken,
    accessToken,
    wabaId,
    phoneNumberId,
    apiVersion,
  };
}
