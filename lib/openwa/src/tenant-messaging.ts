import { sendTextMessage } from './client.js';
import { getConfigForTenant } from './config.js';
import type { SendTextResult } from './types.js';

export async function sendTextMessageForTenant(
  tenantSlug: string,
  to: string,
  text: string
): Promise<SendTextResult> {
  const cfg = getConfigForTenant(tenantSlug);
  if (!cfg) {
    throw new Error(`OpenWA not configured for tenant ${tenantSlug}`);
  }
  return sendTextMessage(to, text, cfg);
}
