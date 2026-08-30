import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncEmails } from "@/lib/gmail/sync";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const prospectId = body.prospectId as string | undefined;

    // Trigger sync
    const result = await syncEmails(prospectId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error syncing emails:", error);
    return NextResponse.json(
      { error: "An error occurred during sync" },
      { status: 500 }
    );
  }
}
