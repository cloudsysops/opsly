import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reserva — Servicios locales',
  description: 'Formulario público para solicitar una cita o servicio.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-ops-bg text-white antialiased">{children}</body>
    </html>
  );
}
