import type { Metadata } from 'next';
import { AuthSessionRedirect } from '@/components/auth/auth-session-redirect';
import { MoonShell } from '@/components/moon/moon-shell';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Opsly Moon',
  description: 'Opsly Moon — control plane multi-tenant IntCloudSysOps',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen font-sans antialiased">
        <Providers>
          <AuthSessionRedirect />
          <MoonShell>{children}</MoonShell>
        </Providers>
      </body>
    </html>
  );
}
