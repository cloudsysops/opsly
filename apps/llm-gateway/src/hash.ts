import { createHash } from "node:crypto";
import type { LLMMessage } from "./types.js";

export function hashPrompt(messages: LLMMessage[], system?: string): string {
  const payload = JSON.stringify({ messages, system });
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}
