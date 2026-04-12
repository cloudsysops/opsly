import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const OutputSchema = z.object({
  category: z.string(),
  confidence: z.number(),
});

const ErrorSchema = z.object({
  error: z.string(),
});

export interface TaskCategoryInput {
  taskDescription: string;
  /** Trazabilidad multi-tenant; opcionalmente restringido vía OPSLY_CLASSIFIER_ALLOWED_TENANTS */
  tenantSlug: string;
}

export interface TaskCategoryOutput {
  category: string;
  confidence: number;
}

function classifierAgentDir(): string {
  const fromEnv = process.env.OPSLY_CLASSIFIER_HOME;
  if (fromEnv && existsSync(path.join(fromEnv, "infer.py"))) {
    return fromEnv;
  }
  const candidates = [
    path.join(process.cwd(), "apps", "ml", "agents", "classifier"),
    path.join(process.cwd(), "agents", "classifier"),
  ];
  for (const c of candidates) {
    if (existsSync(path.join(c, "infer.py"))) {
      return c;
    }
  }
  return candidates[0];
}

function assertAllowedTenant(slug: string): void {
  const raw = process.env.OPSLY_CLASSIFIER_ALLOWED_TENANTS;
  if (raw === undefined || raw.trim() === "") {
    return;
  }
  const allowed = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (!allowed.includes(slug)) {
    throw new Error(
      `classifier sandbox: tenant "${slug}" not allowed (OPSLY_CLASSIFIER_ALLOWED_TENANTS)`
    );
  }
}

function parseStdout(stdout: string): TaskCategoryOutput {
  const trimmed = stdout.trim();
  const parsed: unknown = JSON.parse(trimmed);
  const errCheck = ErrorSchema.safeParse(parsed);
  if (errCheck.success) {
    throw new Error(errCheck.data.error);
  }
  return OutputSchema.parse(parsed);
}

/**
 * Clasifica texto de tarea usando el modelo sklearn en `agents/classifier/models/model.pkl`.
 * Requiere `python3`, dependencias (`pip install -r requirements.txt`) y haber ejecutado `train.py`.
 */
export async function classifyTaskCategory(
  input: TaskCategoryInput
): Promise<TaskCategoryOutput> {
  assertAllowedTenant(input.tenantSlug);

  const dir = classifierAgentDir();
  const inferScript = path.join(dir, "infer.py");
  const py = process.env.OPSLY_CLASSIFIER_PYTHON ?? "python3";

  const payload = JSON.stringify({
    taskDescription: input.taskDescription,
    tenantSlug: input.tenantSlug,
  });

  return await new Promise((resolve, reject) => {
    const child = spawn(py, [inferScript], {
      cwd: dir,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf-8");
    });

    const timeoutMs = Number(process.env.OPSLY_CLASSIFIER_TIMEOUT_MS ?? "15000");
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`classifier infer timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            stderr.trim() || `classifier infer exited with code ${code ?? "unknown"}`
          )
        );
        return;
      }
      try {
        resolve(parseStdout(stdout));
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });

    child.stdin?.write(payload, "utf-8");
    child.stdin?.end();
  });
}
