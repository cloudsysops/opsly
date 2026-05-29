import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Panini Lab — Opsly Demo',
  description: 'Sticker collection assistant powered by Opsly conversational runtime',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
