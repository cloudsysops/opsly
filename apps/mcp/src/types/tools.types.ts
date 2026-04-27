export interface ToolContext {
  tenantId: string;
  workspaceRoot: string;
  mode: string;
}

export interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
