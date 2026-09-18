#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

function first(env, ...names) {
  for (const name of names) {
    const value = String(env[name] ?? '').trim();
    if (value) return value;
  }
  return '';
}

export function buildPublicRuntimeConfig(env = process.env) {
  return {
    apiUrl: first(env, 'NEXT_PUBLIC_API_URL', 'PUBLIC_API_URL'),
    supabaseUrl: first(env, 'SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: first(
      env,
      'SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ),
    supportEmail: first(env, 'NEXT_PUBLIC_SUPPORT_EMAIL', 'SUPPORT_EMAIL'),
    platformDomain: first(env, 'NEXT_PUBLIC_PLATFORM_DOMAIN', 'PLATFORM_DOMAIN'),
  };
}

export function renderPublicRuntimeConfigScript(env = process.env) {
  const json = JSON.stringify(buildPublicRuntimeConfig(env)).replace(/</g, '\\u003c');
  return `window.__OPSLY_PUBLIC_RUNTIME_CONFIG__=${json};\n`;
}

function main() {
  const outputPath = process.argv[2];
  if (!outputPath) {
    throw new Error('usage: render-public-runtime-config.mjs OUTPUT_PATH');
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, renderPublicRuntimeConfigScript(process.env), 'utf8');
  console.log(`public runtime config rendered: ${outputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`render-public-runtime-config: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
