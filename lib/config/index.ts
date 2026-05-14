export interface Config {
  NODE_ENV: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  REDIS_URL: string;
  DATABASE_URL: string;
  AGENT_MAX_CONCURRENT: number;
  EVALUATION_STRICT_MODE: boolean;
  CACHE_TTL_SECONDS: number;
}

export interface FeatureFlags {
  agentsV2Enabled: boolean;
  evaluationStrictMode: boolean;
  cacheEnabled: boolean;
  profilerEnabled: boolean;
}

export function getConfig(): Config {
  return {
    NODE_ENV: (process.env.NODE_ENV || 'development') as any,
    LOG_LEVEL: (process.env.LOG_LEVEL || 'info') as any,
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://localhost/opsly',
    AGENT_MAX_CONCURRENT: parseInt(process.env.AGENT_MAX_CONCURRENT || '10'),
    EVALUATION_STRICT_MODE: process.env.EVALUATION_STRICT_MODE === 'true',
    CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS || '3600'),
  };
}

export async function getFeatureFlags(tenantId: string): Promise<FeatureFlags> {
  return {
    agentsV2Enabled: true,
    evaluationStrictMode: false,
    cacheEnabled: true,
    profilerEnabled: false,
  };
}
