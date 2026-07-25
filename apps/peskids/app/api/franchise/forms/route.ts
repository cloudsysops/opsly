import { NextRequest } from 'next/server';
import { validateFamilyRequest } from '@/lib/family-auth';
import {
  getFranchiseForms,
  getFranchiseFormResponses,
  getFranchisePrimaryForm,
} from '@/lib/services/franchise-forms.service';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

/**
 * GET /api/franchise/forms
 * Get forms available to this franchise
 * Query params:
 *   - responses=true: Also include form responses
 *   - primary=true: Get only primary form
 */
export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);

  try {
    const auth = await validateFamilyRequest(req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const franchiseTenantId = auth.user.id;
    const url = new URL(req.url);
    const includeResponses = url.searchParams.get('responses') === 'true';
    const primaryOnly = url.searchParams.get('primary') === 'true';

    if (primaryOnly) {
      // Get only primary form
      const primaryResult = await getFranchisePrimaryForm(franchiseTenantId);
      if (!primaryResult.success) {
        return errorJson(requestId, primaryResult.error || 'No forms configured', 404);
      }

      return successJson(requestId, {
        primary: primaryResult.form,
      });
    }

    // Get all forms for franchise
    const formsResult = await getFranchiseForms(franchiseTenantId);
    if (!formsResult.success) {
      return errorJson(requestId, formsResult.error || 'Failed to load forms', 500);
    }

    const response: any = {
      forms: formsResult.forms || [],
    };

    // Optionally include responses
    if (includeResponses) {
      const responsesResult = await getFranchiseFormResponses(franchiseTenantId);
      response.responses = responsesResult.success ? responsesResult.responses || [] : [];
    }

    return successJson(requestId, response);
  } catch (error) {
    console.error('[GET /api/franchise/forms]', error);
    return errorJson(requestId, 'Failed to fetch forms', 500);
  }
}
