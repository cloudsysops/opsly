import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { FamilyHomeClient } from '@/components/families/family-home-client'

export const metadata = {
  title: 'Peskids · Panel familias',
  description:
    'Vista del portal de familias de Peskids: reservas, progreso, mensajes, onboarding y operación.',
}

export default function FamiliesPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader variant="minimal" />
      <main className="flex-1">
        <FamilyHomeClient />
      </main>
      <SiteFooter />
    </div>
  )
}
