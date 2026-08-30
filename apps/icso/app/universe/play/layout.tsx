import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Opsly Universe — The First Portal',
  description: 'A short, safe exploration through NEXUS and the First Portal.',
  robots: { index: false, follow: false },
};

export default function UniversePlayLayout({ children }: { children: ReactNode }): ReactElement {
  return children as ReactElement;
}
