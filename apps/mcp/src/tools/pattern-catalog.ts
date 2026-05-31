/**
 * MCP tools — Opsly pattern catalog (harness / tenant / opsly scaffolds).
 */

import { z } from 'zod';
import {
  applyHarnessPattern,
  enrichTenantProfile,
  getPattern,
  listPatterns,
  validatePatternIndex,
} from '@intcloudsysops/pattern-catalog';
import type { ToolDefinition } from '../types/index.js';

const listPatternsSchema = z.object({
  kind: z.enum(['harness', 'tenant', 'opsly']).optional(),
});

const getPatternSchema = z.object({
  pattern_id: z.string().min(1),
});

const enrichTenantSchema = z.object({
  tenant_slug: z.string().min(1),
  pattern_ids: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  modules: z.array(z.string()).optional(),
});

export const patternsListTool: ToolDefinition<
  z.infer<typeof listPatternsSchema>,
  { patterns: Array<{ id: string; kind: string; title: string; description: string }> }
> = {
  name: 'patterns:list',
  description:
    'List Opsly pattern catalog entries from config/patterns (harness decision templates, tenant bundles, opsly scaffolds).',
  inputSchema: listPatternsSchema,
  handler: async (input) => {
    const patterns = listPatterns(input.kind);
    return {
      patterns: patterns.map((p) => ({
        id: p.id,
        kind: p.kind,
        title: p.title,
        description: p.description,
      })),
    };
  },
};

export const patternsGetTool: ToolDefinition<
  z.infer<typeof getPatternSchema>,
  { success: boolean; pattern?: unknown; applied_preview?: unknown; error?: string }
> = {
  name: 'patterns:get',
  description: 'Fetch a single pattern by id from config/patterns.',
  inputSchema: getPatternSchema,
  handler: async (input) => {
    const pattern = getPattern(input.pattern_id);
    if (!pattern) {
      return { success: false, error: `Pattern not found: ${input.pattern_id}` };
    }
    const applied_preview =
      pattern.kind === 'harness'
        ? applyHarnessPattern({
            patternId: pattern.id,
            topic: 'preview',
            summary: 'pattern lookup',
          })
        : undefined;
    return { success: true, pattern, applied_preview };
  },
};

export const patternsValidateTool: ToolDefinition<
  Record<string, never>,
  { ok: boolean; errors: string[] }
> = {
  name: 'patterns:validate',
  description: 'Validate config/patterns/index.json and referenced pattern JSON files.',
  inputSchema: z.object({}),
  handler: async () => {
    const errors = validatePatternIndex();
    return { ok: errors.length === 0, errors };
  },
};

export const patternsEnrichTenantTool: ToolDefinition<
  z.infer<typeof enrichTenantSchema>,
  { success: boolean; profile?: unknown; error?: string }
> = {
  name: 'patterns:enrich_tenant',
  description:
    'Merge tenant pattern_ids with catalog capabilities/modules/harness_patterns (dry planning — no file writes).',
  inputSchema: enrichTenantSchema,
  handler: async (input) => {
    const profile = enrichTenantProfile({
      tenant_slug: input.tenant_slug,
      pattern_ids: input.pattern_ids,
      capabilities: input.capabilities,
      modules: input.modules,
    });
    return { success: true, profile };
  },
};

export const patternCatalogTools = [
  patternsListTool,
  patternsGetTool,
  patternsValidateTool,
  patternsEnrichTenantTool,
];
