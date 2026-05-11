import { NextResponse } from 'next/server';
import { chatWithAiGateway, safeGatewayError } from '@/lib/ai-gateway/gateway';
import { createServerSupabase } from '@/lib/supabase/server';

async function isAllowedAdminRequest(): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_ADMIN_PUBLIC_DEMO === 'true') {
    return true;
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    if (!(await isAllowedAdminRequest())) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as unknown;
    const response = await chatWithAiGateway(body);
    return NextResponse.json({
      ok: true,
      provider: response.provider,
      model: response.model,
      content: response.content,
    });
  } catch (error) {
    const safe = safeGatewayError(error);
    return NextResponse.json({ ok: false, error: safe.message }, { status: safe.statusCode });
  }
}
