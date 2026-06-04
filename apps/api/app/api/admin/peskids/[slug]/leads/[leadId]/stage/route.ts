import { z } from 'zod';
import { requireAdminAccess } from '../../../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../../../lib/constants';
import { PESKIDS_PIPELINE_STAGES } from '../../../../../../../../lib/peskids/ghl-contract';
import { updateLeadStage } from '../../../../../../../../lib/peskids/sales-pipeline';
import { parseJsonBody, jsonError } from '../../../../../../../../lib/api-response';
import { formatZodError } from '../../../../../../../../lib/validation';

const stageUpdateSchema = z.object({
  stage: z.enum(PESKIDS_PIPELINE_STAGES),
});

type Params = { slug: string; leadId: string };

export async function PATCH(
  request: Request,
  context: { params: Promise<Params> }
): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth !== null) {
    return auth;
  }

  const { slug, leadId } = await context.params;
  if (slug !== 'peskids') {
    return jsonError('Not found', HTTP_STATUS.NOT_FOUND);
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = stageUpdateSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return jsonError(
      `Invalid body: ${formatZodError(parsed.error)}`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  const result = await updateLeadStage(slug, leadId, parsed.data.stage);

  if (result.ok) {
    return Response.json({ ok: true, lead: result.lead }, { status: HTTP_STATUS.OK });
  }

  if (result.code === 'NOT_FOUND') {
    return jsonError(result.error, HTTP_STATUS.NOT_FOUND);
  }

  if (result.code === 'NO_CHANGE') {
    return jsonError(result.error, HTTP_STATUS.CONFLICT);
  }

  return jsonError(result.error, HTTP_STATUS.INTERNAL_ERROR);
}
