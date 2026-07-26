import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ImprovementRequestRow } from '@/lib/services/improvement-chat.service';
import { createGitHubIssueForImprovementRequest } from '@/lib/services/github-issues.service';

const OLD_ENV = process.env;

function sampleRequest(): ImprovementRequestRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    tenant_id: 'peskids',
    role: 'staff',
    author_email: 'admin@example.com',
    body: 'Familia Perez pidio cambio. Telefono 3001234567. Alumna Laura necesita otro horario.',
    attachments: [],
    category: 'feature',
    priority: 'media',
    ai_summary: 'Permitir cambio de horario desde el admin',
    twenty_task_id: null,
    status: 'analyzed',
    client_status: 'recibido',
    github_issue_url: null,
    github_pr_url: null,
    preview_url: null,
    production_url: null,
    operator_notes: null,
    ready_for_client_at: null,
    published_at: null,
    created_at: '2026-07-26T00:00:00.000Z',
    updated_at: '2026-07-26T00:00:00.000Z',
  } as ImprovementRequestRow;
}

afterEach(() => {
  process.env = OLD_ENV;
  vi.unstubAllGlobals();
});

describe('GitHub issue creation for improvement requests', () => {
  it('creates a sanitized GitHub issue with controlled labels', async () => {
    process.env = {
      ...OLD_ENV,
      PESKIDS_IMPROVEMENT_GITHUB_TOKEN: 'test-token',
      PESKIDS_IMPROVEMENT_GITHUB_REPO: 'cloudsysops/opsly',
      PESKIDS_IMPROVEMENT_GITHUB_LABELS: 'tenant:peskids,client-request',
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        html_url: 'https://github.com/cloudsysops/opsly/issues/123',
        number: 123,
        title: '[Peskids] Permitir cambio de horario desde el admin',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const issue = await createGitHubIssueForImprovementRequest(sampleRequest());

    expect(issue.url).toBe('https://github.com/cloudsysops/opsly/issues/123');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/cloudsysops/opsly/issues',
      expect.objectContaining({ method: 'POST' })
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as { body: string; labels: string[] };
    expect(body.labels).toEqual(['tenant:peskids', 'client-request']);
    expect(body.body).toContain('Request ID');
    expect(body.body).not.toContain('3001234567');
    expect(body.body).not.toContain('Familia Perez');
  });

  it('fails closed when the GitHub token is missing', async () => {
    process.env = {
      ...OLD_ENV,
      PESKIDS_IMPROVEMENT_GITHUB_TOKEN: '',
      PESKIDS_IMPROVEMENT_GITHUB_REPO: 'cloudsysops/opsly',
    };

    await expect(createGitHubIssueForImprovementRequest(sampleRequest())).rejects.toThrow(
      'PESKIDS_IMPROVEMENT_GITHUB_TOKEN is required'
    );
  });
});
