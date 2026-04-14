import { tryRoute } from '../../../../lib/api-response';
import { processPortalOnboardingPost } from '../../../../lib/portal-onboarding-handlers';

/**
 * POST /api/portal/onboarding
 *
 * Crea la primera organización (tenant) para el usuario autenticado vía JWT.
 */
export function POST(request: Request): Promise<Response> {
  return tryRoute('POST /api/portal/onboarding', () => processPortalOnboardingPost(request));
}
