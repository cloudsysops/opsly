import { db } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cn, formatDateTime } from "@/lib/utils";

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getConversation(id: string) {
  const conversation = await db.chatConversation.findUnique({
    where: { id },
    include: {
      prospect: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          pipelineStage: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return conversation;
}

export default async function ConversationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const conversation = await getConversation(id);

  if (!conversation) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/conversations"
            className="text-sm text-gray-500 hover:text-brand-navy inline-flex items-center gap-1 mb-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Back to Conversations
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
            {conversation.title || "Conversation Details"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Session: {conversation.sessionId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex px-3 py-1.5 text-sm font-medium rounded-full ${
            conversation.prospect
              ? "bg-brand-green/10 text-brand-green"
              : "bg-gray-100 text-gray-600"
          }`}>
            {conversation.prospect ? "Linked to Prospect" : "Anonymous Visitor"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Conversation */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-brand-navy">
                  Conversation Transcript
                </h2>
                <span className="text-sm text-gray-500">
                  {conversation.messages.length} messages
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {conversation.messages.map((message) => {
                  const metadata = message.metadata as { citations?: string[]; confidence?: number } | null;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "p-4 sm:p-6",
                        message.role === "USER" ? "bg-gray-50" : "bg-white"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className={cn(
                          "flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                          message.role === "USER"
                            ? "bg-brand-navy text-white"
                            : "bg-brand-purple text-white"
                        )}>
                          {message.role === "USER" ? "U" : "E"}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Header */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-medium text-brand-navy">
                              {message.role === "USER" ? "Visitor" : "Earl"}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(message.createdAt)}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="text-gray-700 whitespace-pre-wrap break-words">
                            {message.content}
                          </div>

                          {/* RAG Metadata (for assistant messages) */}
                          {message.role === "ASSISTANT" && metadata && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                {metadata.confidence !== undefined && (
                                  <span className={cn(
                                    "px-2 py-1 rounded-full",
                                    metadata.confidence >= 0.8
                                      ? "bg-brand-green/10 text-brand-green"
                                      : metadata.confidence >= 0.5
                                      ? "bg-brand-yellow/10 text-yellow-700"
                                      : "bg-red-100 text-red-700"
                                  )}>
                                    Confidence: {Math.round(metadata.confidence * 100)}%
                                  </span>
                                )}
                                {metadata.citations && metadata.citations.length > 0 && (
                                  <span className="text-gray-400">
                                    {metadata.citations.length} source(s) used
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {conversation.messages.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No messages in this conversation.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Conversation Info */}
          <Card>
            <CardHeader className="border-b">
              <h2 className="text-lg font-semibold text-brand-navy">Details</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(conversation.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(conversation.updatedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Session ID</dt>
                <dd className="mt-1 text-xs text-gray-600 font-mono break-all">
                  {conversation.sessionId}
                </dd>
              </div>
            </CardContent>
          </Card>

          {/* Linked Prospect */}
          {conversation.prospect ? (
            <Card>
              <CardHeader className="border-b">
                <h2 className="text-lg font-semibold text-brand-navy">Linked Prospect</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="font-medium text-brand-navy">
                    {conversation.prospect.firstName} {conversation.prospect.lastName}
                  </div>
                  <div className="text-sm text-gray-500">{conversation.prospect.email}</div>
                  {conversation.prospect.phone && (
                    <div className="text-sm text-gray-500">{conversation.prospect.phone}</div>
                  )}
                </div>
                <div>
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-brand-cyan/10 text-brand-cyan">
                    {conversation.prospect.pipelineStage.replace(/_/g, " ")}
                  </span>
                </div>
                <Link
                  href={`/admin/prospects/${conversation.prospect.id}`}
                  className="inline-flex items-center gap-1 text-sm text-brand-purple hover:text-brand-navy font-medium"
                >
                  View Prospect Profile
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="border-b">
                <h2 className="text-lg font-semibold text-brand-navy">Anonymous Visitor</h2>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  This conversation is not linked to any prospect. If this visitor later submits
                  a contact form from the same browser, the conversation will be automatically linked.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Compliance Note */}
          <Card className="bg-brand-light/30 border-brand-cyan/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 h-8 w-8 bg-brand-cyan/20 rounded-full flex items-center justify-center">
                  <svg className="h-4 w-4 text-brand-cyan" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-brand-navy">Compliance Record</h3>
                  <p className="mt-1 text-xs text-gray-600">
                    This conversation is preserved for compliance auditing. Earl is instructed not to
                    make earnings claims or financial guarantees per FTC franchise regulations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
