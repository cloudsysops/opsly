import { callLLM } from '../llm/gateway.js';
import { retrieve } from '../memory/knowledge-base.js';
import type { InMemoryToolRegistry } from './tools/registry.js';
import type { ToolManifest } from './tools/types.js';

function toolsToContext(tools: ToolManifest[]): string {
  if (tools.length === 0) {
    return '';
  }
  return tools
    .map(
      (t) =>
        `- ${t.name} [${t.riskLevel}]: ${t.description} | capacidades: ${t.capabilities.join(', ')}`
    )
    .join('\n');
}

function memoryToContext(snippets: string[]): string {
  if (snippets.length === 0) {
    return '';
  }
  return snippets.map((s, i) => `[${i + 1}] ${s}`).join('\n\n');
}

/**
 * Construye un bloque de texto para enriquecer el contexto del planner remoto:
 * memoria RAG + catálogo de herramientas + síntesis LiteLLM (opcional).
 *
 * Activar con ORCHESTRATOR_CONSCIOUS_LAYER=true y OPENAI_API_KEY (embeddings + coach).
 */
export async function buildConsciousAppendix(params: {
  readonly intentHint: string;
  readonly tenantId: string;
  readonly requestId: string;
  readonly toolRegistry: InMemoryToolRegistry;
}): Promise<string> {
  if (process.env.ORCHESTRATOR_CONSCIOUS_LAYER !== 'true') {
    return '';
  }

  const memorySnippets = await retrieve(params.intentHint);
  const matchedTools = params.toolRegistry.search(params.intentHint);
  const memoryContext = memoryToContext(memorySnippets);
  const toolsContext = toolsToContext(matchedTools);

  if (!process.env.OPENAI_API_KEY?.trim()) {
    process.stdout.write(
      `${JSON.stringify({
        event: 'conscious_layer_skip',
        reason: 'missing_OPENAI_API_KEY',
        request_id: params.requestId,
      })}\n`
    );
    return `\n---\n[Conscious: memoria + herramientas sin coach LLM]\n${memoryContext}\n${toolsContext}\n`;
  }

  try {
    const coach = await callLLM(
      `Resume en 5-8 líneas cómo ayudan la memoria y las herramientas al objetivo: ${params.intentHint}`,
      {
        memoryContext,
        toolsContext,
        tenantId: params.tenantId,
        requestId: params.requestId,
      },
      { temperature: 0.2 }
    );
    return `\n---\n[Conscious layer — coach]\n${coach}\n---\n[Memoria RAG]\n${memoryContext}\n---\n[Herramientas coincidentes]\n${toolsContext}\n`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[conscious-layer] callLLM: ${msg}\n`);
    return `\n---\n[Conscious: fallback sin coach]\n${memoryContext}\n${toolsContext}\n`;
  }
}
