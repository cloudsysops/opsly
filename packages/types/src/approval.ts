import { z } from "zod";

export const approvalMetricsSchema = z.object({
  success_rate: z.number().min(0).max(100),
  avg_response_time_ms: z.number().positive(),
  critical_errors: z.number().int().min(0),
  test_coverage: z.array(z.string()),
});

export const qualityGatesSchema = z.object({
  min_success_rate: z.number().min(0).max(100).default(95),
  max_response_time_ms: z.number().positive().default(500),
  max_critical_errors: z.number().int().min(0).default(0),
});

export const approvalDecisionSchema = z.object({
  status: z.enum(["APPROVE", "REJECT", "NEEDS_INFO"]),
  confidence: z.number().int().min(0).max(100),
  reasoning: z.string().min(1),
  recommendations: z.array(z.string()).default([]),
});

export const approvalGateRequestSchema = z.object({
  sandbox_run_id: z.string().min(1),
  metrics: approvalMetricsSchema,
  quality_gates: qualityGatesSchema.optional(),
});

export const approvalGateResponseSchema = z.object({
  sandbox_run_id: z.string().min(1),
  result: approvalDecisionSchema,
  model_used: z.string().min(1),
  complexity: z.string().min(1),
  timestamp: z.string().min(1),
});

export const approvalGateJobDataSchema = z.object({
  sandbox_run_id: z.string().min(1),
  deployment_id: z.string().optional(),
  metrics: approvalMetricsSchema,
});

export type ApprovalMetrics = z.infer<typeof approvalMetricsSchema>;
export type QualityGates = z.infer<typeof qualityGatesSchema>;
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;
export type ApprovalGateRequest = z.infer<typeof approvalGateRequestSchema>;
export type ApprovalGateResponse = z.infer<typeof approvalGateResponseSchema>;
export type ApprovalGateJobData = z.infer<typeof approvalGateJobDataSchema>;

/** Solicitud de embedding (Vertex / futuros proveedores). */
export interface EmbeddingRequest {
  text: string;
  model?: string;
}

export interface EmbeddingResponse {
  values: number[];
  dimension: number;
}

/** Fila lógica para métricas embedidas (tabla platform.approval_gate_embeddings). */
export interface ApprovalEmbedding {
  sandbox_run_id: string;
  metrics_embedding: number[];
  metrics_text: string;
  model_used: string;
  created_at: string;
}
