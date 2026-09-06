import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Caveat_Brush, JetBrains_Mono, Nunito } from 'next/font/google';
import { AuthSessionRedirect } from '@/components/auth/auth-session-redirect';
import { MetaPixel } from '@/components/analytics/meta-pixel';
import { PeskidsClientShell } from '@/components/chat/peskids-client-shell';
import { CookieBanner } from '@/components/legal/cookie-banner';
import { SwRegister } from '@/components/pwa/sw-register';
import { NativePushRegister } from '@/components/pwa/native-push-register';
import { NativeShell } from '@/components/pwa/native-shell';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
});

const caveatBrush = Caveat_Brush({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-brush',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Peskids — Academia de natación · Medellín',
  description:
    'Academia de natación especializada en bebés y niños. Sede Llanogrande o a domicilio en Medellín y el área metropolitana.',
  manifest: '/manifest.webmanifest',
  themeColor: '#54BFB1',
  icons: {
    icon: [
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/logo-official.png', sizes: '1024x1024', type: 'image/png' },
    ],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): React.ReactElement {
  return (
    <html
      lang="es"
      className={`${nunito.variable} ${caveatBrush.variable} ${jetbrainsMono.variable}`}
    >
      <body className={nunito.className}>
        <AuthSessionRedirect />
        <MetaPixel />
        <PeskidsClientShell>{children}</PeskidsClientShell>
        <CookieBanner />
        <SwRegister />
        <NativeShell />
        <NativePushRegister />
      </body>
    </html>
  );
}
