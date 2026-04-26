import { z } from 'zod';
import {
  getAvailableStaticContextResources,
  listAdrResources,
  readAdrResource,
  readStaticContextResource,
} from '../context-resources.js';
import type { ToolDefinition } from '../types/index.js';

type ReadContextInput = {
  uri: string;
};

type ReadAdrInput = {
  slug: string;
};

export const contextTools: [
  ToolDefinition<Record<string, never>, { resources: unknown[] }>,
  ToolDefinition<ReadContextInput, { resource: unknown; text: string }>,
  ToolDefinition<Record<string, never>, { adrs: unknown[] }>,
  ToolDefinition<ReadAdrInput, { adr: unknown; text: string }>,
] = [
  {
    name: 'list_context_resources',
    description:
      'Lista resources de contexto estático de Opsly (AGENTS, VISION, system_state, etc.)',
    inputSchema: z.object({}),
    handler: async () => {
      const resources = getAvailableStaticContextResources().map((entry) => ({
        uri: entry.uri,
        name: entry.name,
        title: entry.title,
        description: entry.description,
        mimeType: entry.mimeType,
      }));
      return { resources };
    },
  },
  {
    name: 'read_context_resource',
    description: 'Lee un resource de contexto estático por URI',
    inputSchema: z.object({
      uri: z.string().min(1).describe('URI (ej. opsly://context/agents)'),
    }),
    handler: async ({ uri }: ReadContextInput) => {
      const { resource, text } = readStaticContextResource(uri);
      return {
        resource: {
          uri: resource.uri,
          name: resource.name,
          title: resource.title,
          description: resource.description,
          mimeType: resource.mimeType,
        },
        text,
      };
    },
  },
  {
    name: 'list_adrs',
    description: 'Lista Architecture Decision Records disponibles en docs/adr',
    inputSchema: z.object({}),
    handler: async () => {
      const adrs = listAdrResources().map((entry) => ({
        uri: entry.uri,
        name: entry.name,
        title: entry.title,
        description: entry.description,
        mimeType: entry.mimeType,
      }));
      return { adrs };
    },
  },
  {
    name: 'read_adr',
    description: 'Lee un ADR por slug o nombre de archivo',
    inputSchema: z.object({
      slug: z.string().min(1).describe('Ej: ADR-024-ollama-local-worker-primary'),
    }),
    handler: async ({ slug }: ReadAdrInput) => {
      const { resource, text } = readAdrResource(slug);
      return {
        adr: {
          uri: resource.uri,
          name: resource.name,
          title: resource.title,
          description: resource.description,
          mimeType: resource.mimeType,
        },
        text,
      };
    },
  },
];
