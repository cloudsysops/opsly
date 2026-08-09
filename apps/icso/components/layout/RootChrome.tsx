'use client';

import type { ReactElement, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';

/** Marketing chrome for public site; Mission Control uses its own shell. */
export function RootChrome({ children }: { children: ReactNode }): ReactElement {
  const pathname = usePathname();
  if (pathname?.startsWith('/mission-control')) {
    return <>{children}</>;
  }
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </>
  );
}
