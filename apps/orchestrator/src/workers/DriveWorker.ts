import { Job } from 'bullmq';
import { execa } from 'execa';
import { createWorker } from './create-worker.js';

async function processDriveJob(_job: Job): Promise<{ success: true }> {
  await execa('bash', ['./scripts/drive-sync.sh'], {
    cwd: process.cwd(),
  });
  return { success: true };
}

export function startDriveWorker(connection: object) {
  return createWorker({
    jobName: 'drive',
    workerName: 'drive',
    concurrencyKey: 'drive',
    connection,
    processFn: processDriveJob,
  });
}
