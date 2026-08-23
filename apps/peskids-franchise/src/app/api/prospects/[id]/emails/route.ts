import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "REVIEWER")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");

    const where: { prospectId: string; gmailThreadId?: string } = { prospectId: id };
    if (threadId) {
      where.gmailThreadId = threadId;
    }

    const emails = await db.crmEmail.findMany({
      where,
      orderBy: { sentAt: "desc" },
    });

    return NextResponse.json(emails);
  } catch (error) {
    console.error("Error fetching emails:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
