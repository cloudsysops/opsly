/**
 * Session handoff helper: runs one local Cursor agent prompt against the repo
 * so AGENTS.md / ROADMAP.md are read in-context and a concise brief is printed.
 *
 * Env: CURSOR_API_KEY (or pass via your shell profile). Optional OPSLY_ROOT.
 *
 * @see https://cursor.com/docs/api/sdk/typescript
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Agent, CursorAgentError } from "@cursor/sdk";

const EXIT_NO_KEY = 78;
const EXIT_STARTUP = 1;
const EXIT_RUN_FAILED = 2;

function resolveRepoRoot(): string {
  const fromEnv = process.env.OPSLY_ROOT?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return path.resolve(fromEnv);
  }
  // npm script runs with cwd = repo root; align with OPSLY_ROOT in AGENTS.md for orchestrator.
  return path.resolve(process.cwd());
}

function parseArgs(argv: string[]): { outPath?: string } {
  const outIdx = argv.indexOf("--out");
  if (outIdx >= 0 && argv[outIdx + 1]) {
    return { outPath: path.resolve(argv[outIdx + 1]) };
  }
  return {};
}

const BRIEF_PROMPT = `You are in the Opsly intcloudsysops monorepo. Read these files from the working directory (use read_file if needed):
- AGENTS.md (focus: sections marked with 🔄, "Próximo paso inmediato", "Bloqueantes activos", "Quick Commands" if present)
- ROADMAP.md (first milestone block or sprint pointer only; do not summarize the whole file)

Output Markdown (Spanish is fine if the docs are Spanish):
1. **Contexto** — one short paragraph: what this repo session is about.
2. **Siguiente paso** — bullet list, max 3 items, only from AGENTS/ROADMAP (no invention).
3. **Bloqueantes** — bullet list from AGENTS or "Ninguno declarado".
4. **Verificación sugerida** — bullet list of shell commands already mentioned in AGENTS Quick Commands or testing section; if none, say "Ver type-check / tests del workspace tocado".

Do not print secrets, tokens, Doppler values, or SSH hosts beyond what already appears in the files.`;

async function main(): Promise<void> {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    process.stderr.write(
      "Missing CURSOR_API_KEY. Create a key in Cursor (Cloud Agents / API) and export it, then re-run.\n",
    );
    process.exit(EXIT_NO_KEY);
  }

  const cwd = resolveRepoRoot();
  const { outPath } = parseArgs(process.argv);

  let result;
  try {
    result = await Agent.prompt(BRIEF_PROMPT, {
      apiKey,
      model: { id: "composer-2" },
      local: { cwd, settingSources: [] },
    });
  } catch (err) {
    if (err instanceof CursorAgentError) {
      process.stderr.write(
        `Cursor agent failed to start: ${err.message} (retryable=${String(err.isRetryable)})\n`,
      );
      process.exit(EXIT_STARTUP);
    }
    throw err;
  }

  if (result.status === "error" || result.status === "cancelled") {
    process.stderr.write(
      `Run ended with status=${result.status} runId=${result.id}\n`,
    );
    process.exit(EXIT_RUN_FAILED);
  }

  const body = result.result?.trim() ?? "";
  if (body.length === 0) {
    process.stderr.write(`Empty result (runId=${result.id})\n`);
    process.exit(EXIT_RUN_FAILED);
  }

  if (outPath) {
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, `${body}\n`, "utf8");
    process.stdout.write(`Wrote ${outPath}\n`);
  } else {
    process.stdout.write(`${body}\n`);
  }
}

void main().catch((err: unknown) => {
  process.stderr.write(err instanceof Error ? `${err.message}\n` : String(err));
  process.exit(EXIT_STARTUP);
});
