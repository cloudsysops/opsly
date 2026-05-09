import { getPromptRegistry } from './registry.js';
import type { Prompt, PromptVersion } from './registry.js';

export interface LoadOptions {
  version?: string;
  tag?: string;
  fallback?: boolean;
}

export async function loadPrompt(id: string, options: LoadOptions = {}): Promise<string> {
  const registry = getPromptRegistry();
  const prompt = registry.getPrompt(id);

  if (!prompt) {
    if (options.fallback) {
      console.warn(`Prompt ${id} not found, returning empty string`);
      return '';
    }
    throw new Error(`Prompt ${id} not found in registry`);
  }

  if (options.version) {
    const version = registry.getPromptVersion(id, options.version);
    if (!version) {
      throw new Error(`Prompt ${id} version ${options.version} not found`);
    }
    return version.content;
  }

  // Return current version
  return prompt.versions[prompt.versions.length - 1]?.content || '';
}

export async function loadPromptByVersion(
  id: string,
  version: string
): Promise<PromptVersion | null> {
  const registry = getPromptRegistry();
  return registry.getPromptVersion(id, version) || null;
}

export function listPrompts(): Prompt[] {
  const registry = getPromptRegistry();
  return registry.listPrompts();
}

export function listPromptIds(tag?: string): string[] {
  const registry = getPromptRegistry();
  let ids = registry.listPromptIds();

  if (tag) {
    ids = ids.filter((id: string) => {
      const prompt = registry.getPrompt(id);
      return prompt?.metadata.tags.includes(tag);
    });
  }

  return ids;
}
