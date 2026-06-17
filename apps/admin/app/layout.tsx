import type { Metadata } from 'next';
import { AuthSessionRedirect } from '@/components/auth/auth-session-redirect';
import { AppChrome } from '@/components/layout/AppChrome';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Opsly — Admin',
  description: 'Opsly platform admin',
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
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
