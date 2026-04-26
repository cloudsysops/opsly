import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSessionAuthToken } from '@/lib/session-auth';

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
    const token = await getSessionAuthToken();
    if (!base) {
      return NextResponse.json({ error: 'API URL not configured' }, { status: 500 });
    }
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const res = await fetch(`${base}/api/backup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const text = await res.text();
    const body = text ? (JSON.parse(text) as unknown) : null;

    if (res.status === 404) {
      return NextResponse.json(
        {
          error:
            'Backup remoto no disponible: el API no expone POST /api/backup. Usa scripts operativos hasta implementar ese endpoint.',
        },
        { status: 501 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            typeof body === 'object' &&
            body !== null &&
            'error' in body &&
            typeof (body as { error: string }).error === 'string'
              ? (body as { error: string }).error
              : 'Backup request failed',
        },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true, result: body });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
