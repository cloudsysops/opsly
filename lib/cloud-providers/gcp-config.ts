/**
 * GCP Integration Configuration
 * Google OAuth, Google Maps API, Google Places API
 */

import { z } from 'zod';

const gcpEnvSchema = z.object({
  GCP_PROJECT_ID: z.string().optional().default(''),
  GCP_SERVICE_ACCOUNT_KEY: z.string().optional().default(''),
  GOOGLE_OAUTH_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_MAPS_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  GOOGLE_PLACES_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
  GOOGLE_PLACES_API_KEY: z.string().optional().default(''),
});

export type GCPConfig = z.infer<typeof gcpEnvSchema>;

class GCPConfigManager {
  private config: GCPConfig;

  constructor() {
    this.config = gcpEnvSchema.parse(process.env);
  }

  getOAuthConfig() {
    return {
      enabled: this.config.GOOGLE_OAUTH_ENABLED,
      clientId: this.config.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: this.config.GOOGLE_OAUTH_CLIENT_SECRET ? '***' : null,
    };
  }

  getMapsConfig() {
    return {
      enabled: this.config.GOOGLE_MAPS_ENABLED,
      apiKey: this.config.GOOGLE_MAPS_API_KEY ? '***' : null,
      restricted: true, // Always restrict to HTTP referrer
    };
  }

  getPlacesConfig() {
    return {
      enabled: this.config.GOOGLE_PLACES_ENABLED,
      apiKey: this.config.GOOGLE_PLACES_API_KEY ? '***' : null,
      restricted: true, // Always restrict to HTTP referrer
    };
  }

  isConfigured(): boolean {
    return !!this.config.GCP_PROJECT_ID;
  }
}

export const gcpConfig = new GCPConfigManager();

/**
 * Health check for GCP services
 */
export async function checkGCPHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  oauth?: boolean;
  maps?: boolean;
  places?: boolean;
}> {
  try {
    const oauthConfig = gcpConfig.getOAuthConfig();
    const mapsConfig = gcpConfig.getMapsConfig();

    if (!oauthConfig.enabled && !mapsConfig.enabled) {
      return { status: 'healthy', oauth: false, maps: false };
    }

    // TODO: Test OAuth and Maps API connectivity
    // This would require GCP SDK initialization

    return {
      status: 'healthy',
      oauth: oauthConfig.enabled,
      maps: mapsConfig.enabled,
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      oauth: false,
      maps: false,
    };
  }
}
