import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AuthSessionRedirect } from '@/components/auth/auth-session-redirect';
import { PeskidsClientShell } from '@/components/chat/peskids-client-shell';
import { CookieBanner } from '@/components/legal/cookie-banner';
import { SwRegister } from '@/components/pwa/sw-register';
import { NativePushRegister } from '@/components/pwa/native-push-register';
import './globals.css';

export const metadata: Metadata = {
  title: 'Peskids — Academia de natación · Medellín',
  description:
    'Natación para niños de 3 meses a 15 años. Sede Llanogrande. Aprenden, se divierten, son Peskids.',
  manifest: '/manifest.webmanifest',
  themeColor: '#6366f1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AuthSessionRedirect />
        <PeskidsClientShell>{children}</PeskidsClientShell>
        <CookieBanner />
        <SwRegister />
        <NativePushRegister />
      </body>
    </html>
  );
}
