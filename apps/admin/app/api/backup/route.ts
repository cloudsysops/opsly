import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(): Promise<NextResponse> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    const token = process.env.NEXT_PUBLIC_PLATFORM_ADMIN_TOKEN;
    if (!base || !token) {
      return NextResponse.json(
        { error: "API URL or admin token not configured" },
        { status: 500 },
      );
    }

    const res = await fetch(`${base}/api/backup`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();
    const body = text ? (JSON.parse(text) as unknown) : null;

    if (res.status === 404) {
      return NextResponse.json(
        {
          error:
            "Backup endpoint not implemented on API (POST /api/backup missing).",
        },
        { status: 501 },
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            typeof body === "object" &&
            body !== null &&
            "error" in body &&
            typeof (body as { error: string }).error === "string"
              ? (body as { error: string }).error
              : "Backup request failed",
        },
        { status: res.status },
      );
    }

    return NextResponse.json({ ok: true, result: body });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
