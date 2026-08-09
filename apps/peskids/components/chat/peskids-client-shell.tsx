'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PeskidsChatProvider } from '@/components/chat/peskids-chat-provider';
import type { PeskidsChatMode } from '@/lib/peskids-intake-messages';

/**
 * Public shell without floating WhatsApp FAB or in-app chat dock.
 * Post-form handoff is copy + WhatsApp/email on the thanks screen only.
 */
export function PeskidsClientShell({ children }: { children: ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const mode: PeskidsChatMode = pathname?.startsWith('/familias') ? 'support' : 'admissions';

  return <PeskidsChatProvider mode={mode}>{children}</PeskidsChatProvider>;
}
