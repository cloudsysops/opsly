import { z } from 'zod';

import type { ToolDefinition } from '../../types/index.js';
import { ObsidianTools } from './mcp-tool.js';

type ObsidianHandler = (input: Record<string, unknown>) => Promise<unknown>;

function wrapTool(
  name: string,
  description: string,
  schema: z.ZodType<Record<string, unknown>>,
  handler: ObsidianHandler,
): ToolDefinition<Record<string, unknown>, unknown> {
  return {
    name,
    description,
    inputSchema: schema,
    handler: async (input) => handler(input),
  };
}

const searchSchema = z.object({
  query: z.string().min(1),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(20).optional(),
});

const getSchema = z.object({
  path: z.string().min(1),
});

const graphSchema = z.object({
  query: z.string().min(1),
  depth: z.union([z.literal(1), z.literal(2)]).optional(),
});

const semanticSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(20).optional(),
});

const researchSchema = z.object({
  question: z.string().min(1),
  maxIterations: z.number().int().min(1).max(10).optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
});

const recallSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(20).optional(),
});

const architectureSchema = z.object({
  query: z.string().min(1),
  depth: z.union([z.literal(1), z.literal(2)]).optional(),
});

function callObsidian<K extends keyof typeof ObsidianTools>(
  key: K,
  input: Record<string, unknown>,
): Promise<unknown> {
  const tool = ObsidianTools[key];
  return tool.handler(input as never) as Promise<unknown>;
}

export const brainRecallTool = wrapTool(
  'brain:recall',
  'Recall vault knowledge via fulltext + semantic search (docs/brain).',
  recallSchema,
  async (input) => {
    const query = input.query as string;
    const limit = (input.limit as number | undefined) ?? 10;
    const [fulltext, semantic] = await Promise.all([
      callObsidian('brain:search', { query, limit }),
      callObsidian('brain:semantic-search', { query, limit }),
    ]);
    return { query, fulltext, semantic };
  },
);

export const brainArchitectureContextTool = wrapTool(
  'brain:architecture-context',
  'Architecture-oriented context: knowledge graph + top matching notes.',
  architectureSchema,
  async (input) => {
    const query = input.query as string;
    const depth = (input.depth as 1 | 2 | undefined) ?? 2;
    const [graph, search] = await Promise.all([
      callObsidian('brain:graph', { query, depth }),
      callObsidian('brain:search', { query, limit: 8 }),
    ]);
    return { query, graph, search };
  },
);

export const brainTools: ToolDefinition<Record<string, unknown>, unknown>[] = [
  wrapTool(
    'brain:search',
    ObsidianTools['brain:search'].description,
    searchSchema,
    (input) => callObsidian('brain:search', input),
  ),
  wrapTool(
    'brain:get',
    ObsidianTools['brain:get'].description,
    getSchema,
    (input) => callObsidian('brain:get', input),
  ),
  wrapTool(
    'brain:list-tags',
    ObsidianTools['brain:list-tags'].description,
    z.object({}),
    () => callObsidian('brain:list-tags', {}),
  ),
  wrapTool(
    'brain:graph',
    ObsidianTools['brain:graph'].description,
    graphSchema,
    (input) => callObsidian('brain:graph', input),
  ),
  wrapTool(
    'brain:semantic-search',
    ObsidianTools['brain:semantic-search'].description,
    semanticSchema,
    (input) => callObsidian('brain:semantic-search', input),
  ),
  wrapTool(
    'brain:research',
    ObsidianTools['brain:research'].description,
    researchSchema,
    (input) => callObsidian('brain:research', input),
  ),
  brainRecallTool,
  brainArchitectureContextTool,
];
