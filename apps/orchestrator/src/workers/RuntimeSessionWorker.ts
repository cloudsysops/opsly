import type { Job } from 'bullmq';
import {
  createSession,
  mapLifecycleFromStatus,
  sendCommand,
  stopSession,
} from '@intcloudsysops/session-manager';
import { createWorker } from './create-worker.js';
import type { OrchestratorJob } from '../types.js';

interface RuntimeSessionPayload {
  action?: 'create' | 'send' | 'stop';
  name?: string;
  agent_id?: string;
  job_id?: string;
  workspace?: string;
  branch?: string;
  initial_command?: string;
  session_id?: string;
  command?: string;
  dry_run?: boolean;
}

function readPayload(job: Job): RuntimeSessionPayload {
  const data = job.data as OrchestratorJob;
  const payload = (data.payload ?? {}) as RuntimeSessionPayload;
  return payload;
}

async function processRuntimeSession(job: Job): Promise<Record<string, unknown>> {
  const payload = readPayload(job);
  const action = payload.action ?? 'create';
  const workspace =
    payload.workspace?.trim() ||
    process.env.OPSLY_ROOT?.trim() ||
    process.cwd();

  if (action === 'create') {
    const session = await createSession({
      name: payload.name ?? 'runtime-job',
      agentId: payload.agent_id ?? 'orchestrator',
      jobId: payload.job_id ?? job.id ?? undefined,
      workspace,
      branch: payload.branch,
      initialCommand: payload.initial_command,
    });
    return {
      lifecycle: mapLifecycleFromStatus(session.status),
      session,
    };
  }

  const sessionId = payload.session_id?.trim() ?? '';
  if (sessionId.length === 0) {
    throw new Error('runtime_session send/stop requires payload.session_id');
  }

  if (action === 'send') {
    const command = payload.command?.trim() ?? '';
    if (command.length === 0) {
      throw new Error('runtime_session send requires payload.command');
    }
    const result = await sendCommand({
      sessionId,
      command,
      dryRun: payload.dry_run === true,
    });
    return {
      lifecycle: mapLifecycleFromStatus(result.meta.status),
      session: result.meta,
      output: result.output,
    };
  }

  if (action === 'stop') {
    const session = await stopSession(sessionId);
    return {
      lifecycle: mapLifecycleFromStatus(session.status),
      session,
    };
  }

  throw new Error(`runtime_session unknown action: ${action}`);
}

export function startRuntimeSessionWorker(connection: object) {
  return createWorker({
    connection,
    jobName: 'runtime_session',
    workerName: 'runtime_session',
    concurrencyKey: 'runtime_session',
    processFn: processRuntimeSession,
  });
}
