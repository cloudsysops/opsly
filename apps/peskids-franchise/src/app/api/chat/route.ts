import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateResponse, type ChatMessage } from "@/lib/rag/generation";
import { z } from "zod";

export const dynamic = "force-dynamic";

const chatSchema = z.object({
  message: z.string().min(1, "Message is required"),
  conversationId: z.string().optional().nullable(),
  sessionId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId, sessionId } = chatSchema.parse(body);

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await db.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    }

    if (!conversation) {
      conversation = await db.chatConversation.create({
        data: {
          sessionId,
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
        },
        include: {
          messages: true,
        },
      });
    }

    // Build conversation history
    const history: ChatMessage[] = conversation.messages.map((msg) => ({
      role: msg.role === "USER" ? "user" : "assistant",
      content: msg.content,
    }));

    // Save user message
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
      },
    });

    // Generate response
    const { response, citations, confidence } = await generateResponse(
      message,
      history
    );

    // Save assistant response
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: response,
        metadata: {
          citations,
          confidence,
        },
      },
    });

    // Update conversation timestamp
    await db.chatConversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    // Check if we should prompt for lead capture (after 3+ messages)
    const messageCount = history.length + 1;
    const shouldPromptCapture = messageCount >= 3 && !conversation.prospectId;

    return NextResponse.json({
      response,
      conversationId: conversation.id,
      citations,
      confidence,
      shouldPromptCapture,
    });
  } catch (error) {
    // Safe error logging - avoid Node inspect issues with Prisma errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Chat error:", errorMessage);

    if (error instanceof z.ZodError) {
      console.error("Zod validation error:", JSON.stringify(error.errors));
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// Link conversation to prospect
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, prospectId, email } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID required" },
        { status: 400 }
      );
    }

    let prospect;

    if (prospectId) {
      // Link to existing prospect
      prospect = await db.prospect.findUnique({
        where: { id: prospectId },
      });
    } else if (email) {
      // Find or note prospect by email
      prospect = await db.prospect.findUnique({
        where: { email },
      });
    }

    if (prospect) {
      await db.chatConversation.update({
        where: { id: conversationId },
        data: { prospectId: prospect.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error linking conversation:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
