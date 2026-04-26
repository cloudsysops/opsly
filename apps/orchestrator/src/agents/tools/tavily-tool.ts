import { tavily } from '@tavily/core';

import type { ToolManifest } from './types.js';

export class TavilyTool implements ToolManifest {
  readonly name = 'tavily_search';
  readonly description =
    'Búsqueda web/documentación en tiempo real para preguntas recientes o externas.';
  readonly capabilities = ['web_search', 'documentation_lookup', 'real_time_data'];
  readonly riskLevel = 'medium' as const;

  async execute(input: unknown): Promise<unknown> {
    const payload =
      typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
    const apiKey = process.env.TAVILY_API_KEY?.trim();
    if (!apiKey) {
      return {
        ok: false,
        disabled: true,
        reason: 'missing TAVILY_API_KEY',
      };
    }
    const queryRaw = payload.query;
    if (typeof queryRaw !== 'string' || queryRaw.trim().length === 0) {
      return {
        ok: false,
        error: 'missing query',
      };
    }

    try {
      const client = tavily({ apiKey });
      const response = await client.search(queryRaw, {
        maxResults: 5,
      });
      return {
        ok: true,
        query: queryRaw,
        response,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
