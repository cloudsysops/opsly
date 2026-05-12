/**
 * E2E Test Suite for Hermes Platform
 * Critical workflows: Invite → Onboarding → Agent execution → Cost tracking
 */

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:3001";

test.describe("Hermes E2E: Critical Workflows", () => {
  // ════════════════════════════════════════════════════════════════════
  // TEST 1: Tenant Invitation Workflow
  // ════════════════════════════════════════════════════════════════════

  test("1. Create and accept tenant invitation", async ({ page }) => {
    // Step 1: Create invitation via API
    const inviteResponse = await page.context().fetch(`${API_URL}/api/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        tenant_name: "e2e-test-tenant",
        tenant_email: "test@example.com",
      }),
    });

    expect(inviteResponse.status()).toBe(201);
    const { token } = await inviteResponse.json();
    expect(token).toBeTruthy();

    // Step 2: Navigate to invitation link
    await page.goto(`${BASE_URL}/invite/${token}`);

    // Step 3: Accept invitation
    await page.click("button:has-text('Accept')");
    await expect(page).toHaveURL(/dashboard/);

    // Verify tenant is created
    const tenantData = await page.context().fetch(`${API_URL}/api/tenants/e2e-test-tenant`);
    expect(tenantData.status()).toBe(200);
    const { status } = await tenantData.json();
    expect(status).toBe("active");
  });

  // ════════════════════════════════════════════════════════════════════
  // TEST 2: Agent Task Execution
  // ════════════════════════════════════════════════════════════════════

  test("2. Queue and execute agent task", async ({ page }) => {
    // Queue a developer task
    const taskResponse = await page.context().fetch(`${API_URL}/api/tasks/queue`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        agent_type: "developer",
        task_description: "Create a simple hello world function",
        tenant_id: "e2e-test-tenant",
      }),
    });

    expect(taskResponse.status()).toBe(201);
    const { task_id } = await taskResponse.json();

    // Wait for task to complete (max 30 seconds)
    let taskStatus = "pending";
    let attempts = 0;
    while (taskStatus !== "completed" && attempts < 30) {
      await page.waitForTimeout(1000);

      const statusResponse = await page.context().fetch(
        `${API_URL}/api/tasks/${task_id}`
      );

      const data = await statusResponse.json();
      taskStatus = data.status;
      attempts++;
    }

    expect(taskStatus).toBe("completed");
  });

  // ════════════════════════════════════════════════════════════════════
  // TEST 3: Rendering Job Workflow
  // ════════════════════════════════════════════════════════════════════

  test("3. Execute rendering job (music generation)", async ({ page }) => {
    const renderResponse = await page.context().fetch(`${API_URL}/api/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        type: "music",
        prompt: "Upbeat electronic dance music",
        duration_seconds: 10,
        tenant_id: "e2e-test-tenant",
      }),
    });

    expect(renderResponse.status()).toBe(201);
    const { job_id } = await renderResponse.json();

    // Wait for rendering
    let jobStatus = "processing";
    let attempts = 0;
    while (jobStatus !== "completed" && attempts < 60) {
      await page.waitForTimeout(1000);

      const statusResponse = await page.context().fetch(
        `${API_URL}/api/render/${job_id}`
      );

      const data = await statusResponse.json();
      jobStatus = data.status;
      attempts++;
    }

    expect(jobStatus).toBe("completed");
  });

  // ════════════════════════════════════════════════════════════════════
  // TEST 4: Billing & Cost Tracking
  // ════════════════════════════════════════════════════════════════════

  test("4. Verify cost tracking and billing", async ({ page }) => {
    // Fetch cost data for tenant
    const costsResponse = await page.context().fetch(
      `${API_URL}/api/billing/tenant/e2e-test-tenant/costs?from=2026-05-01&to=2026-05-31`
    );

    expect(costsResponse.status()).toBe(200);
    const costData = await costsResponse.json();

    expect(costData.total_cost).toBeGreaterThan(0);
    expect(costData.breakdown_by_agent).toBeDefined();
    expect(costData.api_calls).toBeGreaterThan(0);
  });

  // ════════════════════════════════════════════════════════════════════
  // TEST 5: Multi-Model LLM Routing
  // ════════════════════════════════════════════════════════════════════

  test("5. Test multi-model LLM routing strategies", async ({ page }) => {
    const messages = [
      {
        role: "user" as const,
        content: "Write a hello world program in Python",
      },
    ];

    // Test cost strategy
    const costResponse = await page.context().fetch(`${API_URL}/api/v1/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        messages,
        strategy: "cost",
      }),
    });

    expect(costResponse.status()).toBe(200);
    const costResult = await costResponse.json();
    expect(costResult.selected_model).toBeTruthy();

    // Test quality strategy
    const qualityResponse = await page.context().fetch(`${API_URL}/api/v1/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        messages,
        strategy: "quality",
      }),
    });

    expect(qualityResponse.status()).toBe(200);
    const qualityResult = await qualityResponse.json();
    expect(qualityResult.selected_model).toBeTruthy();
  });

  // ════════════════════════════════════════════════════════════════════
  // TEST 6: Monitoring & Observability
  // ════════════════════════════════════════════════════════════════════

  test("6. Verify monitoring dashboard", async ({ page }) => {
    // Navigate to Grafana dashboard
    await page.goto(`${BASE_URL}:3000`);

    // Login
    await page.fill('input[name="username"]', "admin");
    await page.fill('input[name="password"]', "hermes2026");
    await page.click("button:has-text('Login')");

    // Wait for dashboard
    await page.waitForNavigation();

    // Verify System Overview dashboard exists
    await page.goto(`${BASE_URL}:3000/d/hermes-system-overview`);
    const header = await page.locator("h1:has-text('System Overview')");
    await expect(header).toBeVisible();

    // Verify metrics are loading
    const metricPanels = await page.locator("[data-testid='metric-panel']");
    await expect(metricPanels).not.toHaveCount(0);
  });

  // ════════════════════════════════════════════════════════════════════
  // TEST 7: Slack Bot Integration
  // ════════════════════════════════════════════════════════════════════

  test("7. Test Slack bot commands", async ({ page }) => {
    // Simulate Slack bot command
    const statusResponse = await page.context().fetch(
      `${API_URL}:3010/api/hermes-status`
    );

    expect(statusResponse.status()).toBe(200);
    const status = await statusResponse.json();
    expect(status.services).toBeDefined();
  });

  // ════════════════════════════════════════════════════════════════════
  // TEST 8: Full Workflow Integration (Critical)
  // ════════════════════════════════════════════════════════════════════

  test("8. Complete end-to-end workflow", async ({ page }) => {
    // 1. Invite new tenant
    const inviteResponse = await page.context().fetch(`${API_URL}/api/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify({
        tenant_name: "e2e-workflow-test",
        tenant_email: "workflow@example.com",
      }),
    });

    const { token } = await inviteResponse.json();

    // 2. Accept invitation
    await page.goto(`${BASE_URL}/invite/${token}`);
    await page.click("button:has-text('Accept')");

    // 3. Queue 4 parallel agent tasks
    const agentTypes = ["developer", "architect", "qa", "security"];
    const taskIds = [];

    for (const agent of agentTypes) {
      const taskResponse = await page.context().fetch(`${API_URL}/api/tasks/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        data: JSON.stringify({
          agent_type: agent,
          task_description: `E2E test task for ${agent} agent`,
          tenant_id: "e2e-workflow-test",
        }),
      });

      const { task_id } = await taskResponse.json();
      taskIds.push(task_id);
    }

    // 4. Wait for all tasks
    const allCompleted = await Promise.all(
      taskIds.map(async (taskId) => {
        let status = "pending";
        for (let i = 0; i < 60; i++) {
          const resp = await page.context().fetch(
            `${API_URL}/api/tasks/${taskId}`
          );
          const data = await resp.json();
          status = data.status;
          if (status === "completed") break;
          await page.waitForTimeout(1000);
        }
        return status === "completed";
      })
    );

    expect(allCompleted.every((c) => c === true)).toBe(true);

    // 5. Verify costs were recorded
    const costsResponse = await page.context().fetch(
      `${API_URL}/api/billing/tenant/e2e-workflow-test/costs`
    );

    const costData = await costsResponse.json();
    expect(costData.total_cost).toBeGreaterThan(0);
    expect(costData.breakdown_by_agent.length).toBeGreaterThan(0);

    console.log("✅ Complete E2E workflow succeeded");
  });
});

// ════════════════════════════════════════════════════════════════════
// PERFORMANCE TESTS
// ════════════════════════════════════════════════════════════════════

test.describe("Performance & Load Testing", () => {
  test("Concurrent agent task execution (load test)", async ({ page }) => {
    const startTime = Date.now();
    const concurrent = 10;

    // Queue 10 tasks in parallel
    const promises = [];
    for (let i = 0; i < concurrent; i++) {
      promises.push(
        page.context().fetch(`${API_URL}/api/tasks/queue`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          data: JSON.stringify({
            agent_type: "developer",
            task_description: `Load test task ${i}`,
            tenant_id: "e2e-test-tenant",
          }),
        })
      );
    }

    const responses = await Promise.all(promises);
    const duration = Date.now() - startTime;

    expect(responses.every((r) => r.status() === 201)).toBe(true);
    console.log(`✅ Queued ${concurrent} tasks in ${duration}ms`);
    expect(duration).toBeLessThan(5000); // Should complete in <5s
  });
});
