import { z } from "zod";
import type { ToolDefinition } from "../types/index.js";

const inputSchema = z.object({
  action: z.enum([
    "create_notebook",
    "add_source",
    "generate_podcast",
    "generate_slides",
    "generate_quiz",
    "generate_mindmap",
    "generate_infographic",
    "ask",
    "research",
  ]),
  tenant_slug: z.string().min(1),
  notebook_id: z.string().optional(),
  url: z.string().url().optional(),
  text: z.string().optional(),
  title: z.string().optional(),
  path: z.string().optional(),
  question: z.string().optional(),
  query: z.string().optional(),
  instructions: z.string().optional(),
  output_path: z.string().optional(),
  quiz_output_path: z.string().optional(),
  orientation: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  mode: z.enum(["fast", "deep"]).optional(),
  name: z.string().optional(),
  source_type: z.enum(["url", "text", "file"]).optional(),
  auto_import: z.boolean().optional(),
  research_source: z.enum(["web", "drive"]).optional(),
});

type NotebookLMInput = z.infer<typeof inputSchema>;

type NotebookLMModule = {
  executeNotebookLM: (input: Record<string, unknown>) => Promise<unknown>;
};

let notebookLmModulePromise: Promise<NotebookLMModule> | undefined;

async function loadNotebookLmModule(): Promise<NotebookLMModule> {
  if (!notebookLmModulePromise) {
    notebookLmModulePromise = import("@intcloudsysops/notebooklm-agent")
      .then((module) => ({
        executeNotebookLM: module.executeNotebookLM as unknown as NotebookLMModule["executeNotebookLM"],
      }))
      .catch((error: unknown) => {
        notebookLmModulePromise = undefined;
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `NotebookLM agent package is unavailable. Build or install @intcloudsysops/notebooklm-agent before invoking this tool. Root cause: ${message}`,
        );
      });
  }

  return notebookLmModulePromise;
}

export const notebooklmTool: ToolDefinition<NotebookLMInput, Record<string, unknown>> = {
  name: "notebooklm",
  description:
    "Agente experimental NotebookLM: crear notebooks, fuentes (url/texto/archivo), " +
    "podcast/slides/quiz/mindmap/infografía, chat ask, investigación web. " +
    "Requiere NOTEBOOKLM_ENABLED y credenciales Google (notebooklm-py).",
  inputSchema,
  handler: async (input: NotebookLMInput) => {
    const { executeNotebookLM } = await loadNotebookLmModule();
    const result = await executeNotebookLM({
      action: input.action,
      tenant_slug: input.tenant_slug,
      notebook_id: input.notebook_id,
      url: input.url,
      text: input.text,
      title: input.title,
      path: input.path,
      question: input.question,
      query: input.query,
      instructions: input.instructions,
      output_path: input.output_path,
      quiz_output_path: input.quiz_output_path,
      orientation: input.orientation,
      difficulty: input.difficulty,
      mode: input.mode,
      name: input.name,
      source_type: input.source_type,
      auto_import: input.auto_import,
      research_source: input.research_source,
    });
    return result as unknown as Record<string, unknown>;
  },
};
