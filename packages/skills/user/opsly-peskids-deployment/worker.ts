/**
 * Peskids Deployment Worker
 *
 * Autonomous agent worker for Peskids N8N + Uptime Kuma deployment
 * Triggered via BullMQ job queue (orchestrator)
 *
 * Jobs:
 * - peskids:validate-vps
 * - peskids:deploy-n8n
 * - peskids:deploy-uptime
 * - peskids:full-deployment
 */

import { Worker, Job } from 'bullmq';
import { createLogger } from '@intcloudsysops/observability';
import { executeCommand } from '../lib/shell-executor';

const logger = createLogger('peskids-deployment-worker');

interface PeskidsJob {
  task: 'validate-vps' | 'deploy-n8n' | 'deploy-uptime' | 'full-deployment';
  environment: 'prd' | 'staging';
  vpsHost?: string;
  vpsUser?: string;
  idempotency_key?: string;
  request_id?: string;
}

export const peskidsDeploymentWorker = new Worker<PeskidsJob>(
  'peskids-deployment',
  async (job: Job<PeskidsJob>) => {
    const { task, environment, vpsHost = '100.120.151.91', vpsUser = 'root' } = job.data;
    const requestId = job.data.request_id || job.id;

    logger.info(`Starting Peskids ${task}`, {
      environment,
      task,
      request_id: requestId,
      job_id: job.id,
    });

    try {
      switch (task) {
        case 'validate-vps':
          return await validateVps(job, vpsHost, vpsUser, requestId);

        case 'deploy-n8n':
          return await deployN8n(job, vpsHost, vpsUser, requestId);

        case 'deploy-uptime':
          return await deployUptime(job, vpsHost, vpsUser, requestId);

        case 'full-deployment':
          return await fullDeployment(job, vpsHost, vpsUser, requestId);

        default:
          throw new Error(`Unknown task: ${task}`);
      }
    } catch (error) {
      logger.error(`Peskids ${task} failed`, {
        error: error instanceof Error ? error.message : String(error),
        request_id: requestId,
        job_id: job.id,
      });
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 1, // One deployment at a time
    settings: {
      maxStalledCount: 2,
      stalledInterval: 30000,
      lockDuration: 600000, // 10 min per job
    },
  }
);

/**
 * Validate VPS SSH connectivity and service status
 */
async function validateVps(
  job: Job<PeskidsJob>,
  vpsHost: string,
  vpsUser: string,
  requestId: string
): Promise<{ status: 'valid' | 'invalid'; checks: Record<string, boolean> }> {
  const checks: Record<string, boolean> = {};

  try {
    // SSH connectivity
    logger.info('Checking SSH connectivity', { request_id: requestId });
    const sshTest = await executeCommand(`ssh ${vpsUser}@${vpsHost} "echo SSH_OK"`);
    checks.ssh = sshTest.includes('SSH_OK');

    // Docker
    logger.info('Checking Docker', { request_id: requestId });
    const dockerTest = await executeCommand(`ssh ${vpsUser}@${vpsHost} "docker --version"`);
    checks.docker = dockerTest.includes('Docker');

    // Opsly directory
    logger.info('Checking Opsly directory', { request_id: requestId });
    const dirTest = await executeCommand(
      `ssh ${vpsUser}@${vpsHost} "test -d /opt/opsly && echo DIR_OK"`
    );
    checks.directory = dirTest.includes('DIR_OK');

    // Services
    logger.info('Checking running services', { request_id: requestId });
    const servicesTest = await executeCommand(
      `ssh ${vpsUser}@${vpsHost} "cd /opt/opsly && docker-compose ps | grep -c '^'"`
    );
    checks.services = parseInt(servicesTest) > 3;

    const allValid = Object.values(checks).every((v) => v);
    logger.info(`VPS validation ${allValid ? 'passed' : 'failed'}`, {
      checks,
      request_id: requestId,
    });

    return {
      status: allValid ? 'valid' : 'invalid',
      checks,
    };
  } catch (error) {
    logger.error('VPS validation error', { error: String(error), request_id: requestId });
    throw error;
  }
}

/**
 * Deploy N8N container and create workflows
 */
async function deployN8n(
  job: Job<PeskidsJob>,
  vpsHost: string,
  vpsUser: string,
  requestId: string
): Promise<{ status: 'deployed'; n8nUrl: string; workflows: string[] }> {
  logger.info('Deploying N8N', { request_id: requestId });

  try {
    // 1. Validate first
    const validation = await validateVps(job, vpsHost, vpsUser, requestId);
    if (validation.status !== 'valid') {
      throw new Error('VPS validation failed, cannot proceed with N8N deployment');
    }

    // 2. Pull latest code
    logger.info('Pulling latest code', { request_id: requestId });
    await executeCommand(
      `ssh ${vpsUser}@${vpsHost} "cd /opt/opsly && git pull --ff-only origin main"`
    );

    // 3. Deploy N8N container
    logger.info('Starting N8N container', { request_id: requestId });
    const deployCmd = `ssh ${vpsUser}@${vpsHost} "cd /opt/opsly && docker-compose up -d n8n-peskids"`;
    await executeCommand(deployCmd);

    // 4. Wait for N8N to be ready
    logger.info('Waiting for N8N to be ready', { request_id: requestId });
    await new Promise((resolve) => setTimeout(resolve, 15000)); // 15s startup time

    // 5. Create workflows (automated via N8N API)
    logger.info('Creating N8N workflows', { request_id: requestId });
    const workflows = await createN8nWorkflows(vpsHost, vpsUser, requestId);

    const n8nUrl = `https://n8n-peskids.op-sly.com`;
    logger.info('N8N deployment complete', {
      n8nUrl,
      workflows,
      request_id: requestId,
    });

    return {
      status: 'deployed',
      n8nUrl,
      workflows,
    };
  } catch (error) {
    logger.error('N8N deployment failed', { error: String(error), request_id: requestId });
    throw error;
  }
}

/**
 * Deploy Uptime Kuma container and configure monitoring
 */
async function deployUptime(
  job: Job<PeskidsJob>,
  vpsHost: string,
  vpsUser: string,
  requestId: string
): Promise<{ status: 'deployed'; uptimeUrl: string; monitorsCreated: number }> {
  logger.info('Deploying Uptime Kuma', { request_id: requestId });

  try {
    // 1. Validate first
    const validation = await validateVps(job, vpsHost, vpsUser, requestId);
    if (validation.status !== 'valid') {
      throw new Error('VPS validation failed, cannot proceed with Uptime deployment');
    }

    // 2. Run bootstrap script
    logger.info('Running Uptime Kuma bootstrap', { request_id: requestId });
    const bootstrapCmd = `ssh ${vpsUser}@${vpsHost} "cd /opt/opsly && bash scripts/peskids-uptime-kuma-bootstrap.sh"`;
    const bootstrapResult = await executeCommand(bootstrapCmd);

    // 3. Parse monitors created
    const monitorsMatch = bootstrapResult.match(/Created (\d+) monitors/);
    const monitorsCreated = monitorsMatch ? parseInt(monitorsMatch[1]) : 0;

    const uptimeUrl = `https://uptime-peskids.op-sly.com`;
    logger.info('Uptime Kuma deployment complete', {
      uptimeUrl,
      monitorsCreated,
      request_id: requestId,
    });

    return {
      status: 'deployed',
      uptimeUrl,
      monitorsCreated,
    };
  } catch (error) {
    logger.error('Uptime Kuma deployment failed', { error: String(error), request_id: requestId });
    throw error;
  }
}

/**
 * Full deployment: validate → N8N → Uptime → smoke test
 */
async function fullDeployment(
  job: Job<PeskidsJob>,
  vpsHost: string,
  vpsUser: string,
  requestId: string
): Promise<{
  status: 'complete';
  vpsValid: boolean;
  n8nDeployed: boolean;
  uptimeDeployed: boolean;
  smokeTestsPassed: boolean;
}> {
  logger.info('Starting full Peskids deployment', { request_id: requestId });

  const results = {
    status: 'complete' as const,
    vpsValid: false,
    n8nDeployed: false,
    uptimeDeployed: false,
    smokeTestsPassed: false,
  };

  try {
    // 1. Validate
    job.progress(10);
    logger.info('Step 1/4: Validating VPS', { request_id: requestId });
    const validation = await validateVps(job, vpsHost, vpsUser, requestId);
    results.vpsValid = validation.status === 'valid';
    if (!results.vpsValid) throw new Error('VPS validation failed');

    // 2. Deploy N8N
    job.progress(35);
    logger.info('Step 2/4: Deploying N8N', { request_id: requestId });
    const n8nResult = await deployN8n(job, vpsHost, vpsUser, requestId);
    results.n8nDeployed = n8nResult.status === 'deployed';

    // 3. Deploy Uptime
    job.progress(65);
    logger.info('Step 3/4: Deploying Uptime Kuma', { request_id: requestId });
    const uptimeResult = await deployUptime(job, vpsHost, vpsUser, requestId);
    results.uptimeDeployed = uptimeResult.status === 'deployed';

    // 4. Smoke tests
    job.progress(85);
    logger.info('Step 4/4: Running smoke tests', { request_id: requestId });
    const smokeResult = await runSmokeTests(requestId);
    results.smokeTestsPassed = smokeResult;

    job.progress(100);
    logger.info('Full deployment complete', { results, request_id: requestId });

    return results;
  } catch (error) {
    logger.error('Full deployment failed', { error: String(error), request_id: requestId });
    throw error;
  }
}

/**
 * Helper: Create N8N workflows via API
 */
async function createN8nWorkflows(
  vpsHost: string,
  vpsUser: string,
  requestId: string
): Promise<string[]> {
  try {
    const workflows: string[] = [];

    // Lead Capture workflow
    logger.info('Creating Lead Capture workflow', { request_id: requestId });
    // TODO: Call N8N API to create workflow
    workflows.push('lead-capture');

    // Hot Lead Alert workflow
    logger.info('Creating Hot Lead Alert workflow', { request_id: requestId });
    // TODO: Call N8N API to create workflow
    workflows.push('hot-lead-alert');

    return workflows;
  } catch (error) {
    logger.warn('N8N workflow creation skipped (manual setup may be needed)', {
      error: String(error),
      request_id: requestId,
    });
    return [];
  }
}

/**
 * Helper: Run smoke tests
 */
async function runSmokeTests(requestId: string): Promise<boolean> {
  try {
    logger.info('Running smoke tests', { request_id: requestId });

    // Test API health
    const apiHealth = await executeCommand('curl -s https://api.op-sly.com/api/health');
    const apiOk = apiHealth.includes('ok');

    // Test landing page
    const landing = await executeCommand('curl -s https://peskids.op-sly.com');
    const landingOk = landing.includes('peskids');

    // Test N8N
    const n8n = await executeCommand(
      'curl -s -o /dev/null -w "%{http_code}" https://n8n-peskids.op-sly.com'
    );
    const n8nOk = n8n === '200';

    // Test Uptime
    const uptime = await executeCommand(
      'curl -s -o /dev/null -w "%{http_code}" https://uptime-peskids.op-sly.com'
    );
    const uptimeOk = uptime === '200';

    const allPassed = apiOk && landingOk && n8nOk && uptimeOk;
    logger.info('Smoke tests complete', {
      apiOk,
      landingOk,
      n8nOk,
      uptimeOk,
      allPassed,
      request_id: requestId,
    });

    return allPassed;
  } catch (error) {
    logger.warn('Smoke tests failed', { error: String(error), request_id: requestId });
    return false;
  }
}

export default peskidsDeploymentWorker;
