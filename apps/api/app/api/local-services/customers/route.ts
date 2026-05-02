import { runLocalServicesBusinessRoute } from '../../../../lib/local-services-business-routes';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: Request): Promise<Response> {
  return runLocalServicesBusinessRoute('customers', request);
}

export function POST(request: Request): Promise<Response> {
  return runLocalServicesBusinessRoute('customers', request);
}
