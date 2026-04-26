import { llmCall } from '@intcloudsysops/llm-gateway';

export async function ragQuery(
  tenantSlug: string,
  question: string,
  context: string[]
): Promise<string> {
  const result = await llmCall({
    tenant_slug: tenantSlug,
    system: `Eres el asistente de ${tenantSlug}. Responde solo con el contexto dado.`,
    messages: [
      {
        role: 'user',
        content: `Contexto:\n${context.join('\n\n---\n\n')}\n\nPregunta: ${question}`,
      },
    ],
    model: 'sonnet',
    max_tokens: 1000,
    temperature: 0,
  });
  return result.content;
}
