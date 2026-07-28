import type { MetaCloudEnvConfig, WhatsAppLifecycleState } from './types.js';
import { isMetaInboundAccepting, isMetaOutboundAllowed } from './env-config.js';

export interface WhatsAppReadiness {
  lifecycle: WhatsAppLifecycleState;
  provider: 'meta_cloud' | 'stub';
  inboundAccepting: boolean;
  outboundAllowed: boolean;
  transportReal: boolean;
  reasons: string[];
}

/**
 * Health must never treat Nginx proxy / stub as ready transport.
 */
export function assessWhatsAppReadiness(cfg: MetaCloudEnvConfig): WhatsAppReadiness {
  const reasons: string[] = [];
  const hasSecret = cfg.appSecret.length > 0;
  const hasVerify = cfg.verifyToken.length > 0;
  const hasPhone = cfg.phoneNumberId.length > 0;
  const hasToken = cfg.accessToken.length > 0;

  if (!hasSecret) reasons.push('missing_app_secret');
  if (!hasVerify) reasons.push('missing_verify_token');
  if (!hasPhone) reasons.push('missing_phone_number_id');
  if (!cfg.enabled) reasons.push('master_flag_off');
  if (!cfg.inboundEnabled) reasons.push('inbound_flag_off');
  if (!cfg.outboundEnabled) reasons.push('outbound_flag_off');
  if (!hasToken) reasons.push('missing_access_token');

  const transportReal = hasSecret && hasPhone && hasVerify;
  const inboundAccepting = isMetaInboundAccepting(cfg);
  const outboundAllowed = isMetaOutboundAllowed(cfg);

  let lifecycle: WhatsAppLifecycleState = cfg.lifecycle;
  if (!transportReal) {
    lifecycle = 'stub';
  } else if (!cfg.enabled) {
    lifecycle = 'configured';
  }

  return {
    lifecycle,
    provider: transportReal ? 'meta_cloud' : 'stub',
    inboundAccepting,
    outboundAllowed,
    transportReal,
    reasons,
  };
}
