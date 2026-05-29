import React from 'react';
import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'BBC - Sticker Collection Assistant',
  description: 'Manage your Panini sticker albums with AI assistance',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-indigo-900 flex items-center gap-3">
              <span className="text-4xl">🎟️</span> BBC
            </h1>
            <p className="text-indigo-600 text-sm mt-1">Tu asistente de colecciones Panini</p>
          </header>
          <main className="rounded-lg shadow-xl overflow-hidden">{children}</main>
        </div>
      </body>
    </html>
  );
}
