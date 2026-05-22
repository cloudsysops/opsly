import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { LeadCaptureForm } from '@/components/forms/lead-capture-form'
import { CtaBand } from '@/components/marketing/cta-band'
import { OpslyFeatureGrid } from '@/components/marketing/feature-grid'
import { HeroSection } from '@/components/marketing/hero-section'
import { InstagramFeedSection } from '@/components/marketing/instagram-feed-section'
import { LevelsSection } from '@/components/marketing/levels-section'

export default function HomePage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <HeroSection />

      <section className="relative z-20 mx-auto w-full max-w-lg px-4 pb-4 sm:px-8 lg:-mt-12 lg:max-w-md lg:px-14">
        <LeadCaptureForm />
      </section>

      <LevelsSection />
      <InstagramFeedSection />
      <OpslyFeatureGrid />
      <CtaBand />
      <SiteFooter />
    </div>
  )
}
