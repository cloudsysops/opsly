import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { JSON_PRETTY_PRINT_INDENT } from './constants';

export type HelpAssignedTo = 'human' | 'cursor' | 'copilot' | 'claude';
export type HelpStatus = 'pending' | 'in_progress' | 'resolved' | 'timeout';
export type HelpBlockageType =
  | 'permission'
  | 'installation'
  | 'external_resource'
  | 'decision'
  | 'delegation';

export interface HelpRequestRecord {
  id: string;
  jobId: string;
  jobName: string;
  tenantSlug: string;
  blockageType: HelpBlockageType;
  errorMessage: string;
  context: Record<string, unknown>;
  suggestedAction: string;
  timestamp: string;
  status: HelpStatus;
  resolution?: string;
  assignedTo?: HelpAssignedTo;
}

function repoRoot(): string {
  if (process.env.OPSLY_REPO_ROOT) {
    return process.env.OPSLY_REPO_ROOT;
  }
  return resolve(process.cwd(), '..', '..');
}

function requestsDir(): string {
  return join(repoRoot(), 'context/help-requests');
}

export async function ensureHelpRequestStore(): Promise<void> {
  await mkdir(requestsDir(), { recursive: true });
}

export async function createHelpRequest(
  input: Omit<HelpRequestRecord, 'id' | 'timestamp' | 'status'>
): Promise<HelpRequestRecord> {
  await ensureHelpRequestStore();
  const id = `help-${Date.now()}`;
  const request: HelpRequestRecord = {
    ...input,
    id,
    timestamp: new Date().toISOString(),
    status: 'pending',
  };
  const requestPath = join(requestsDir(), `${id}.json`);
  const promptPath = join(requestsDir(), `${id}-prompt.md`);
  const activePath = join(requestsDir(), 'active-request.md');
  const prompt = [
    '# OPSLY HELP REQUEST',
    '',
    `ID: ${id}`,
    `Tipo: ${request.blockageType}`,
    `Tarea: ${request.jobName}`,
    `Tenant: ${request.tenantSlug}`,
    '',
    `Error: ${request.errorMessage}`,
    '',
    'Accion sugerida:',
    request.suggestedAction,
    '',
    `Respuesta esperada: OPSLY_HELP_RESOLVED:${id}:<detalle>`,
    '',
  ].join('\n');
  await writeFile(
    requestPath,
    `${JSON.stringify(request, null, JSON_PRETTY_PRINT_INDENT)}\n`,
    'utf-8'
  );
  await writeFile(promptPath, prompt, 'utf-8');
  await writeFile(activePath, `# Solicitud activa de Opsly\n\n${prompt}`, 'utf-8');
  return request;
}

export async function listPendingHelpRequests(): Promise<HelpRequestRecord[]> {
  await ensureHelpRequestStore();
  const files = await readdir(requestsDir());
  const rows = await Promise.all(
    files
      .filter((file) => file.startsWith('help-') && file.endsWith('.json'))
      .map(async (file) => {
        const raw = await readFile(join(requestsDir(), file), 'utf-8');
        return JSON.parse(raw) as HelpRequestRecord;
      })
  );
  return rows.filter((row) => row.status === 'pending' || row.status === 'in_progress');
}

export async function resolveHelpRequestRecord(
  id: string,
  resolution: string,
  assignedTo: HelpAssignedTo
): Promise<HelpRequestRecord> {
  await ensureHelpRequestStore();
  const filePath = join(requestsDir(), `${id}.json`);
  const raw = await readFile(filePath, 'utf-8');
  const row = JSON.parse(raw) as HelpRequestRecord;
  row.status = 'resolved';
  row.resolution = resolution;
  row.assignedTo = assignedTo;
  await writeFile(filePath, `${JSON.stringify(row, null, JSON_PRETTY_PRINT_INDENT)}\n`, 'utf-8');
  return row;
}
