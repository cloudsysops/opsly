import type { ImprovementRequestRow } from '@/lib/services/improvement-chat.service';

type GitHubIssueEnv = {
  enabled: boolean;
  token: string;
  repo: string;
  labels: string[];
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
  const token = env.PESKIDS_IMPROVEMENT_GITHUB_TOKEN?.trim() ?? '';
  const repo = env.PESKIDS_IMPROVEMENT_GITHUB_REPO?.trim() || 'cloudsysops/opsly';
  const labels = (env.PESKIDS_IMPROVEMENT_GITHUB_LABELS ?? 'tenant:peskids,client-request')
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
  };
}

function titleForRequest(request: ImprovementRequestRow): string {
  const summary = request.ai_summary?.trim() || request.body.trim().split('\n')[0] || 'Mejora Peskids';
  return `[Peskids] ${summary}`.slice(0, 120);
}

function bodyForRequest(request: ImprovementRequestRow): string {
  return [
    '## Solicitud Peskids',
    '',
    'Solicitud creada desde el tablero interno de mejoras de Peskids.',
    '',
    `- Request ID: \`${request.id}\``,
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
    'No copiar datos personales de familias, alumnos o profesores en este issue. El detalle completo vive en Peskids admin.',
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
    throw new Error('PESKIDS_IMPROVEMENT_GITHUB_TOKEN is required to create GitHub issues');
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
      title: titleForRequest(request),
      body: bodyForRequest(request),
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
