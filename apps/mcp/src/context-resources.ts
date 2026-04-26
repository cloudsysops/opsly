import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';

export type StaticContextResource = {
  name: string;
  title: string;
  description: string;
  uri: string;
  relativePath: string;
  mimeType: string;
};

export type AdrResource = {
  name: string;
  title: string;
  description: string;
  uri: string;
  relativePath: string;
  mimeType: string;
};

const ADR_DIR = 'docs/adr';

const STATIC_CONTEXT_RESOURCES: StaticContextResource[] = [
  {
    name: 'opsly-agents-context',
    title: 'AGENTS.md',
    description: 'Estado operativo y reglas globales para agentes.',
    uri: 'opsly://context/agents',
    relativePath: 'AGENTS.md',
    mimeType: 'text/markdown',
  },
  {
    name: 'opsly-vision',
    title: 'VISION.md',
    description: 'Norte de producto, fases y principios de arquitectura.',
    uri: 'opsly://context/vision',
    relativePath: 'VISION.md',
    mimeType: 'text/markdown',
  },
  {
    name: 'opsly-system-state',
    title: 'system_state.json',
    description: 'Estado operativo actual, servicios, knowledge system y siguientes pasos.',
    uri: 'opsly://context/system-state',
    relativePath: 'context/system_state.json',
    mimeType: 'application/json',
  },
  {
    name: 'opsly-drive-config',
    title: '.opsly-drive-config.json',
    description: 'Configuración de sync a Google Drive para la base de conocimiento compartida.',
    uri: 'opsly://context/drive-config',
    relativePath: '.opsly-drive-config.json',
    mimeType: 'application/json',
  },
  {
    name: 'opsly-mcp-status',
    title: 'MCP-STATUS-ANALYSIS.md',
    description: 'Backlog y estado técnico del servidor MCP.',
    uri: 'opsly://context/mcp-status',
    relativePath: 'docs/MCP-STATUS-ANALYSIS.md',
    mimeType: 'text/markdown',
  },
];

function findRepoRoot(): string {
  let current = __dirname;

  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(current, 'AGENTS.md')) && existsSync(join(current, 'VISION.md'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  if (existsSync(join(process.cwd(), 'AGENTS.md'))) {
    return process.cwd();
  }

  throw new Error('Could not locate Opsly repository root from apps/mcp');
}

const REPO_ROOT = findRepoRoot();

function repoPath(relativePath: string): string {
  return join(REPO_ROOT, relativePath);
}

function readUtf8(relativePath: string): string {
  return readFileSync(repoPath(relativePath), 'utf8');
}

export function getAvailableStaticContextResources(): StaticContextResource[] {
  return STATIC_CONTEXT_RESOURCES.filter((resource) => existsSync(repoPath(resource.relativePath)));
}

export function readStaticContextResource(uri: string): {
  resource: StaticContextResource;
  text: string;
} {
  const resource = getAvailableStaticContextResources().find((entry) => entry.uri === uri);
  if (!resource) {
    throw new Error(`Unknown static context resource: ${uri}`);
  }

  return {
    resource,
    text: readUtf8(resource.relativePath),
  };
}

function isSafeAdrSlug(value: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value);
}

function normalizeAdrFileName(slug: string): string {
  const trimmed = slug.trim();
  if (!isSafeAdrSlug(trimmed)) {
    throw new Error('Invalid ADR slug');
  }
  return trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`;
}

export function listAdrResources(): AdrResource[] {
  const adrRoot = repoPath(ADR_DIR);
  if (!existsSync(adrRoot)) {
    return [];
  }

  return readdirSync(adrRoot)
    .filter((fileName) => extname(fileName) === '.md')
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => ({
      name: `adr-${fileName.replace(/\.md$/u, '')}`,
      title: fileName,
      description: 'Architecture Decision Record',
      uri: `opsly://adr/${fileName}`,
      relativePath: `${ADR_DIR}/${fileName}`,
      mimeType: 'text/markdown',
    }));
}

export function readAdrResource(slug: string): {
  resource: AdrResource;
  text: string;
} {
  const fileName = normalizeAdrFileName(slug);
  const resource = listAdrResources().find((entry) => entry.relativePath.endsWith(`/${fileName}`));
  if (!resource) {
    throw new Error(`ADR not found: ${slug}`);
  }

  return {
    resource,
    text: readUtf8(resource.relativePath),
  };
}
