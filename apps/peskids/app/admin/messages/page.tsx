'use client';

import { useState } from 'react';
import { MessageCircle, ChevronLeft } from 'lucide-react';
import { AdminShell } from '@/components/admin/admin-shell';
import { ConversationList } from '@/components/admin/conversation-list';
import { MessageThread } from '@/components/admin/message-thread';
import { cn } from '@/lib/utils';

export default function AdminMessagesPage(): React.ReactElement {
  const [selectedContact, setSelectedContact] = useState<string | null>(null);

  // On mobile: when a conversation is selected we show the thread; when none is
  // selected we show the list. On desktop both panels are always visible.

  const handleSelect = (contact: string): void => {
    setSelectedContact(contact);
  };

  const handleBack = (): void => {
    setSelectedContact(null);
  };

  return (
    <AdminShell lastUpdated={null}>
      <div className="flex h-[calc(100vh-72px)] overflow-hidden rounded-2xl border border-pk-border bg-pk-surface shadow-card">
        {/* Left panel: conversation list */}
        <aside
          className={cn(
            'flex flex-col border-r border-pk-border',
            // Mobile: full width when no contact selected, hidden when one is selected
            selectedContact !== null ? 'hidden md:flex md:w-80 xl:w-96' : 'flex w-full md:w-80 xl:w-96'
          )}
        >
          {/* Panel header */}
          <header className="flex items-center gap-2 border-b border-pk-border px-4 py-4">
            <MessageCircle className="h-5 w-5 shrink-0 text-pk-primary" aria-hidden />
            <h1 className="text-base font-semibold text-pk-ink">Mensajes de familias</h1>
          </header>

          <ConversationList selectedContact={selectedContact} onSelect={handleSelect} />
        </aside>

        {/* Right panel: thread */}
        <main
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            // Mobile: full width when contact selected, hidden when not
            selectedContact !== null ? 'flex' : 'hidden md:flex'
          )}
        >
          {selectedContact !== null ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 border-b border-pk-border px-4 py-3 text-sm text-pk-primary"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Volver a mensajes
                </button>
              </div>
              <MessageThread contact={selectedContact} />
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pk-primary/10">
                <MessageCircle className="h-8 w-8 text-pk-primary" aria-hidden />
              </div>
              <h2 className="text-base font-semibold text-pk-ink">
                Selecciona una conversación
              </h2>
              <p className="max-w-xs text-sm text-pk-sub">
                Elige una conversación de la lista para ver el hilo completo y responder.
              </p>
            </div>
          )}
        </main>
      </div>
    </AdminShell>
  );
}
