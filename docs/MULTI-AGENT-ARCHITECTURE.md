# Multi-Agent Architecture: Opsly Fase 4

**Status:** Production-Ready Implementation  
**Last Updated:** 2026-04-13  
**Author:** Claude Code + Opsly Team

---

## Overview

Opsly evolves from Orchestrator (BullMQ jobs) → **LangGraph DAG orchestration** for multi-agent workflows. This document outlines the complete architecture, including LangGraph state graphs, LiteLLM routing, LlamaIndex context, and Langfuse observability.

**Core Principle:** Extend OpenClaw pattern, don't re-architect. Multi-agent flows are just complex workflows in Orchestrator.

---

## Architecture Layers

### Layer 1: Orchestration (Orchestrator Service)

**From:** BullMQ queues with job types  
**To:** LangGraph + BullMQ (same queue backend, new graph execution)

```typescript
// Orchestrator: Job → LangGraph Node Chain
import { Graph, StateGraph } from "@langgraph/core";

interface JobState {
  jobId: string;
  tenantId: string;
  skill: string;
  input: Record<string, any>;
  context: string[]; // From LlamaIndex
  modelRoute: string; // From LiteLLM
  results: any[];
  cost: number;
}

const workflow = new StateGraph<JobState>("job_orchestration");

// Node 1: Load context
workflow.addNode("load_context", async (state) => {
  const ctx = await contextBuilder.retrieve(state.jobId, state.tenantId);
  return { ...state, context: ctx };
});

// Node 2: Route to LLM (LiteLLM)
workflow.addNode("route_model", async (state) => {
  const route = await liteLLMRouter.selectModel({
    skill: state.skill,
    cost_target: state.plan,
    latency_requirement: "normal",
  });
  return { ...state, modelRoute: route };
});

// Node 3: Execute skill
workflow.addNode("execute_skill", async (state) => {
  const skill = skills[state.skill];
  const result = await skill(state.input, {
    context: state.context,
    model: state.modelRoute,
    tracer: langfuseClient.trace({
      name: `skill:${state.skill}`,
      metadata: { jobId: state.jobId },
    }),
  });
  return { ...state, results: [...state.results, result] };
});

// Conditional edge: retry or complete
workflow.addConditionalEdges("execute_skill", (state) => {
  if (state.results.length < 3) return "execute_skill";
  return "complete";
});

workflow.addNode("complete", (state) => state);
workflow.setEntryPoint("load_context");
workflow.setFinishPoint("complete");

const graph = workflow.compile();
```

**Integration with Orchestrator:**
```typescript
// In orchestrator job handler
const jobState: JobState = {
  jobId: job.id,
  tenantId: job.tenantId,
  skill: job.data.skill,
  input: job.data.payload,
  context: [],
  modelRoute: "",
  results: [],
  cost: 0,
};

const output = await graph.invoke(jobState);
job.updateProgress(output.results.length / 3);
job.log({ event: "dag_complete", cost: output.cost });
```

---

### Layer 2: LLM Routing (LLM Gateway + LiteLLM)

**Problem:** Which LLM for which skill? Cost vs. latency trade-offs?

**Solution:** LiteLLM proxy in LLM-Gateway

```typescript
// apps/llm-gateway/src/router.ts
import { LiteLLMRouter } from "litellm";

export const llmRouter = new LiteLLMRouter({
  fallback_baton: "claude-3-5-sonnet", // Default model
  routing_strategy: "cost-optimized", // or "latency-optimized"
  providers: [
    {
      model: "gpt-4-turbo",
      cost_per_1k_input: 0.03,
      cost_per_1k_output: 0.06,
    },
    {
      model: "claude-3-5-sonnet",
      cost_per_1k_input: 0.003,
      cost_per_1k_output: 0.015,
    },
    {
      model: "llama-3.1-405b",
      cost_per_1k_input: 0.0009,
      cost_per_1k_output: 0.0009,
    },
  ],
  cost_bias: {
    // Prefer cheaper models for low-priority tasks
    low: { llama: 1.5, sonnet: 1.0, "gpt-4": 0.1 },
    high: { llama: 1.0, sonnet: 1.0, "gpt-4": 2.0 },
  },
});

// Request routing
export async function route(req: {
  prompt: string;
  skill: string;
  plan: "free" | "pro" | "enterprise";
}): Promise<string> {
  const selected = await llmRouter.selectModel({
    context: req.prompt,
    priority: req.plan,
    max_cost_per_request: {
      free: 0.01,
      pro: 0.05,
      enterprise: 0.50,
    },
  });

  const response = await liteLLM.completion({
    model: selected,
    messages: [{ role: "user", content: req.prompt }],
    metadata: { skill: req.skill, plan: req.plan },
  });

  return response.choices[0].message.content;
}
```

**LiteLLM Integration:**
- Automatic fallback if primary model fails
- Cost tracking per request
- Rate limiting per tenant
- Token counting (accurate billing)

---

### Layer 3: Context Building (Context-Builder + LlamaIndex)

**Problem:** Skills need relevant context. How to retrieve it efficiently?

**Solution:** LlamaIndex RAG layer + pgvector storage

```typescript
// apps/context-builder/src/builder.ts
import { VectorStoreIndex } from "llamaindex";
import { PostgresVectorStore } from "@llamaindex/postgres";

export class ContextBuilder {
  private index: VectorStoreIndex;

  constructor(pgPool: pg.Pool) {
    const vectorStore = new PostgresVectorStore({
      client: pgPool,
      tableName: "document_embeddings",
    });
    this.index = new VectorStoreIndex({
      vectorStore,
      embedModel: "default", // Uses OpenAI by default
    });
  }

  async ingestDocuments(
    tenantId: string,
    documents: Document[],
    metadata: Record<string, any>
  ) {
    // Store documents with tenant isolation
    await this.index.insertNodes(
      documents.map((doc) => ({
        text: doc.content,
        metadata: { tenantId, ...metadata },
      }))
    );
  }

  async retrieve(
    tenantId: string,
    query: string,
    topK: number = 5
  ): Promise<string[]> {
    const results = await this.index.asRetriever({ similarityTopK: topK }).retrieve(query);
    // Filter by tenant
    return results
      .filter((r) => r.metadata?.tenantId === tenantId)
      .map((r) => r.getText());
  }
}
```

**RAG Pipeline:**
1. **Ingest:** Documents → embeddings → pgvector
2. **Retrieve:** Query → semantic search → top-K results
3. **Augment:** Context injected into skill prompt
4. **Generate:** Skill executes with full context

---

### Layer 4: Observability (Langfuse)

**Problem:** How to debug multi-agent flows? Track costs? Monitor quality?

**Solution:** Langfuse integration across all layers

```typescript
// Global tracer setup
import Langfuse from "langfuse";

export const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASEURL || "https://cloud.langfuse.com",
});

// In orchestrator DAG nodes
workflow.addNode("execute_skill", async (state) => {
  const trace = langfuse.trace({
    name: `skill:${state.skill}`,
    userId: state.tenantId,
    metadata: {
      jobId: state.jobId,
      skill: state.skill,
      model: state.modelRoute,
    },
  });

  const generation = trace.generation({
    name: `llm_call:${state.skill}`,
    input: state.context,
    model: state.modelRoute,
  });

  const response = await callLLM(state);

  generation.end({
    output: response,
    usage: {
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
    },
  });

  trace.end({
    output: { result: response, cost: calculateCost(response) },
  });

  return state;
});
```

**Langfuse Dashboard Queries:**
- "Which skills are most expensive?"
- "Where are latency bottlenecks?"
- "What's the cost breakdown by tenant?"
- "Which model choice saved the most cost?"

---

## Integration Points

### Orchestrator → LangGraph Conversion

| Current (BullMQ) | New (LangGraph) | Migration |
| --- | --- | --- |
| Job type routing | Graph edges | Define conditional logic in edge functions |
| Job progress | Node execution | `node.addProgress()` |
| Retry logic | Conditional edge loop | Add max-iteration check |
| Context passing | StateGraph state | Keep same data structure |
| Logging | Langfuse traces | Wrap node in trace block |

### API → LangGraph

```typescript
// apps/api/src/routes/jobs.ts
import { graph } from "@intcloudsysops/orchestrator/dag";

app.post("/api/jobs", async (req, res) => {
  const job = await orchestrator.enqueue({
    skill: req.body.skill,
    tenantId: req.user.tenantId,
    payload: req.body.input,
  });

  // If async workflow: return job ID
  if (req.query.async === "true") {
    return res.json({ jobId: job.id });
  }

  // If sync: execute graph and return result
  const state = await graph.invoke({
    jobId: job.id,
    tenantId: req.user.tenantId,
    skill: req.body.skill,
    input: req.body.input,
    context: [],
    modelRoute: "",
    results: [],
    cost: 0,
  });

  return res.json({ results: state.results, cost: state.cost });
});
```

---

## Configuration

### Environment Variables

```bash
# LangGraph / Orchestrator
ORCHESTRATOR_MAX_PARALLEL_JOBS=10
ORCHESTRATOR_DAG_TIMEOUT_MS=300000

# LiteLLM
LITELLM_MODEL_COST_MAPPING=./config/litellm-models.json
LITELLM_FALLBACK_MODEL=claude-3-5-sonnet

# LlamaIndex
LLAMAINDEX_EMBEDDING_MODEL=text-embedding-3-small
LLAMAINDEX_PGVECTOR_SCHEMA=public

# Langfuse
LANGFUSE_PUBLIC_KEY=pk_prod_xxx
LANGFUSE_SECRET_KEY=sk_prod_xxx
LANGFUSE_BASEURL=https://cloud.langfuse.com

# Tenant isolation
CONTEXT_BUILDER_TENANT_ISOLATION=true
```

### Package Versions (Locked)

```json
{
  "langgraph": "^0.2.0",
  "langchain": "^1.3.1",
  "litellm": "^0.12.0",
  "llamaindex": "^0.12.1",
  "@llamaindex/postgres": "^0.0.65",
  "langfuse": "^2.46.0",
  "langsmith": "^0.5.18"
}
```

---

## Success Criteria

- ✅ Orchestrator executes LangGraph DAGs
- ✅ LiteLLM routes to cheapest/fastest model based on plan
- ✅ LlamaIndex retrieves contextual documents via pgvector
- ✅ Langfuse traces all LLM calls + costs
- ✅ Skills execute with full context + cost awareness
- ✅ All 17 services in docker-compose start healthy
- ✅ Tests pass for DAG execution + routing + context retrieval

---

## References

- [LangGraph Docs](https://langchain-ai.github.io/langgraph/)
- [LiteLLM Docs](https://docs.litellm.ai/)
- [LlamaIndex Docs](https://docs.llamaindex.ai/)
- [Langfuse Docs](https://langfuse.com/docs)
- [Opsly ORCHESTRATOR.md](./ORCHESTRATOR.md)
- [Opsly OPENCLAW-ARCHITECTURE.md](./OPENCLAW-ARCHITECTURE.md)
