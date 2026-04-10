import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { ToolManifest } from "./types.js";

const execFileAsync = promisify(execFile);

/** Comandos permitidos (sin shell, sin pipes): blindaje frente a RCE. */
const ALLOW = new Set(["echo", "pwd", "date", "uname"]);

function sanitizeArgs(raw: unknown): string[] {
  if (typeof raw === "object" && raw !== null && "args" in raw) {
    const a = (raw as { args?: unknown }).args;
    if (Array.isArray(a)) {
      return a.filter((x): x is string => typeof x === "string" && x.length > 0);
    }
  }
  return [];
}

/**
 * Herramienta dummy de shell “segura”: solo ejecuta binarios en PATH con argumentos literales.
 * No interpreta `sh -c` ni metacaracteres.
 */
export const ShellCommandTool: ToolManifest = {
  name: "shell_command",
  description:
    "Ejecuta un comando permitido (echo, pwd, date, uname) con argumentos seguros. Sin red ni borrado.",
  capabilities: ["shell", "diagnostics", "readonly"],
  riskLevel: "medium",
  async execute(input: unknown): Promise<unknown> {
    const cmd =
      typeof input === "object" && input !== null && "command" in input
        ? String((input as { command?: unknown }).command ?? "")
        : "";
    const bin = cmd.trim();
    if (!ALLOW.has(bin)) {
      return {
        ok: false,
        error: `comando no permitido: ${bin}. Permitidos: ${[...ALLOW].join(", ")}`,
      };
    }
    const args = sanitizeArgs(input);
    try {
      const { stdout, stderr } = await execFileAsync(bin, args, {
        timeout: 10_000,
        maxBuffer: 256 * 1024,
      });
      return {
        ok: true,
        command: bin,
        args,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: msg };
    }
  },
};
