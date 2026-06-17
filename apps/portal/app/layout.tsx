import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { AuthSessionRedirect } from '@/components/auth/auth-session-redirect';
import './globals.css';

export const metadata: Metadata = {
  title: 'Opsly — Portal de Cliente',
  description: 'Portal de cliente Opsly',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-ops-bg font-sans antialiased">
        <AuthSessionRedirect />
        {children}
      </body>
    </html>
  );
}
