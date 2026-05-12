import Fastify, { FastifyInstance } from "fastify";
import { db } from "@intcloudsysops/supabase";
import * as dotenv from "dotenv";
import PDFDocument from "pdfkit";
import axios from "axios";

dotenv.config({ path: ".env.mcp" });

const fastify = Fastify({ logger: true });

interface CostBreakdown {
  agent: string;
  hours: number;
  cost: number;
}

interface TenantCost {
  tenant_id: string;
  tenant_name: string;
  period_start: string;
  period_end: string;
  total_cost: number;
  breakdown_by_agent: CostBreakdown[];
  breakdown_by_service: { [key: string]: number };
  api_calls: number;
  rendering_jobs: number;
  estimated_monthly: number;
}

// ════════════════════════════════════════════════════════════════════
// ENDPOINT: GET /api/billing/tenant/:tenant_id/costs
// ════════════════════════════════════════════════════════════════════

fastify.get<{ Params: { tenant_id: string } }>(
  "/api/billing/tenant/:tenant_id/costs",
  async (request, reply) => {
    const { tenant_id } = request.params;
    const { from, to } = request.query as Record<string, string>;

    try {
      const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = to ? new Date(to) : new Date();

      // Get audit logs for this tenant
      const { data: auditLogs } = await db
        .from("audit_logs")
        .select("*")
        .eq("tenant_id", tenant_id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      // Calculate costs
      const costByAgent: { [key: string]: CostBreakdown } = {};
      const costByService: { [key: string]: number } = {};
      let totalCost = 0;
      let apiCalls = 0;
      let renderingJobs = 0;

      auditLogs?.forEach((log) => {
        const cost = log.cost_estimate || 0;
        totalCost += cost;

        // By agent
        if (log.agent_type) {
          if (!costByAgent[log.agent_type]) {
            costByAgent[log.agent_type] = {
              agent: log.agent_type,
              hours: 0,
              cost: 0,
            };
          }
          costByAgent[log.agent_type].cost += cost;
        }

        // By service
        const service = log.tool_name || "api";
        costByService[service] = (costByService[service] || 0) + cost;

        // Count API calls and rendering jobs
        if (service === "api") apiCalls++;
        if (service === "rendering") renderingJobs++;
      });

      // Estimate monthly cost
      const daysUsed = Math.max(
        1,
        (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
      );
      const estimatedMonthly = (totalCost / daysUsed) * 30;

      const costData: TenantCost = {
        tenant_id,
        tenant_name: `tenant-${tenant_id.substring(0, 8)}`,
        period_start: startDate.toISOString(),
        period_end: endDate.toISOString(),
        total_cost: Math.round(totalCost * 100) / 100,
        breakdown_by_agent: Object.values(costByAgent),
        breakdown_by_service: costByService,
        api_calls: apiCalls,
        rendering_jobs: renderingJobs,
        estimated_monthly: Math.round(estimatedMonthly * 100) / 100,
      };

      return reply.send(costData);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to calculate costs" });
    }
  }
);

// ════════════════════════════════════════════════════════════════════
// ENDPOINT: GET /api/billing/invoices/:tenant_id
// ════════════════════════════════════════════════════════════════════

fastify.get<{ Params: { tenant_id: string } }>(
  "/api/billing/invoices/:tenant_id",
  async (request, reply) => {
    const { tenant_id } = request.params;

    try {
      const { data: invoices } = await db
        .from("invoices")
        .select("*")
        .eq("tenant_id", tenant_id)
        .order("created_at", { ascending: false });

      return reply.send(invoices || []);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to fetch invoices" });
    }
  }
);

// ════════════════════════════════════════════════════════════════════
// ENDPOINT: POST /api/billing/invoices/:tenant_id/generate
// ════════════════════════════════════════════════════════════════════

fastify.post<{ Params: { tenant_id: string } }>(
  "/api/billing/invoices/:tenant_id/generate",
  async (request, reply) => {
    const { tenant_id } = request.params;
    const { period_start, period_end } = request.body as Record<string, string>;

    try {
      // Get cost data
      const costResponse = await axios.get(
        `http://localhost:3007/api/billing/tenant/${tenant_id}/costs`,
        { params: { from: period_start, to: period_end } }
      );

      const costData = costResponse.data;

      // Create PDF invoice
      const doc = new PDFDocument();
      const filename = `invoice_${tenant_id}_${Date.now()}.pdf`;

      doc.fontSize(25).text("Invoice", 100, 100);
      doc.fontSize(12).text(`Tenant ID: ${tenant_id}`, 100, 150);
      doc.text(`Period: ${period_start} to ${period_end}`, 100, 170);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 100, 190);

      doc.fontSize(14).text("Cost Breakdown", 100, 250);
      let y = 280;

      // By agent
      doc.fontSize(11).text("By Agent:", 100, y);
      y += 20;
      costData.breakdown_by_agent.forEach((item: CostBreakdown) => {
        doc.text(`  ${item.agent}: $${item.cost.toFixed(2)}`, 120, y);
        y += 20;
      });

      // Total
      doc.fontSize(12).text(`Total: $${costData.total_cost.toFixed(2)}`, 100, y + 20);

      doc.pipe(require("fs").createWriteStream(filename));
      doc.end();

      // Save to database
      await db.from("invoices").insert({
        tenant_id,
        period_start,
        period_end,
        total_cost: costData.total_cost,
        breakdown: costData.breakdown_by_agent,
        file_path: filename,
        status: "generated",
      });

      return reply.send({
        invoice_id: `INV-${tenant_id}-${Date.now()}`,
        file: filename,
        total_cost: costData.total_cost,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to generate invoice" });
    }
  }
);

// ════════════════════════════════════════════════════════════════════
// ENDPOINT: GET /api/billing/cost-optimization/:tenant_id
// ════════════════════════════════════════════════════════════════════

fastify.get<{ Params: { tenant_id: string } }>(
  "/api/billing/cost-optimization/:tenant_id",
  async (request, reply) => {
    const { tenant_id } = request.params;

    try {
      const costData = await axios.get(
        `http://localhost:3007/api/billing/tenant/${tenant_id}/costs`
      );

      const suggestions = [];

      // Suggestion 1: If using Claude mostly, suggest cheaper model
      const agentCosts = costData.data.breakdown_by_agent;
      const totalAgentCost = agentCosts.reduce((sum: number, a: any) => sum + a.cost, 0);

      if (totalAgentCost > costData.data.total_cost * 0.7) {
        suggestions.push({
          type: "model_switch",
          title: "Switch to Llama 2 for agent tasks",
          current_cost: totalAgentCost,
          potential_savings: Math.round(totalAgentCost * 0.4 * 100) / 100,
          description: "Switching agent inference to Llama 2 could save 40% on compute costs.",
        });
      }

      // Suggestion 2: Batch rendering jobs
      if (costData.data.rendering_jobs > 50) {
        suggestions.push({
          type: "batch_rendering",
          title: "Enable batch rendering mode",
          potential_savings: Math.round(costData.data.total_cost * 0.15 * 100) / 100,
          description: "Batch rendering can save 15% by optimizing FFmpeg pipelines.",
        });
      }

      // Suggestion 3: Cache results
      suggestions.push({
        type: "caching",
        title: "Implement response caching",
        potential_savings: Math.round(costData.data.total_cost * 0.2 * 100) / 100,
        description: "Caching common responses could save 20% on API costs.",
      });

      return reply.send({
        tenant_id,
        current_monthly_cost: costData.data.estimated_monthly,
        suggestions,
        potential_monthly_savings: Math.round(
          suggestions.reduce((sum: number, s: any) => sum + s.potential_savings, 0) * 100
        ) / 100,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Failed to generate optimization suggestions" });
    }
  }
);

// ════════════════════════════════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════════════════════════════════

fastify.get("/health", async (request, reply) => {
  return {
    status: "ok",
    service: "billing-service",
    timestamp: new Date().toISOString(),
  };
});

// ════════════════════════════════════════════════════════════════════
// START
// ════════════════════════════════════════════════════════════════════

fastify.listen({ port: 3007, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  console.log(`✅ Billing Service listening at ${address}`);
});
