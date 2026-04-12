"use strict";

/**
 * Registra el job repetible BullMQ `hermes-tick` (misma semántica que apps/orchestrator/src/index.ts).
 */
const { hermesOrchestrationQueue } = require("../../apps/orchestrator/dist/queue.js");

async function main() {
  try {
    await hermesOrchestrationQueue.add(
      "hermes-tick",
      { source: "repeat" },
      {
        repeat: { pattern: "*/5 * * * *" },
        jobId: "hermes-orchestrate-repeat-v1",
      },
    );
    console.log(
      JSON.stringify({
        service: "hermes-register-repeat",
        ok: true,
        detail: "hermes-tick repeatable registered",
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("already exists") ||
      msg.includes("duplicate") ||
      msg.includes("jobId")
    ) {
      console.log(
        JSON.stringify({
          service: "hermes-register-repeat",
          ok: true,
          detail: "repeatable already present (ignored)",
          message: msg,
        }),
      );
    } else {
      console.error(
        JSON.stringify({
          service: "hermes-register-repeat",
          ok: false,
          error: msg,
        }),
      );
      process.exitCode = 1;
    }
  } finally {
    await hermesOrchestrationQueue.close();
  }
}

void main();
