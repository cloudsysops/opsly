import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "PROSPECT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    const [changelog, feedbackCount] = await Promise.all([
      db.feedbackChangelog.findMany({
        where: {
          publishedAt: {
            not: null,
            lte: now,
          },
        },
        orderBy: { publishedAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          publishedAt: true,
        },
      }),
      db.feedback.count({
        where: { prospectId: session.user.id },
      }),
    ]);

    return NextResponse.json({ changelog, feedbackCount });
  } catch (error) {
    console.error("Error fetching feedback changelog:", error);
    return NextResponse.json(
      { error: "Failed to fetch changelog" },
      { status: 500 }
    );
  }
}
