import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { CtaBand } from '@/components/marketing/cta-band'
import { PortalShowcase } from '@/components/marketing/portal-showcase'

export const metadata = {
  title: 'Peskids · Panel familias',
  description:
    'Vista del portal de familias de Peskids: reservas, progreso, mensajes, onboarding y operación.',
}

export default function FamiliesPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <PortalShowcase />
      </main>
      <CtaBand />
      <SiteFooter />
    </div>
  )
}
