import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Opsly — Agentes IA para tu empresa',
  description:
    'Plataforma multi-tenant de automatización con n8n y agentes IA. Despliega tu stack de IA en minutos, sin configuraciones complicadas.',
  openGraph: {
    title: 'Opsly — Agentes IA para tu empresa',
    description:
      'Automatización empresarial con n8n, Uptime Kuma y LLM Gateway. Facturación por uso. SLA garantizado.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className="bg-[#0a0a0a] text-white antialiased">{children}</body>
    </html>
  );
}
