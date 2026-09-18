export type OpslyPublicRuntimeConfig = {
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supportEmail?: string;
  platformDomain?: string;
};

declare global {
  interface Window {
    __OPSLY_PUBLIC_RUNTIME_CONFIG__?: OpslyPublicRuntimeConfig;
  }
}

export function getPublicRuntimeConfig(): OpslyPublicRuntimeConfig {
  if (typeof window === 'undefined') return {};
  return window.__OPSLY_PUBLIC_RUNTIME_CONFIG__ ?? {};
}
