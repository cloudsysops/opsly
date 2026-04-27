import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Job, Queue } from 'bullmq';
import { connection, orchestratorQueue } from '../queue.js';
import { notifyDiscord } from '../workers/NotifyWorker.js';

export type HelpBlockageType =
  | 'permission'
  | 'installation'
  | 'external_resource'
  | 'decision'
  | 'delegation';

export type HelpAssignedTo = 'human' | 'cursor' | 'copilot' | 'claude';

export interface HelpRequest {
  id: string;
  jobId: string;
  jobName: string;
  tenantSlug: string;
  blockageType: HelpBlockageType;
  errorMessage: string;
  context: Record<string, unknown>;
  suggestedAction: string;
  timestamp: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'timeout';
  resolution?: string;
  assignedTo?: HelpAssignedTo;
}

export interface CreateHelpRequestInput {
  jobId: string;
  jobName: string;
  tenantSlug: string;
  blockageType: HelpBlockageType;
  errorMessage: string;
  context: Record<string, unknown>;
  suggestedAction: string;
}

export class HelpRequestSystem {
  private readonly helpQueue = new Queue('hrp-queue', { connection });
  private readonly requestsPath = resolve(process.cwd(), 'context/help-requests');
  private readonly activeRequestPath = join(this.requestsPath, 'active-request.md');

  async requestHelp(input: CreateHelpRequestInput): Promise<string> {
    await mkdir(this.requestsPath, { recursive: true });
    const id = `help-${Date.now()}`;
    const request: HelpRequest = {
      ...input,
      id,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    await this.saveRequestFiles(request);
    await this.notifyViaDiscord(request);
    await this.helpQueue.add('process-help-request', request, {
      jobId: id,
      removeOnComplete: 20,
      attempts: 2,
    });
    return id;
  }

  async getPendingRequests(): Promise<HelpRequest[]> {
    await mkdir(this.requestsPath, { recursive: true });
    const files = await readdir(this.requestsPath);
    const requests = await Promise.all(
      files
        .filter((file) => file.startsWith('help-') && file.endsWith('.json'))
        .map(async (file) => {
          const data = await readFile(join(this.requestsPath, file), 'utf-8');
          return JSON.parse(data) as HelpRequest;
        })
    );
    return requests
      .filter((request) => request.status === 'pending' || request.status === 'in_progress')
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  async resolveHelpRequest(
    helpId: string,
    resolution: string,
    resolvedBy: HelpAssignedTo
  ): Promise<void> {
    const requestFile = join(this.requestsPath, `${helpId}.json`);
    const requestRaw = await readFile(requestFile, 'utf-8');
    const request = JSON.parse(requestRaw) as HelpRequest;
    request.status = 'resolved';
    request.resolution = resolution;
    request.assignedTo = resolvedBy;
    await writeFile(requestFile, `${JSON.stringify(request, null, 2)}\n`, 'utf-8');
    await this.reactivateBlockedJob(request.jobId, resolution);
    await notifyDiscord(
      '✅ Ayuda resuelta',
      `Solicitud ${helpId} resuelta por ${resolvedBy}. Se reactiva el job ${request.jobId}.`,
      'success'
    );
  }

  private async saveRequestFiles(request: HelpRequest): Promise<void> {
    const requestFile = join(this.requestsPath, `${request.id}.json`);
    const promptFile = join(this.requestsPath, `${request.id}-prompt.md`);
    const prompt = this.generatePromptForExternalAgent(request);
    await writeFile(requestFile, `${JSON.stringify(request, null, 2)}\n`, 'utf-8');
    await writeFile(promptFile, prompt, 'utf-8');
    await writeFile(
      this.activeRequestPath,
      `# Solicitud activa de Opsly\n\n${prompt}`,
      'utf-8'
    );
  }

  private generatePromptForExternalAgent(request: HelpRequest): string {
    const header = `# OPSLY HELP REQUEST\n\nID: ${request.id}\nTipo: ${request.blockageType}\nTarea: ${request.jobName}\nTenant: ${request.tenantSlug}\n`;
    const details = `\nError: ${request.errorMessage}\n\nAccion sugerida:\n${request.suggestedAction}\n`;
    const resolution = `\nCuando termines, responde con:\n\`\`\`\nOPSLY_HELP_RESOLVED:${request.id}:<detalle>\n\`\`\`\n`;
    return `${header}${details}${resolution}`;
  }

  private async notifyViaDiscord(request: HelpRequest): Promise<void> {
    const title = `🚨 Opsly necesita ayuda (${request.blockageType})`;
    const message = `Tarea: ${request.jobName}\nTenant: ${request.tenantSlug}\nAccion: ${request.suggestedAction}\nArchivo: context/help-requests/${request.id}-prompt.md`;
    await notifyDiscord(title, message, request.blockageType === 'permission' ? 'error' : 'warning');
  }

  private async reactivateBlockedJob(jobId: string, resolution: string): Promise<void> {
    const job = await Job.fromId(orchestratorQueue, jobId);
    if (!job) {
      return;
    }
    const retryId = `${jobId}-retry-${Date.now()}`;
    await orchestratorQueue.add(job.name, {
      ...job.data,
      helpResolution: resolution,
      helpResolvedAt: new Date().toISOString(),
    }, { jobId: retryId });
  }
}

export async function ensureHelpRequestDirectories(): Promise<void> {
  const root = resolve(process.cwd(), '.cursor');
  await mkdir(resolve(process.cwd(), 'context/help-requests'), { recursive: true });
  await mkdir(join(root, 'prompts'), { recursive: true });
  await mkdir(join(root, 'responses'), { recursive: true });
  await mkdir(dirname(resolve(process.cwd(), 'context/help-requests/active-request.md')), {
    recursive: true,
  });
}
