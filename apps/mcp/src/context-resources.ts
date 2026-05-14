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
    relativePath: 'docs/02-tools/MCP-STATUS-ANALYSIS.md',
    mimeType: 'text/markdown',
  },
  {
    name: 'opsly-brain-dashboard',
    title: 'Opsly Brain Dashboard',
    description: 'Cockpit Obsidian: estado, enlaces de trabajo y mapa operativo.',
    uri: 'opsly://context/brain-dashboard',
    relativePath: 'docs/brain/dashboard.md',
    mimeType: 'text/markdown',
  },
  {
    name: 'opsly-brain-index',
    title: 'Opsly Brain Index',
    description: 'Entrada canonica del vault Obsidian docs/brain.',
    uri: 'opsly://context/brain',
    relativePath: 'docs/brain/README.md',
    mimeType: 'text/markdown',
  },
  {
    name: 'opsly-brain-modules',
    title: 'Opsly Brain Modules',
    description: 'Indice neuronal por modulos de producto y codigo.',
    uri: 'opsly://context/brain-modules',
    relativePath: 'docs/brain/modules/README.md',
    mimeType: 'text/markdown',
  },
  {
    name: 'opsly-brain-agents',
    title: 'Opsly Brain Agents',
    description: 'Mapa operativo para agentes internos, externos y locales.',
    uri: 'opsly://context/brain-agents',
    relativePath: 'docs/brain/agents/README.md',
    mimeType: 'text/markdown',
  },
  {
    name: 'opsly-brain-workflows',
    title: 'Opsly Brain Workflows',
    description: 'Workflows de automatizacion, marketplace, OpenClaw y CRM.',
    uri: 'opsly://context/brain-workflows',
    relativePath: 'docs/brain/workflows/README.md',
    mimeType: 'text/markdown',
  },
  {
    name: 'opsly-brain-architecture',
    title: 'Opsly Brain Architecture',
    description: 'Mapas de arquitectura, grafo de conocimiento y decisiones.',
    uri: 'opsly://context/brain-architecture',
    relativePath: 'docs/brain/architecture/README.md',
    mimeType: 'text/markdown',
  },
  {
    name: 'opsly-knowledge-index',
    title: 'knowledge-index.json',
    description: 'Indice Repo-First RAG regenerado desde la documentacion.',
    uri: 'opsly://context/knowledge-index',
    relativePath: 'config/knowledge-index.json',
    mimeType: 'application/json',
  },
];

function findRepoRoot(): string | null {
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

  return null;
}

const REPO_ROOT = findRepoRoot();

function repoPath(relativePath: string): string | null {
  return REPO_ROOT ? join(REPO_ROOT, relativePath) : null;
}

function readUtf8(relativePath: string): string | null {
  const path = repoPath(relativePath);
  return path && existsSync(path) ? readFileSync(path, 'utf8') : null;
}

export function getAvailableStaticContextResources(): StaticContextResource[] {
  if (!REPO_ROOT) return [];
  return STATIC_CONTEXT_RESOURCES.filter((resource) => {
    const path = repoPath(resource.relativePath);
    return path && existsSync(path);
  });
}

export function readStaticContextResource(uri: string): {
  resource: StaticContextResource;
  text: string;
} | null {
  const available = getAvailableStaticContextResources();
  const resource = available.find((entry) => entry.uri === uri);
  if (!resource) {
    return null;
  }

  const text = readUtf8(resource.relativePath);
  if (!text) {
    return null;
  }

  return {
    resource,
    text,
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
  if (!adrRoot || !existsSync(adrRoot)) {
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
} | null {
  const fileName = normalizeAdrFileName(slug);
  const resources = listAdrResources();
  const resource = resources.find((entry) => entry.relativePath.endsWith(`/${fileName}`));
  if (!resource) {
    return null;
  }

  const text = readUtf8(resource.relativePath);
  if (!text) {
    return null;
  }

  return {
    resource,
    text,
  };
}
