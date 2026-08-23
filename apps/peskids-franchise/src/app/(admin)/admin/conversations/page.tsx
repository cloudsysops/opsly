import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/shared/Card";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const dynamic = 'force-dynamic';

interface SearchParams {
  filter?: string;
  search?: string;
  page?: string;
}

type ConversationFilter = "all" | "linked" | "anonymous";

async function getConversations(params: SearchParams) {
  const page = parseInt(params.page || "1");
  const limit = 20;
  const filter = (params.filter || "all") as ConversationFilter;
  const where: Record<string, unknown> = {};

  // Filter by linked/anonymous status
  if (filter === "linked") {
    where.prospectId = { not: null };
  } else if (filter === "anonymous") {
    where.prospectId = null;
  }

  // Search in conversation title or session ID
  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { sessionId: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [conversations, total, counts] = await Promise.all([
    db.chatConversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        prospect: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "asc" },
          select: {
            content: true,
            role: true,
          },
        },
      },
    }),
    db.chatConversation.count({ where }),
    // Get counts for filter tabs
    Promise.all([
      db.chatConversation.count(),
      db.chatConversation.count({ where: { prospectId: { not: null } } }),
      db.chatConversation.count({ where: { prospectId: null } }),
    ]),
  ]);

  return {
    conversations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    counts: {
      all: counts[0],
      linked: counts[1],
      anonymous: counts[2],
    },
  };
}

export default async function ConversationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { conversations, pagination, counts } = await getConversations(params);
  const currentFilter = (params.filter || "all") as ConversationFilter;

  const filterTabs: { key: ConversationFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: counts.all },
    { key: "linked", label: "Linked to Prospect", count: counts.linked },
    { key: "anonymous", label: "Anonymous", count: counts.anonymous },
  ];

  return (
    <WideContainer className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">Earl Conversations</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            View all chatbot conversations for compliance and audit purposes
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/conversations${tab.key !== "all" ? `?filter=${tab.key}` : ""}${
              params.search ? `&search=${params.search}` : ""
            }`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentFilter === tab.key
                ? "bg-brand-navy text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              currentFilter === tab.key
                ? "bg-white/20"
                : "bg-gray-200"
            }`}>
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="py-4">
          <form className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input type="hidden" name="filter" value={currentFilter} />
            <div className="flex-1">
              <input
                type="text"
                name="search"
                placeholder="Search conversations..."
                defaultValue={params.search}
                className="w-full px-4 py-2.5 sm:py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent text-base sm:text-sm"
              />
            </div>
            <div className="flex gap-3 sm:gap-4">
              <button
                type="submit"
                className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors text-base sm:text-sm font-medium"
              >
                Search
              </button>
              {params.search && (
                <Link
                  href={`/admin/conversations${currentFilter !== "all" ? `?filter=${currentFilter}` : ""}`}
                  className="px-4 py-2.5 sm:py-2 text-gray-600 hover:text-brand-navy flex items-center"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card>
        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-100">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/admin/conversations/${conversation.id}`}
              className="block p-4 hover:bg-gray-50 active:bg-gray-100"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-brand-navy line-clamp-1">
                    {conversation.title || "Untitled Conversation"}
                  </div>
                  {conversation.messages[0] && (
                    <div className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {conversation.messages[0].content}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    conversation.prospect
                      ? "bg-brand-green/10 text-brand-green"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {conversation.prospect ? "Linked" : "Anonymous"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {conversation._count.messages} msgs
                  </span>
                </div>
              </div>
              {conversation.prospect && (
                <div className="mt-2 text-sm text-brand-purple">
                  → {conversation.prospect.firstName} {conversation.prospect.lastName}
                </div>
              )}
              <div className="mt-2 text-xs text-gray-400">
                {formatDate(conversation.updatedAt)}
              </div>
            </Link>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Conversation
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Prospect
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {conversations.map((conversation) => (
                <tr key={conversation.id} className="hover:bg-gray-50">
                  <td className="px-4 lg:px-6 py-4">
                    <div>
                      <Link
                        href={`/admin/conversations/${conversation.id}`}
                        className="font-medium text-brand-navy hover:text-brand-purple line-clamp-1"
                      >
                        {conversation.title || "Untitled Conversation"}
                      </Link>
                      {conversation.messages[0] && (
                        <div className="text-sm text-gray-500 line-clamp-1 mt-1 max-w-[300px]">
                          {conversation.messages[0].content}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      conversation.prospect
                        ? "bg-brand-green/10 text-brand-green"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {conversation.prospect ? "Linked" : "Anonymous"}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    {conversation.prospect ? (
                      <Link
                        href={`/admin/prospects/${conversation.prospect.id}`}
                        className="text-sm text-brand-purple hover:text-brand-navy"
                      >
                        {conversation.prospect.firstName} {conversation.prospect.lastName}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 lg:px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {conversation._count.messages}
                    </span>
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-sm text-gray-500">
                    {formatDate(conversation.updatedAt)}
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-right">
                    <Link
                      href={`/admin/conversations/${conversation.id}`}
                      className="text-brand-purple hover:text-brand-navy text-sm font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 sm:px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-gray-500 text-center sm:text-left">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
              {pagination.total}
            </div>
            <div className="flex gap-2">
              {pagination.page > 1 && (
                <Link
                  href={`/admin/conversations?page=${pagination.page - 1}${
                    currentFilter !== "all" ? `&filter=${currentFilter}` : ""
                  }${params.search ? `&search=${params.search}` : ""}`}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Previous
                </Link>
              )}
              {pagination.page < pagination.totalPages && (
                <Link
                  href={`/admin/conversations?page=${pagination.page + 1}${
                    currentFilter !== "all" ? `&filter=${currentFilter}` : ""
                  }${params.search ? `&search=${params.search}` : ""}`}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}

        {conversations.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No conversations found matching your criteria.
          </div>
        )}
      </Card>
    </WideContainer>
  );
}
