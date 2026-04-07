export type JobType = "cursor" | "n8n" | "notify" | "drive";

export interface OrchestratorJob {
  type: JobType;
  payload: Record<string, unknown>;
  tenant_slug?: string;
  initiated_by: "claude" | "discord" | "cron" | "system";
  plan?: "startup" | "business" | "enterprise";
}

export type Intent =
  | "execute_code"
  | "trigger_workflow"
  | "notify"
  | "sync_drive"
  | "full_pipeline";

export interface IntentRequest {
  intent: Intent;
  context: Record<string, unknown>;
  tenant_slug?: string;
  initiated_by: OrchestratorJob["initiated_by"];
}
