import { z } from "zod";
import { writeActivePrompt } from "../lib/github.js";
import type { ToolDefinition } from "../types/index.js";

interface ExecutePromptInput {
  task: string;
  commands: string[];
  dry_run: boolean;
}

export const executorTool: ToolDefinition<ExecutePromptInput, Record<string, unknown>> = {
  name: "execute_prompt",
  description:
    "Encola trabajo para Cursor (u operador humano) escribiendo docs/ACTIVE-PROMPT.md en GitHub; compatible con flujo monitor/cursor-prompt en VPS.",
  inputSchema: z.object({
    task: z.string().min(10),
    commands: z.array(z.string()),
    dry_run: z.boolean().default(false)
  }),
  handler: async (input: ExecutePromptInput) => {
    const content = [
      `# Tarea: ${input.task}`,
      `# Fecha: ${new Date().toISOString()}`,
      `# Modo: ${input.dry_run ? "DRY-RUN" : "REAL"}`,
      "",
      ...input.commands
    ].join("\n");

    if (!input.dry_run) {
      await writeActivePrompt(content);
    }

    return {
      success: true,
      task: input.task,
      commands_count: input.commands.length,
      dry_run: input.dry_run
    };
  }
};
