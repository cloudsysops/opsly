import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { type, trigger, rating, comment, pageUrl, metadata } = body;

  // Validate required fields
  if (!type || !trigger || !rating) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
  }

  // For now, only PROSPECT users can submit (they have Prospect records)
  const userRole = session.user.role || "PROSPECT";

  try {
    const feedback = await db.feedback.create({
      data: {
        prospectId: session.user.id,
        type,
        trigger,
        rating,
        comment: comment || null,
        pageUrl: pageUrl || null,
        userRole,
        metadata: metadata || null,
      },
    });

    return NextResponse.json({ success: true, id: feedback.id });
  } catch (error) {
    console.error("Error creating feedback:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
