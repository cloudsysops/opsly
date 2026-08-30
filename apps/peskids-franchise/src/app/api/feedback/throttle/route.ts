import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canShowPrompt, recordPromptShown, recordDismissal } from "@/lib/feedback/throttle";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await canShowPrompt(session.user.id);
  return NextResponse.json({ canPrompt: allowed });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === "shown") {
    await recordPromptShown(session.user.id);
  } else if (action === "dismissed") {
    await recordDismissal(session.user.id);
  }

  return NextResponse.json({ success: true });
}
