'use client';

import { MessageCircle } from 'lucide-react';
import { dispatchOpenPeskidsChat } from '@/lib/peskids-chat-session';

/** En móvil el chat puede quedar debajo del fold; este botón hace scroll y enfoca el panel. */
export function HeroChatCta(): React.ReactElement {
  const goToChat = (): void => {
    const el = document.getElementById('contacto');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const input = el?.querySelector<HTMLInputElement>('input[type="text"]');
    window.setTimeout(() => input?.focus(), 400);
    dispatchOpenPeskidsChat();
  };

  return (
    <button
      type="button"
      onClick={goToChat}
      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-pk-primary px-6 text-sm font-bold text-white shadow-md transition hover:bg-pk-primary/90"
    >
      <MessageCircle className="h-5 w-5" aria-hidden />
      Reservar por chat
    </button>
  );
}
