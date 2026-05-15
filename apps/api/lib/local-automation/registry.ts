import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { LocalAutomationPolicy, LocalAutomationToolsConfig } from './types';

function repoRoot(): string {
  if (process.cwd().endsWith(path.join('apps', 'api'))) {
    return path.resolve(process.cwd(), '..', '..');
  }
  return process.cwd();
}

async function readJsonFile<T>(relativePath: string): Promise<T> {
  const filePath = path.join(repoRoot(), relativePath);
  const raw = await readFile(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

export async function loadLocalAutomationTools(): Promise<LocalAutomationToolsConfig> {
  return readJsonFile<LocalAutomationToolsConfig>('config/local-automation-tools.json');
}

export async function loadLocalAutomationPolicy(): Promise<LocalAutomationPolicy> {
  return readJsonFile<LocalAutomationPolicy>('config/local-automation-policy.json');
}

export function expandHome(value: string): string {
  if (value === '~') {
    return process.env.HOME ?? value;
  }
  if (value.startsWith('~/')) {
    return path.join(process.env.HOME ?? '', value.slice(2));
  }
  return value;
}
