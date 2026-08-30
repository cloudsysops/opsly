import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";

export const dynamic = "force-dynamic";

// GET: Validate reset token
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const prospect = await db.prospect.findUnique({
    where: { resetToken: token },
    select: {
      id: true,
      firstName: true,
      resetTokenExpiry: true,
    },
  });

  if (!prospect) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (prospect.resetTokenExpiry && prospect.resetTokenExpiry < new Date()) {
    return NextResponse.json({ error: "Token expired" }, { status: 400 });
  }

  return NextResponse.json({
    valid: true,
    firstName: prospect.firstName,
  });
}

// POST: Reset password
export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const prospect = await db.prospect.findUnique({
      where: { resetToken: token },
    });

    if (!prospect) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (prospect.resetTokenExpiry && prospect.resetTokenExpiry < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    // Hash password and update prospect
    const passwordHash = await hash(password, 12);

    await db.prospect.update({
      where: { id: prospect.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // Log activity
    await db.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        activityType: "LOGIN",
        description: "Password reset completed",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
