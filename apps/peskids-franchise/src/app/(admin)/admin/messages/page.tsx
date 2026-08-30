import { Metadata } from "next";
import { db } from "@/lib/db";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";
import { MessageList } from "@/components/admin/messages/MessageList";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Communication Hub | FranchiseSTC Admin",
};

async function getRecentMessages() {
  // Get recent emails
  const sentEmails = await db.sentEmail.findMany({
    take: 100,
    orderBy: { sentAt: "desc" },
    include: {
      prospect: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  // Format messages
  const allMessages = sentEmails.map((e) => ({
    id: e.id,
    type: "email" as const,
    prospectId: e.prospect?.id || "",
    prospectName: e.prospect ? `${e.prospect.firstName} ${e.prospect.lastName}` : "Unknown",
    prospectEmail: e.prospect?.email || e.toEmail,
    direction: "outbound" as const,
    subject: e.subject,
    preview: e.bodyPreview,
    status: "sent",
    sentBy: e.sentBy,
    sentAt: e.sentAt,
  }));

  // Get stats
  const emailCount = await db.sentEmail.count();

  return {
    messages: allMessages,
    stats: {
      totalEmails: emailCount,
    },
  };
}

export default async function CommunicationHubPage() {
  const { messages, stats } = await getRecentMessages();

  return (
    <WideContainer className="py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-navy">Communication Hub</h1>
        <p className="text-gray-600 mt-1">All prospect communications in one place</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-cyan/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-navy">{stats.totalEmails}</div>
              <div className="text-sm text-gray-500">Emails Sent</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-navy">{stats.totalEmails}</div>
              <div className="text-sm text-gray-500">Total Messages</div>
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <MessageList initialMessages={messages} />
    </WideContainer>
  );
}
