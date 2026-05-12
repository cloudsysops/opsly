import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface PromptMetadata {
  name: string;
  version: string;
  description: string;
  tags: string[];
  author: string;
  created: string;
  updated: string;
}

export interface PromptVersion {
  version: string;
  content: string;
  metadata: PromptMetadata;
  hash: string;
}

export interface Prompt {
  id: string;
  name: string;
  currentVersion: string;
  versions: PromptVersion[];
  metadata: PromptMetadata;
}

class PromptRegistry {
  private prompts: Map<string, Prompt> = new Map();
  private basePaths: string[] = [];

  constructor(basePaths: string[] = []) {
    this.basePaths = basePaths;
  }

  initialize(): void {
    for (const basePath of this.basePaths) {
      this.loadFromDirectory(basePath);
    }
  }

  private loadFromDirectory(dirPath: string): void {
    try {
      const files = readdirSync(dirPath).filter((f) => f.endsWith('.md'));

      for (const file of files) {
        const filePath = join(dirPath, file);
        const content = readFileSync(filePath, 'utf-8');
        const id = file.replace('.md', '');

        // Parse YAML frontmatter if exists
        const metadata = this.parseMetadata(content, id);
        const version: PromptVersion = {
          version: metadata.version,
          content,
          metadata,
          hash: this.hashContent(content),
        };

        if (this.prompts.has(id)) {
          const existing = this.prompts.get(id)!;
          existing.versions.push(version);
        } else {
          this.prompts.set(id, {
            id,
            name: metadata.name,
            currentVersion: metadata.version,
            versions: [version],
            metadata,
          });
        }
      }
    } catch (e) {
      console.warn(`Failed to load prompts from ${dirPath}:`, e);
    }
  }

  private parseMetadata(content: string, defaultName: string): PromptMetadata {
    // Simple YAML frontmatter parser
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    const fm = fmMatch ? fmMatch[1] : '';

    return {
      name: defaultName,
      version: '1.0.0',
      description: '',
      tags: [],
      author: 'unknown',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      ...this.parseFrontmatter(fm),
    };
  }

  private parseFrontmatter(yaml: string): Partial<PromptMetadata> {
    const result: any = {};
    for (const line of yaml.split('\n')) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length) {
        result[key.trim()] = valueParts.join(':').trim();
      }
    }
    return result;
  }

  private hashContent(content: string): string {
    // Simple hash - in production use crypto.createHash
    return content.length.toString(36);
  }

  getPrompt(id: string): Prompt | undefined {
    return this.prompts.get(id);
  }

  getPromptVersion(id: string, version: string): PromptVersion | undefined {
    const prompt = this.prompts.get(id);
    return prompt?.versions.find((v) => v.version === version);
  }

  listPrompts(): Prompt[] {
    return Array.from(this.prompts.values());
  }

  listPromptIds(): string[] {
    return Array.from(this.prompts.keys());
  }
}

let globalRegistry: PromptRegistry | null = null;

export function initRegistry(basePaths: string[]): PromptRegistry {
  globalRegistry = new PromptRegistry(basePaths);
  globalRegistry.initialize();
  return globalRegistry;
}

export function getPromptRegistry(): PromptRegistry {
  if (!globalRegistry) {
    globalRegistry = new PromptRegistry();
    globalRegistry.initialize();
  }
  return globalRegistry;
}
