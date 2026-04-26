import { analyzeComplexity } from './complexity.js';
import { llmCallDirect } from './llm-direct.js';
import type { LLMRequest, LLMResponse } from './types.js';

export interface SubTask {
  id: string;
  description: string;
  prompt: string;
  complexity: 1 | 2 | 3;
  depends_on: string[];
}

export interface DecomposedResult {
  subtasks: SubTask[];
  results: Record<string, string>;
  merged: string;
  total_cost_usd: number;
  savings_vs_sonnet: number;
}

function coerceComplexity(n: unknown): 1 | 2 | 3 {
  if (n === 1 || n === 2 || n === 3) return n;
  const x = Number(n);
  if (x === 1 || x === 2 || x === 3) return x;
  return 2;
}

function subtaskModel(c: 1 | 2 | 3): NonNullable<LLMRequest['model']> {
  if (c === 3) return 'sonnet';
  return 'haiku';
}

export async function decomposeAndExecute(original: LLMRequest): Promise<DecomposedResult> {
  const originalPrompt = original.messages.at(-1)?.content ?? '';

  const decomposition = await llmCallDirect({
    tenant_slug: original.tenant_slug,
    model: 'haiku',
    temperature: 0,
    cache: true,
    messages: [
      {
        role: 'user',
        content: `Eres un experto en dividir tareas complejas.
Analiza esta tarea y divídela en 2-4 subtareas independientes.
Cada subtarea debe ser más simple que el todo.

Responde SOLO en JSON válido:
[
  {
    "id": "1",
    "description": "qué hace esta subtarea",
    "prompt": "prompt completo para esta subtarea",
    "complexity": 1 o 2 o 3,
    "depends_on": [] o ["1"] si depende de subtarea anterior
  }
]

TAREA ORIGINAL:
${originalPrompt}`,
      },
    ],
  });

  let subtasks: SubTask[];
  try {
    const clean = decomposition.content.replace(/```json|```/g, '').trim();
    const raw = JSON.parse(clean) as unknown;
    if (!Array.isArray(raw)) throw new Error('not array');
    subtasks = raw.map((row) => {
      const o = row as Record<string, unknown>;
      return {
        id: String(o.id ?? ''),
        description: String(o.description ?? ''),
        prompt: String(o.prompt ?? ''),
        complexity: coerceComplexity(o.complexity),
        depends_on: Array.isArray(o.depends_on) ? o.depends_on.map(String) : [],
      };
    });
  } catch {
    const direct = await llmCallDirect(original);
    return {
      subtasks: [],
      results: { '0': direct.content },
      merged: direct.content,
      total_cost_usd: direct.cost_usd,
      savings_vs_sonnet: 0,
    };
  }

  const results: Record<string, string> = {};
  let totalCost = decomposition.cost_usd;

  const independent = subtasks.filter((t) => t.depends_on.length === 0);
  const dependent = subtasks.filter((t) => t.depends_on.length > 0);

  await Promise.all(
    independent.map(async (task) => {
      const analysis = analyzeComplexity(task.prompt);
      let model: NonNullable<LLMRequest['model']>;
      if (task.complexity === 3) model = 'sonnet';
      else if (analysis.level === 1) model = 'cheap';
      else model = subtaskModel(task.complexity);
      const result: LLMResponse = await llmCallDirect({
        tenant_slug: original.tenant_slug,
        model,
        temperature: original.temperature ?? 0,
        cache: true,
        messages: [{ role: 'user', content: task.prompt }],
      });
      results[task.id] = result.content;
      totalCost += result.cost_usd;
    })
  );

  for (const task of dependent) {
    const context = task.depends_on
      .map((id) => `Resultado subtarea ${id}: ${results[id] ?? ''}`)
      .join('\n');
    const result = await llmCallDirect({
      tenant_slug: original.tenant_slug,
      model: task.complexity === 3 ? 'sonnet' : 'haiku',
      temperature: 0,
      cache: true,
      messages: [{ role: 'user', content: `${context}\n\n${task.prompt}` }],
    });
    results[task.id] = result.content;
    totalCost += result.cost_usd;
  }

  const mergeResult = await llmCallDirect({
    tenant_slug: original.tenant_slug,
    model: 'haiku',
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: `Combina estos resultados en una respuesta coherente:

${Object.entries(results)
  .map(([id, r]) => `Parte ${id}: ${r}`)
  .join('\n\n')}

Respuesta unificada:`,
      },
    ],
  });
  totalCost += mergeResult.cost_usd;

  const sonnetCost = (originalPrompt.length / 4 / 1000) * (0.003 + 0.015);
  const savings = Math.max(0, sonnetCost - totalCost);

  return {
    subtasks,
    results,
    merged: mergeResult.content,
    total_cost_usd: totalCost,
    savings_vs_sonnet: Math.round(savings * 10000) / 10000,
  };
}
