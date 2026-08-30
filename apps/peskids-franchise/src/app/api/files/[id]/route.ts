import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/files/[id] - Serve an uploaded file from the database
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    const file = await db.uploadedFile.findUnique({
      where: { id },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Return the file with appropriate headers
    const headers = new Headers();
    headers.set("Content-Type", file.mimeType);
    headers.set("Content-Length", file.fileSize.toString());
    headers.set(
      "Content-Disposition",
      `inline; filename="${file.fileName.replace(/"/g, '\\"')}"`
    );
    headers.set("Cache-Control", "private, max-age=86400");

    return new NextResponse(file.data, { headers });
  } catch (error) {
    console.error("Error serving file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
