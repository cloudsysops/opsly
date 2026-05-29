import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import AuthBar from '@/app/components/AuthBar';

export const metadata: Metadata = {
  title: 'Panini Lab — Mundial 2026',
  description: 'Colección de figuritas y analítica del Mundial powered by Opsly',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">
        <nav className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-50">
          <div className="mx-auto max-w-5xl px-4 h-12 flex items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              <Link href="/" className="font-bold text-sm">
                ⚽ Panini Lab
              </Link>
              <Link
                href="/dashboard"
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                Colección
              </Link>
              <Link
                href="/analytics"
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                🏆 Predicciones
              </Link>
            </div>
            <AuthBar />
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
