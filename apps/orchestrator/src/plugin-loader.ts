/**
 * Plugin Loader — Carga dinámica de workers desde manifests JSON
 *
 * Permite registrar workers sin modificar index.ts.
 * Cada plugin se define en config/plugins/{name}.json con:
 *   - module, export, queue, jobName, concurrency, envGate
 *
 * Uso: const loader = new PluginLoader(connection);
 *       const cleanups = await loader.loadManifest('maia-workers');
 */

import { Worker, type ConnectionOptions } from 'bullmq';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface PluginManifest {
  version: string;
  description: string;
  plugins: PluginEntry[];
  categories?: Record<string, { description: string; envGate?: string }>;
}

interface PluginEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  module: string;
  export: string;
  queue: string;
  jobName?: string;
  concurrency?: number;
  envGate?: string;
  dependencies?: string[];
  category?: string;
  tags?: string[];
  disabled?: boolean;
}

function getDefaultManifestsDir(): string {
  const candidates = [
    join(process.cwd(), 'config', 'plugins'),
    join(process.cwd(), '..', '..', 'config', 'plugins'),
  ];
  for (const dir of candidates) {
    if (existsSync(dir)) return dir;
  }
  return join(process.cwd(), 'config', 'plugins');
}

function resolveModulePath(relativePath: string): string {
  if (relativePath.startsWith('.')) {
    return join(getDefaultManifestsDir(), relativePath);
  }
  return relativePath;
}

function isWorkerEnabled(entry: PluginEntry): boolean {
  if (entry.disabled) return false;
  if (entry.envGate) {
    return process.env[entry.envGate] === 'true';
  }
  return true;
}

export class PluginLoader {
  private readonly manifestsDir: string;
  private readonly connection: ConnectionOptions;
  private workers: Map<string, { close: () => Promise<void> }> = new Map();
  private loaded: Set<string> = new Set();

  constructor(connection: ConnectionOptions, manifestsDir?: string) {
    this.connection = connection;
    this.manifestsDir = manifestsDir ?? getDefaultManifestsDir();
  }

  async loadManifest(name: string): Promise<{ id: string; name: string; status: string }[]> {
    const filePath = join(this.manifestsDir, `${name}.json`);
    if (!existsSync(filePath)) {
      console.warn(`[PluginLoader] Manifest not found: ${filePath}`);
      return [];
    }

    const manifest: PluginManifest = JSON.parse(readFileSync(filePath, 'utf-8'));
    const results: { id: string; name: string; status: string }[] = [];

    for (const entry of manifest.plugins) {
      if (this.loaded.has(entry.id)) {
        results.push({ id: entry.id, name: entry.name, status: 'already_loaded' });
        continue;
      }

      if (!isWorkerEnabled(entry)) {
        results.push({ id: entry.id, name: entry.name, status: 'gated' });
        continue;
      }

      try {
        const worker = await this.loadPlugin(entry);
        this.workers.set(entry.id, worker);
        this.loaded.add(entry.id);
        results.push({ id: entry.id, name: entry.name, status: 'started' });
        console.log(`[PluginLoader] Started: ${entry.name} (${entry.id})`);
      } catch (err) {
        console.error(`[PluginLoader] Failed to start ${entry.name}:`, err);
        results.push({ id: entry.id, name: entry.name, status: `error: ${err instanceof Error ? err.message : String(err)}` });
      }
    }

    return results;
  }

  async loadAll(): Promise<{ manifest: string; results: { id: string; name: string; status: string }[] }[]> {
    if (!existsSync(this.manifestsDir)) {
      console.warn(`[PluginLoader] Manifests directory not found: ${this.manifestsDir}`);
      return [];
    }

    const files = readdirSync(this.manifestsDir).filter((f) => f.endsWith('.json'));
    const allResults: { manifest: string; results: { id: string; name: string; status: string }[] }[] = [];

    for (const file of files) {
      const name = file.replace('.json', '');
      const results = await this.loadManifest(name);
      allResults.push({ manifest: name, results });
    }

    return allResults;
  }

  private async loadPlugin(entry: PluginEntry): Promise<{ close: () => Promise<void> }> {
    const modulePath = resolveModulePath(entry.module);
    const mod = await import(modulePath);
    const startFn = mod[entry.export];

    if (typeof startFn !== 'function') {
      throw new Error(
        `Plugin ${entry.id}: export '${entry.export}' not found in ${modulePath}`
      );
    }

    const instance = startFn(this.connection);

    if (typeof instance?.close === 'function') {
      return instance as { close: () => Promise<void> };
    }

    if (instance instanceof Worker) {
      return instance;
    }

    return { close: async () => { /* no-op */ } };
  }

  getLoadedPlugins(): Map<string, { close: () => Promise<void> }> {
    return new Map(this.workers);
  }

  async stopAll(): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(this.workers.entries()).map(async ([id, worker]) => {
        try {
          await worker.close();
          console.log(`[PluginLoader] Stopped: ${id}`);
        } catch (err) {
          console.error(`[PluginLoader] Error stopping ${id}:`, err);
        }
      })
    );
    this.workers.clear();
    this.loaded.clear();
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      console.warn(`[PluginLoader] ${failed} plugin(s) failed to stop cleanly`);
    }
  }

  get status(): { loaded: number; total: number; ids: string[] } {
    return {
      loaded: this.loaded.size,
      total: this.loaded.size,
      ids: Array.from(this.loaded),
    };
  }
}
