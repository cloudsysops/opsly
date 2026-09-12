import { requireAdminAccess } from '../../../../../lib/auth';
import { getEngineeringPortfolioSnapshot } from '../../../../../lib/engineering-portfolio';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth) return auth;
  return Response.json(getEngineeringPortfolioSnapshot());
}
