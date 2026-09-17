import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPublicRuntimeConfig,
  renderPublicRuntimeConfigScript,
} from '../render-public-runtime-config.mjs';

test('renderer exposes only explicitly public values', () => {
  const config = buildPublicRuntimeConfig({
    NEXT_PUBLIC_API_URL: 'https://api.qa.example',
    NEXT_PUBLIC_SUPABASE_URL: 'https://public.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-public',
    NEXT_PUBLIC_SUPPORT_EMAIL: 'support@example.com',
    NEXT_PUBLIC_PLATFORM_DOMAIN: 'qa.example.com',
    SUPABASE_SERVICE_ROLE_KEY: 'MUST_NOT_LEAK',
    PLATFORM_ADMIN_TOKEN: 'MUST_NOT_LEAK_EITHER',
  });

  assert.deepEqual(config, {
    apiUrl: 'https://api.qa.example',
    supabaseUrl: 'https://public.supabase.co',
    supabaseAnonKey: 'anon-public',
    supportEmail: 'support@example.com',
    platformDomain: 'qa.example.com',
  });
  assert.equal(JSON.stringify(config).includes('MUST_NOT_LEAK'), false);
});

test('renderer escapes script-closing input', () => {
  const script = renderPublicRuntimeConfigScript({
    NEXT_PUBLIC_SUPPORT_EMAIL: '</script><script>alert(1)</script>',
  });
  assert.equal(script.includes('</script>'), false);
  assert.match(script, /\\u003c\/script>/);
});

test('PLATFORM_DOMAIN is runtime fallback for public platform domain', () => {
  const config = buildPublicRuntimeConfig({ PLATFORM_DOMAIN: 'op-sly.test' });
  assert.equal(config.platformDomain, 'op-sly.test');
});
