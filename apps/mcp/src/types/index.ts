import type { ToolContext } from './tools.types.js';

export interface ToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (input: TInput, context?: ToolContext) => Promise<TOutput>;
}

export interface TenantSummary {
  slug: string;
  status: string;
  owner_email?: string;
}

export type { ToolContext, ToolResponse } from './tools.types.js';
