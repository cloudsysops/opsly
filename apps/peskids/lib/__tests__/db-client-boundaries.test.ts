/**
 * Static guard tests for database-client boundaries.
 *
 * These scan the real source tree rather than mocking anything, so they catch a
 * regression the moment someone adds a new route or component — which is the
 * only way a rule like "the service-role key never reaches the browser" stays
 * true over time.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const APP_ROOT = path.resolve(__dirname, '../..');

const SCANNED_DIRS = ['app', 'lib', 'components', 'hooks', 'config'];
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx']);
const SKIPPED_DIRS = new Set(['node_modules', '.next', 'dist', '__tests__', 'e2e']);

/**
 * `createClient` from `@supabase/supabase-js` is the service-role-capable
 * factory: it takes a raw key, so a mistake here is a full RLS bypass. Exactly
 * one module may call it.
 */
const SERVICE_ROLE_CAPABLE_MODULES = new Set([path.join('lib', 'supabase.ts')]);

/**
 * `@supabase/ssr` factories only ever receive the anon key and are bound to a
 * request's cookies, so RLS still applies. They are allowed in the shared
 * helpers plus the auth routes that need a response-scoped cookie writer.
 */
const ANON_SSR_MODULES = new Set([
  path.join('lib', 'supabase-server.ts'),
  path.join('lib', 'supabase-browser.ts'),
  'middleware.ts',
  path.join('app', 'auth', 'callback', 'route.ts'),
  path.join('app', 'auth', 'recovery', 'complete', 'route.ts'),
]);

type SourceFile = { relativePath: string; contents: string };

function collectSourceFiles(): SourceFile[] {
  const files: SourceFile[] = [];

  function walk(absoluteDir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(absoluteDir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIPPED_DIRS.has(entry)) continue;
      const absolute = path.join(absoluteDir, entry);
      const stats = statSync(absolute);
      if (stats.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (!SCANNED_EXTENSIONS.has(path.extname(entry))) continue;
      if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) continue;
      files.push({
        relativePath: path.relative(APP_ROOT, absolute),
        contents: readFileSync(absolute, 'utf8'),
      });
    }
  }

  for (const dir of SCANNED_DIRS) {
    walk(path.join(APP_ROOT, dir));
  }
  const middleware = path.join(APP_ROOT, 'middleware.ts');
  try {
    files.push({
      relativePath: 'middleware.ts',
      contents: readFileSync(middleware, 'utf8'),
    });
  } catch {
    /* middleware is optional */
  }
  return files;
}

const sourceFiles = collectSourceFiles();

function isClientComponent(file: SourceFile): boolean {
  const head = file.contents.slice(0, 200);
  return /^\s*(['"])use client\1/m.test(head);
}

describe('database client boundaries', () => {
  it('scans a non-trivial number of source files (guard against a broken scanner)', () => {
    expect(sourceFiles.length).toBeGreaterThan(200);
  });

  it('never references the service-role key from a client component', () => {
    const offenders = sourceFiles
      .filter(isClientComponent)
      .filter((file) => file.contents.includes('SUPABASE_SERVICE_ROLE_KEY'))
      .map((file) => file.relativePath);

    expect(offenders).toEqual([]);
  });

  it('never imports the service-role client module from a client component', () => {
    const serviceModulePattern =
      /from\s+['"](?:@\/lib\/supabase|\.{1,2}(?:\/\.\.)*\/lib\/supabase|\.\/supabase)['"]/;

    const offenders = sourceFiles
      .filter(isClientComponent)
      .filter((file) => serviceModulePattern.test(file.contents))
      .map((file) => file.relativePath);

    expect(offenders).toEqual([]);
  });

  it('never exposes the service-role key through a NEXT_PUBLIC_ variable', () => {
    const offenders = sourceFiles
      .filter((file) => /NEXT_PUBLIC_[A-Z0-9_]*SERVICE_ROLE/.test(file.contents))
      .map((file) => file.relativePath);

    expect(offenders).toEqual([]);
  });

  it('constructs a raw (service-role-capable) client only in lib/supabase.ts', () => {
    const importsRawFactory =
      /import\s+\{[^}]*\bcreateClient\b[^}]*\}\s+from\s+['"]@supabase\/supabase-js['"]/;

    const offenders = sourceFiles
      .filter((file) => importsRawFactory.test(file.contents))
      .map((file) => file.relativePath)
      .filter((relativePath) => !SERVICE_ROLE_CAPABLE_MODULES.has(relativePath));

    expect(offenders).toEqual([]);
  });

  it('constructs anon-key SSR clients only in the allow-listed modules', () => {
    const importsSsrFactory =
      /import\s+\{[^}]*\b(?:createServerClient|createBrowserClient|createClient)\b[^}]*\}\s+from\s+['"]@supabase\/ssr['"]/;

    const offenders = sourceFiles
      .filter((file) => importsSsrFactory.test(file.contents))
      .map((file) => file.relativePath)
      .filter((relativePath) => !ANON_SSR_MODULES.has(relativePath));

    expect(offenders).toEqual([]);
  });

  it('never passes the service-role key into an SSR/browser client factory', () => {
    const offenders = sourceFiles
      .filter((file) => /@supabase\/ssr/.test(file.contents))
      .filter((file) => file.contents.includes('SUPABASE_SERVICE_ROLE_KEY'))
      .map((file) => file.relativePath);

    expect(offenders).toEqual([]);
  });
});

describe('supabaseServer runtime guard', () => {
  it('refuses to build a service-role client when a browser global is present', async () => {
    const { assertServerRuntime } = await import('../supabase');
    const globalRef = globalThis as { window?: unknown };
    const had = 'window' in globalRef;
    globalRef.window = {};
    try {
      expect(() => assertServerRuntime('test')).toThrow(/server-only/i);
    } finally {
      if (!had) delete globalRef.window;
    }
  });

  it('allows construction on the server', async () => {
    const { assertServerRuntime } = await import('../supabase');
    expect(() => assertServerRuntime('test')).not.toThrow();
  });
});
