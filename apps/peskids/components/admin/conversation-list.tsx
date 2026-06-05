'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';

export interface ConversationSummary {
  contact: string;
  contactName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  source: 'whatsapp' | 'instagram' | 'web';
}

interface ConversationsApiResponse {
  conversations?: ConversationSummary[];
  error?: string;
}

interface ConversationListProps {
  selectedContact: string | null;
  onSelect: (contact: string) => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function SourceIcon({ source }: { source: 'whatsapp' | 'instagram' | 'web' }): React.ReactElement {
  if (source === 'whatsapp') {
    return (
      <span
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[7px] font-bold text-white"
        aria-label="WhatsApp"
        title="WhatsApp"
      >
        W
      </span>
    );
  }
  if (source === 'instagram') {
    return (
      <span
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-[7px] font-bold text-white"
        aria-label="Instagram"
        title="Instagram"
      >
        I
      </span>
    );
  }
  // web / platform
  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pk-primary/15 text-[7px] font-bold text-pk-primary"
      aria-label="Plataforma"
      title="Web"
    >
      P
    </span>
  );
}

function ConversationSkeleton(): React.ReactElement {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center gap-3 rounded-xl p-3"
        >
          <div className="h-9 w-9 shrink-0 rounded-full bg-pk-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded bg-pk-muted" />
            <div className="h-2.5 w-full rounded bg-pk-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

const POLL_MS = 15_000;

export function ConversationList({
  selectedContact,
  onSelect,
}: ConversationListProps): React.ReactElement {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversations = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/admin/messages', { credentials: 'include' });
      const data = (await res.json()) as ConversationsApiResponse;
      if (!res.ok) return;
      setConversations(data.conversations ?? []);
    } catch {
      // silently ignore network errors during polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
    intervalRef.current = setInterval(() => {
      void fetchConversations();
    }, POLL_MS);
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchConversations]);

  const filtered = query.trim()
    ? conversations.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.contactName.toLowerCase().includes(q) ||
          c.contact.toLowerCase().includes(q) ||
          c.lastMessage.toLowerCase().includes(q)
        );
      })
    : conversations;

  return (
    <div className="flex h-full flex-col">
      {/* Search */}
      <div className="border-b border-pk-border p-3">
        <div className="flex items-center gap-2 rounded-xl border border-pk-border bg-pk-muted/40 px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-pk-sub" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversación…"
            className="min-w-0 flex-1 bg-transparent text-sm text-pk-ink placeholder:text-pk-sub focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <ConversationSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <MessageCircle className="h-8 w-8 text-pk-muted" aria-hidden />
            <p className="text-sm text-pk-sub">
              {query.trim()
                ? 'Sin resultados para tu búsqueda.'
                : 'No hay mensajes de familias aún.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {filtered.map((conv) => {
              const isSelected = selectedContact === conv.contact;
              const preview =
                conv.lastMessage.length > 40
                  ? `${conv.lastMessage.slice(0, 40)}…`
                  : conv.lastMessage;
              const initials = getInitials(conv.contactName);

              return (
                <li key={conv.contact}>
                  <button
                    type="button"
                    onClick={() => onSelect(conv.contact)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                      isSelected
                        ? 'bg-pk-primary/10 ring-1 ring-pk-primary/20'
                        : 'hover:bg-pk-muted/50'
                    )}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={cn(
                          'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold',
                          isSelected
                            ? 'bg-pk-primary text-white'
                            : 'bg-pk-primary/15 text-pk-primary'
                        )}
                        aria-hidden
                      >
                        {initials}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5">
                        <SourceIcon source={conv.source} />
                      </span>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-1">
                        <p
                          className={cn(
                            'truncate text-sm font-semibold',
                            isSelected ? 'text-pk-primary' : 'text-pk-ink'
                          )}
                        >
                          {conv.contactName}
                        </p>
                        <span className="shrink-0 text-[10px] text-pk-sub">
                          {formatRelativeTime(new Date(conv.lastMessageAt))}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-1">
                        <p className="truncate text-xs text-pk-sub">{preview}</p>
                        {conv.unreadCount > 0 ? (
                          <span className="ml-1 shrink-0 rounded-full bg-pk-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
