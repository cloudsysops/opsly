import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Equipa — Reserva',
  description: 'Solicitud de servicio de limpieza de equipos y upgrade',
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
