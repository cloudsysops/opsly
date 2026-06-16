import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { InstagramFeedSection } from '@/components/marketing/instagram-feed-section';
import { HeroSection } from '@/components/marketing/hero-section';

export default function HomePage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <HeroSection />
      <InstagramFeedSection />
      <SiteFooter />
    </div>
  );
}
