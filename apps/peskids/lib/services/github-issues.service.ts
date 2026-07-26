import type { ImprovementRequestRow } from '@/lib/services/improvement-chat.service';

type GitHubIssueEnv = {
  enabled: boolean;
  token: string;
  repo: string;
  labels: string[];
  tenantLabel: string;
};

type GitHubIssueResponse = {
  html_url?: unknown;
  number?: unknown;
  title?: unknown;
};

export type CreatedGitHubIssue = {
  url: string;
  number: number;
  title: string;
};

function resolveGitHubIssueEnv(env: NodeJS.ProcessEnv = process.env): GitHubIssueEnv {
  const tenantSlug = (env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
  const tenantLabel = env.OPSLY_IMPROVEMENT_TENANT_LABEL?.trim() || 'Peskids';
  const token =
    env.OPSLY_IMPROVEMENT_GITHUB_TOKEN?.trim() ||
    env.PESKIDS_IMPROVEMENT_GITHUB_TOKEN?.trim() ||
    '';
  const repo =
    env.OPSLY_IMPROVEMENT_GITHUB_REPO?.trim() ||
    env.PESKIDS_IMPROVEMENT_GITHUB_REPO?.trim() ||
    'cloudsysops/opsly';
  const labels = (
    env.OPSLY_IMPROVEMENT_GITHUB_LABELS ??
    env.PESKIDS_IMPROVEMENT_GITHUB_LABELS ??
    `tenant:${tenantSlug},client-request,opsly-improvement`
  )
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 10);

  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error('PESKIDS_IMPROVEMENT_GITHUB_REPO must be owner/repo');
  }

  return {
    enabled: token.length > 0,
    token,
    repo,
    labels,
    tenantLabel,
  };
}

function titleForRequest(request: ImprovementRequestRow, tenantLabel: string): string {
  const summary = request.ai_summary?.trim() || request.body.trim().split('\n')[0] || `Mejora ${tenantLabel}`;
  return `[${tenantLabel}] ${summary}`.slice(0, 120);
}

function bodyForRequest(request: ImprovementRequestRow, tenantLabel: string): string {
  return [
    `## Solicitud ${tenantLabel}`,
    '',
    'Solicitud creada desde el modulo Opsly Improvement Tracker.',
    '',
    `- Request ID: \`${request.id}\``,
    `- Tenant: \`${request.tenant_id}\``,
    `- Estado cliente: \`${request.client_status}\``,
    `- Categoria: \`${request.category ?? 'sin_clasificar'}\``,
    `- Prioridad: \`${request.priority ?? 'sin_prioridad'}\``,
    `- Twenty task: \`${request.twenty_task_id ?? 'no_creada'}\``,
    '',
    '## Resumen',
    '',
    request.ai_summary?.trim() || 'Sin resumen IA todavia. Revisar el request interno en Peskids admin.',
    '',
    '## Privacidad',
    '',
    'No copiar datos personales de clientes, usuarios, familias, alumnos o staff en este issue. El detalle completo vive en el admin del tenant.',
  ].join('\n');
}

function parseCreatedIssue(payload: GitHubIssueResponse): CreatedGitHubIssue {
  if (
    typeof payload.html_url !== 'string' ||
    typeof payload.number !== 'number' ||
    typeof payload.title !== 'string'
  ) {
    throw new Error('GitHub returned an unexpected issue response');
  }

  return {
    url: payload.html_url,
    number: payload.number,
    title: payload.title,
  };
}

export async function createGitHubIssueForImprovementRequest(
  request: ImprovementRequestRow
): Promise<CreatedGitHubIssue> {
  const env = resolveGitHubIssueEnv();
  if (!env.enabled) {
    throw new Error('OPSLY_IMPROVEMENT_GITHUB_TOKEN is required to create GitHub issues');
  }

  const res = await fetch(`https://api.github.com/repos/${env.repo}/issues`, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${env.token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'opsly-peskids-improvement-tracker',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      title: titleForRequest(request, env.tenantLabel),
      body: bodyForRequest(request, env.tenantLabel),
      labels: env.labels,
    }),
  });

  const payload = (await res.json().catch(() => ({}))) as GitHubIssueResponse & {
    message?: string;
  };

  if (!res.ok) {
    throw new Error(payload.message || `GitHub issue creation failed with status ${res.status}`);
  }

  return parseCreatedIssue(payload);
}
