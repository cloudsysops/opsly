import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  listDesigns,
  getDesign,
  refreshAccessToken,
  tokensNeedRefresh,
  getEmbedUrl,
  type CanvaApiError,
} from "@/lib/canva";

export const dynamic = "force-dynamic";

async function getValidAccessToken() {
  const connection = await db.canvaConnection.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!connection) return null;

  if (tokensNeedRefresh(connection.expiresAt.getTime())) {
    try {
      const newTokens = await refreshAccessToken(connection.refreshToken);
      await db.canvaConnection.update({
        where: { id: connection.id },
        data: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: new Date(newTokens.expires_at),
          scope: newTokens.scope,
        },
      });
      return {
        accessToken: newTokens.access_token,
        connection: {
          id: connection.id,
          displayName: connection.displayName,
          canvaUserId: connection.canvaUserId,
          createdAt: connection.createdAt,
        },
      };
    } catch (error) {
      console.error("Failed to refresh Canva token:", error);
      await db.canvaConnection.delete({ where: { id: connection.id } });
      return null;
    }
  }

  return {
    accessToken: connection.accessToken,
    connection: {
      id: connection.id,
      displayName: connection.displayName,
      canvaUserId: connection.canvaUserId,
      createdAt: connection.createdAt,
    },
  };
}

// GET - Connection status, list designs, or get single design
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Check connection status
    if (searchParams.get("status") === "true") {
      const result = await getValidAccessToken();
      if (!result) {
        return NextResponse.json({ connected: false });
      }
      return NextResponse.json({
        connected: true,
        connection: result.connection,
      });
    }

    // List designs
    if (searchParams.get("list") === "true") {
      const result = await getValidAccessToken();
      if (!result) {
        return NextResponse.json(
          {
            error: "Not connected",
            code: "NOT_CONNECTED",
            message: "Canva is not connected. Please connect your account first.",
          } as CanvaApiError,
          { status: 401 }
        );
      }

      const query = searchParams.get("query") || undefined;
      const continuation = searchParams.get("continuation") || undefined;

      const data = await listDesigns(result.accessToken, {
        query,
        continuation,
        limit: 24,
      });

      // Add embed URL to each design
      const designsWithEmbed = data.designs.map((design) => ({
        ...design,
        embedUrl: design.urls?.view_url
          ? getEmbedUrl(design.urls.view_url)
          : null,
      }));

      return NextResponse.json({
        designs: designsWithEmbed,
        continuation: data.continuation,
      });
    }

    // Get single design
    const designId = searchParams.get("designId");
    if (designId) {
      const result = await getValidAccessToken();
      if (!result) {
        return NextResponse.json(
          {
            error: "Not connected",
            code: "NOT_CONNECTED",
            message: "Canva is not connected. Please connect your account first.",
          } as CanvaApiError,
          { status: 401 }
        );
      }

      const design = await getDesign(result.accessToken, designId);
      const embedUrl = design.urls?.view_url
        ? getEmbedUrl(design.urls.view_url)
        : null;

      return NextResponse.json({
        design: { ...design, embedUrl },
      });
    }

    return NextResponse.json(
      { error: "Invalid request. Use ?status=true, ?list=true, or ?designId=xxx" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Canva API error:", error);
    const canvaError = error as CanvaApiError;
    if (canvaError.code) {
      return NextResponse.json(canvaError, {
        status:
          canvaError.code === "UNAUTHORIZED"
            ? 401
            : canvaError.code === "FORBIDDEN"
              ? 403
              : canvaError.code === "NOT_FOUND"
                ? 404
                : canvaError.code === "RATE_LIMITED"
                  ? 429
                  : 500,
      });
    }
    return NextResponse.json(
      { error: "Failed to communicate with Canva API" },
      { status: 500 }
    );
  }
}

// DELETE - Disconnect Canva
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.canvaConnection.deleteMany({});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting Canva:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Canva" },
      { status: 500 }
    );
  }
}
