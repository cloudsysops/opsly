import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { notifyNewInquiry } from "@/lib/email/notifications";
import { updateProspectScore } from "@/lib/scoring/leadScoring";
import { executeSpeedToLead, shouldTriggerSpeedToLead } from "@/lib/automation/speed-to-lead";

export const dynamic = "force-dynamic";

const interestLevelMap: Record<string, string> = {
  ready: "READY_TO_START",
  funding: "ACTIVELY_SEEKING_FUNDING",
  considering: "SERIOUSLY_CONSIDERING",
  exploring: "JUST_EXPLORING",
  future: "GATHERING_INFORMATION",
};

const liquidityMap: Record<string, string> = {
  under_50k: "UNDER_50K",
  "50k_100k": "RANGE_50K_100K",
  "100k_250k": "RANGE_100K_250K",
  "250k_500k": "RANGE_250K_500K",
  over_500k: "OVER_500K",
};

const createProspectSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  preferredTerritory: z.string().optional(),
  interestLevel: z.string(),
  liquidity: z.string().optional(),
  aboutYourself: z.string().optional(),
  referralSource: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  sessionId: z.string().optional().nullable(), // Earl chat session ID for conversation linking
  visitorId: z.string().optional().nullable(), // Visitor ID for analytics linking
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createProspectSchema.parse(body);

    // Check if prospect already exists
    const existingProspect = await db.prospect.findUnique({
      where: { email: data.email },
    });

    if (existingProspect) {
      return NextResponse.json(
        { error: "An inquiry with this email already exists" },
        { status: 400 }
      );
    }

    // Map form values to enum values
    const interestLevel = interestLevelMap[data.interestLevel] || "GATHERING_INFORMATION";
    const liquidity = data.liquidity ? liquidityMap[data.liquidity] : null;

    // Create prospect
    const prospect = await db.prospect.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
        preferredTerritory: data.preferredTerritory || null,
        interestLevel: interestLevel as never,
        liquidity: liquidity as never,
        aboutYourself: data.aboutYourself || null,
        referralSource: data.referralSource || null,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
        pipelineStage: "NEW_INQUIRY",
      },
    });

    // Log the activity
    await db.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        activityType: "FORM_SUBMITTED",
        description: "Submitted franchise inquiry form",
        metadata: {
          source: "website",
          territory: data.preferredTerritory,
        },
      },
    });

    // Link any existing Earl chat conversations from this session
    if (data.sessionId) {
      const linkedConversations = await db.chatConversation.updateMany({
        where: {
          sessionId: data.sessionId,
          prospectId: null, // Only link unlinked conversations
        },
        data: {
          prospectId: prospect.id,
        },
      });

      if (linkedConversations.count > 0) {
        await db.prospectActivity.create({
          data: {
            prospectId: prospect.id,
            activityType: "NOTE_ADDED",
            description: `Linked ${linkedConversations.count} Earl chat conversation(s) from pre-inquiry session`,
            metadata: {
              sessionId: data.sessionId,
              conversationsLinked: linkedConversations.count,
            },
          },
        });
      }
    }

    // Link visitor tracking data to this prospect
    if (data.visitorId) {
      const visitor = await db.visitor.findUnique({
        where: { visitorId: data.visitorId },
      });

      if (visitor) {
        // Link visitor to prospect
        await db.visitor.update({
          where: { id: visitor.id },
          data: { prospectId: prospect.id },
        });

        // Also link any sessions from this visitor
        await db.visitorSession.updateMany({
          where: { visitorId: visitor.id },
          data: { prospectId: prospect.id },
        });

        // Get visitor stats for the activity log
        const visitorStats = await db.visitor.findUnique({
          where: { id: visitor.id },
          select: {
            totalSessions: true,
            totalPageViews: true,
            totalTimeOnSite: true,
            firstSeenAt: true,
          },
        });

        if (visitorStats) {
          await db.prospectActivity.create({
            data: {
              prospectId: prospect.id,
              activityType: "NOTE_ADDED",
              description: `Linked visitor analytics: ${visitorStats.totalSessions} session(s), ${visitorStats.totalPageViews} page views, ${Math.round(visitorStats.totalTimeOnSite / 60)} min on site`,
              metadata: {
                visitorId: data.visitorId,
                ...visitorStats,
              },
            },
          });
        }
      }
    }

    // Calculate and update lead score based on all available data
    const finalScore = await updateProspectScore(prospect.id);

    // Send notification emails (async, don't block response)
    notifyNewInquiry({
      id: prospect.id,
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      phone: prospect.phone,
      preferredTerritory: prospect.preferredTerritory,
      interestLevel: prospect.interestLevel,
      aboutYourself: prospect.aboutYourself,
      prospectScore: finalScore,
    }).catch((err) => console.error("Error sending notifications:", err));

    // Speed-to-lead automation (async, don't block response)
    const prospectWithScore = {
      id: prospect.id,
      firstName: prospect.firstName,
      lastName: prospect.lastName,
      email: prospect.email,
      phone: prospect.phone,
      preferredTerritory: prospect.preferredTerritory,
      interestLevel: prospect.interestLevel,
      prospectScore: finalScore,
    };

    if (shouldTriggerSpeedToLead(prospectWithScore)) {
      executeSpeedToLead(prospectWithScore).catch((err) =>
        console.error("Error in speed-to-lead automation:", err)
      );
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your inquiry. We will be in touch soon.",
      prospectId: prospect.id,
    });
  } catch (error) {
    console.error("Error creating prospect:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // This would be protected in production
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const stage = searchParams.get("stage");
  const search = searchParams.get("search");

  try {
    const where: Record<string, unknown> = {};

    if (stage) {
      where.pipelineStage = stage;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { preferredTerritory: { contains: search, mode: "insensitive" } },
      ];
    }

    const [prospects, total] = await Promise.all([
      db.prospect.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              preWorkSubmissions: true,
              notes: true,
            },
          },
        },
      }),
      db.prospect.count({ where }),
    ]);

    return NextResponse.json({
      prospects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching prospects:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
