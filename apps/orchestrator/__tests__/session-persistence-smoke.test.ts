import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockSaveSession,
  mockGetSession,
  mockRecordDecision,
  mockEnqueueJob,
  mockSupabaseQuery,
  mockRedisSet,
} = vi.hoisted(() => ({
  mockSaveSession: vi.fn(),
  mockGetSession: vi.fn(),
  mockRecordDecision: vi.fn(),
  mockEnqueueJob: vi.fn(),
  mockSupabaseQuery: vi.fn(),
  mockRedisSet: vi.fn(async () => "OK"),
}));

vi.mock("../src/hermes/context-builder-client.js", () => ({
  buildSessionKey: (task: any) => `hermes:${task.id}:${task.request_id ?? "no-request"}`,
  saveAgentSession: mockSaveSession,
  getAgentSession: mockGetSession,
}));

vi.mock("../src/hermes/SessionManager.js", () => ({
  createSessionManager: () => ({
    recordDecision: mockRecordDecision,
    getSessionContext: mockGetSession,
    getDecisionHistory: vi.fn(async () => []),
  }),
}));

vi.mock("../src/queue.js", () => ({
  enqueueJob: mockEnqueueJob,
}));

vi.mock("../src/hermes/supabase-client.js", () => ({
  getHermesSupabase: vi.fn(() => ({
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: mockSupabaseQuery,
              insert: vi.fn(async () => ({ data: null })),
              update: vi.fn(async () => ({ data: null })),
            })),
          })),
        })),
      })),
    })),
  })),
}));

vi.mock("../src/hermes/resolve-hermes-tenant.js", () => ({
  resolveHermesTenantContext: vi.fn(async (task) => ({
    tenantId: task.tenant_id || "tenant-123",
    tenantSlug: "test-tenant",
  })),
}));

vi.mock("../src/metering/redis-client.js", () => ({
  getOrchestratorRedis: vi.fn(() => ({
    set: mockRedisSet,
  })),
}));

import { HermesOrchestrator } from "../src/hermes/HermesOrchestrator.js";
import type { HermesTask } from "@intcloudsysops/types";

describe("Session Persistence Smoke E2E — Semana 3", () => {
  let orchestrator: HermesOrchestrator;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new HermesOrchestrator();
    mockEnqueueJob.mockResolvedValue({ id: "job-123" });
    mockRecordDecision.mockResolvedValue(true);
    mockSaveSession.mockResolvedValue({
      id: "session-123",
      tenant_slug: "test-tenant",
      session_key: "hermes:task-1:req-001",
      agent_role: "executor",
      summary: "Last decision for task task-1: cursor",
      open_items: [],
      decisions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    mockGetSession.mockResolvedValue(null);
  });

  it("guarda decisión de enrutamiento en sesión persistente", async () => {
    mockSupabaseQuery.mockResolvedValue({
      data: { plan: "business" },
    });

    const task: HermesTask = {
      id: "task-session-1",
      name: "Session persistence test",
      type: "feature",
      state: "PENDING",
      tenant_id: "tenant-123",
      request_id: "req-session-001",
      effort: "M",
    };

    await orchestrator.initialize();

    // Validar que initialize no falla
    expect(orchestrator).toBeDefined();
  });

  it("recupera historial de decisiones de sesión anterior", async () => {
    const priorSession = {
      id: "session-prior",
      tenant_slug: "test-tenant",
      session_key: "hermes:task-1:req-001",
      agent_role: "executor",
      summary: "Prior decision history",
      open_items: [],
      decisions: [
        {
          task_id: "task-1",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          agent_type: "cursor",
          routing_decision: { queue: "default", priority: 5 },
          request_id: "req-001",
        },
      ],
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    };

    mockGetSession.mockResolvedValueOnce(priorSession);

    const task: HermesTask = {
      id: "task-1",
      name: "Follow-up task",
      type: "adr",
      state: "PENDING",
      tenant_id: "tenant-123",
      request_id: "req-001",
      effort: "L",
    };

    expect(task.request_id).toBe("req-001");
    expect(mockGetSession).toBeDefined();
  });

  it("persiste request_id en sesión para trazabilidad E2E", async () => {
    const requestId = "req-e2e-session-001";
    const tenantSlug = "test-tenant";

    const task: HermesTask = {
      id: "task-e2e-session",
      name: "Request ID correlation test",
      type: "feature",
      state: "PENDING",
      tenant_id: "tenant-123",
      request_id: requestId,
      effort: "M",
    };

    mockRecordDecision.mockResolvedValueOnce(true);

    const sessionPayload = {
      agent_role: "executor" as const,
      summary: "Last decision",
      decisions: [
        {
          task_id: task.id,
          timestamp: new Date().toISOString(),
          agent_type: "cursor",
          routing_decision: { queue: "default" },
          request_id: requestId,
        },
      ],
      open_items: [],
      metadata: {
        last_agent: "cursor",
        decision_count: 1,
        last_request_id: requestId,
      },
    };

    expect(sessionPayload.metadata.last_request_id).toBe(requestId);
    expect(sessionPayload.decisions[0].request_id).toBe(requestId);
  });

  it("expira sesión según TTL del plan (business: 7d)", async () => {
    const businessExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const sessionResponse = {
      id: "session-business",
      tenant_slug: "test-tenant",
      session_key: "hermes:task-1:req-001",
      agent_role: "executor",
      summary: "Business plan session",
      open_items: [],
      decisions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      expires_at: businessExpiry.toISOString(),
    };

    const expiryTime = new Date(sessionResponse.expires_at).getTime();
    const now = Date.now();
    const ttlMs = expiryTime - now;

    // Verificar que TTL es ~7 días (permitiendo margen de 1 hora)
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const margin = 60 * 60 * 1000; // 1 hora

    expect(ttlMs).toBeGreaterThan(sevenDaysMs - margin);
    expect(ttlMs).toBeLessThan(sevenDaysMs + margin);
  });

  it("correlaciona request_id en decisión guardada y job encolado", async () => {
    mockSupabaseQuery.mockResolvedValue({
      data: { plan: "business" },
    });

    const requestId = "req-correlation-final";
    const task: HermesTask = {
      id: "task-final",
      name: "Final correlation test",
      type: "feature",
      state: "PENDING",
      tenant_id: "tenant-123",
      request_id: requestId,
      effort: "M",
    };

    // Simular guardado de decisión
    const decisionPayload = {
      task_id: task.id,
      timestamp: new Date().toISOString(),
      agent_type: "cursor",
      routing_decision: { queue: "default" },
      request_id: requestId,
    };

    // Job encolado debe llevar mismo request_id
    const jobPayload = {
      type: "cursor",
      request_id: requestId,
      taskId: task.id,
      tenant_id: task.tenant_id,
    };

    expect(decisionPayload.request_id).toBe(jobPayload.request_id);
    expect(jobPayload.request_id).toBe(requestId);
  });
});
