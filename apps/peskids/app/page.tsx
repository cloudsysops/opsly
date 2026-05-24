import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { CtaBand } from '@/components/marketing/cta-band'
import { OpslyFeatureGrid } from '@/components/marketing/feature-grid'
import { HeroSection } from '@/components/marketing/hero-section'
import { LevelsSection } from '@/components/marketing/levels-section'

export default function HomePage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <HeroSection />

      <LevelsSection />
      <OpslyFeatureGrid />
      <CtaBand />
      <SiteFooter />
    </div>
  )
}
