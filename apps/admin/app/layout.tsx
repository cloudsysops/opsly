import type { Metadata } from 'next';
import { Electrolize, JetBrains_Mono, Orbitron } from 'next/font/google';
import { AppChrome } from '@/components/layout/AppChrome';
import { Providers } from '@/components/providers';
import './globals.css';

const sans = Electrolize({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  weight: ['400'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

const display = Orbitron({
  subsets: ['latin'],
  variable: '--font-ops-display',
  weight: ['500', '700'],
});

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
      <body
        className={`${sans.variable} ${mono.variable} ${display.variable} min-h-screen font-sans antialiased`}
      >
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
