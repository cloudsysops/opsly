import { llmCall } from "@intcloudsysops/llm-gateway";
import type { SessionContext } from "./builder.js";

export async function summarizeSession(ctx: SessionContext): Promise<string> {
  const conversation = ctx.messages
    .map((message) => `${message.role}: ${message.content}`)
    .join("\n");

  const result = await llmCall({
    tenant_slug: ctx.tenant_slug,
    messages: [
      {
        role: "user",
        content: `Resume esta conversación en máximo 3 oraciones:\n\n${conversation}`,
      },
    ],
    model: "haiku",
    temperature: 0,
    cache: true,
  });

  return result.content;
}
