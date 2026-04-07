export interface ToolDefinition<TInput, TOutput> {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (input: TInput) => Promise<TOutput>;
}

export interface TenantSummary {
  slug: string;
  status: string;
  owner_email?: string;
}
