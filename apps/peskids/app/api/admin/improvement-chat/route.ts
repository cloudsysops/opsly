import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import {
  isPeskidsStaffImprovementChatEnabled,
  isPeskidsStaffImprovementChatGithubIssueEnabled,
} from '@/lib/peskids-pro-flags';
import {
  createImprovementMessageSchema,
  updateImprovementRequestSchema,
} from '@/lib/validation/improvement-chat.schema';
import { createGitHubIssueForImprovementRequest } from '@/lib/services/github-issues.service';
import {
  createStaffMessageAndAnalyze,
  getImprovementRequest,
  listImprovementRequests,
  listImprovementMessages,
  updateImprovementRequest,
} from '@/lib/services/improvement-chat.service';

export const dynamic = 'force-dynamic';

function requireAdminSurface(
  auth: Awaited<ReturnType<typeof validateStaffRequest>>
): { ok: true } | { ok: false; status: number; error: string } {
  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error };
  }
  if (auth.method === 'secret') {
    return { ok: true };
  }
  if (auth.user && !isAdminSurfaceUser(auth.user)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  const gate = requireAdminSurface(auth);
  if (!gate.ok) {
    return errorJson(requestId, gate.error, gate.status);
  }

  if (!isPeskidsStaffImprovementChatEnabled()) {
    return errorJson(requestId, 'Improvement chat is not enabled', 404);
  }

  try {
    const [messages, requests] = await Promise.all([
      listImprovementMessages(),
      listImprovementRequests(),
    ]);
    return successJson(requestId, { ok: true, messages, requests });
  } catch (err) {
    console.error('[GET /api/admin/improvement-chat]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list improvement chat messages', 500);
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  const gate = requireAdminSurface(auth);
  if (!gate.ok) {
    return errorJson(requestId, gate.error, gate.status);
  }

  if (!isPeskidsStaffImprovementChatEnabled()) {
    return errorJson(requestId, 'Improvement chat is not enabled', 404);
  }

  try {
    const json = await req.json();
    const parsed = updateImprovementRequestSchema.safeParse(json);
    if (!parsed.success) {
      return errorJson(requestId, parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    let githubIssueUrl = parsed.data.github_issue_url;
    let issueStatus: 'priorizado' | undefined;
    if (parsed.data.create_github_issue) {
      if (!isPeskidsStaffImprovementChatGithubIssueEnabled()) {
        return errorJson(requestId, 'GitHub issue automation is not enabled', 400);
      }

      const existing = await getImprovementRequest(parsed.data.id);
      if (existing.client_status === 'recibido') {
        issueStatus = 'priorizado';
      }
      if (existing.github_issue_url) {
        githubIssueUrl = existing.github_issue_url;
      } else {
        const issue = await createGitHubIssueForImprovementRequest(existing);
        githubIssueUrl = issue.url;
      }
    }

    const request = await updateImprovementRequest({
      ...parsed.data,
      github_issue_url: githubIssueUrl,
      client_status: parsed.data.client_status ?? issueStatus,
    });
    return successJson(requestId, { ok: true, request });
  } catch (err) {
    console.error('[PATCH /api/admin/improvement-chat]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to update improvement request', 500);
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  const gate = requireAdminSurface(auth);
  if (!gate.ok) {
    return errorJson(requestId, gate.error, gate.status);
  }

  if (!isPeskidsStaffImprovementChatEnabled()) {
    return errorJson(requestId, 'Improvement chat is not enabled', 404);
  }

  try {
    const json = await req.json();
    const parsed = createImprovementMessageSchema.safeParse(json);
    if (!parsed.success) {
      return errorJson(requestId, parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const authorEmail = auth.ok && auth.method === 'supabase' ? (auth.user?.email ?? null) : null;

    const { staffMessage, assistantMessage } = await createStaffMessageAndAnalyze({
      body: parsed.data.body,
      authorEmail,
      attachments: parsed.data.attachments,
    });

    return successJson(requestId, { ok: true, staffMessage, assistantMessage }, 201);
  } catch (err) {
    console.error('[POST /api/admin/improvement-chat]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to send message', 500);
  }
}
