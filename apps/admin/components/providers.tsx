'use client';

import { SWRConfig } from 'swr';
import { TooltipProvider } from '@/components/ui/tooltip';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ dedupingInterval: 2000 }}>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
    </SWRConfig>
  );
}
