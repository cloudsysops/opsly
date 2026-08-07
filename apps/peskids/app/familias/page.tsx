import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { FamilyHomeClient } from '@/components/families/family-home-client'

export const metadata = {
  title: 'Peskids · Mission Control · Familias',
  description:
    'Mission Control del portal de familias: reservas, progreso, mensajes y operación diaria.',
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
