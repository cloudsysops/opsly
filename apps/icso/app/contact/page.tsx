import type { Metadata } from 'next';
import { Suspense, type ReactElement } from 'react';
import { ContactForm } from '@/components/marketing/ContactForm';
import { CTASection } from '@/components/marketing/CTASection';
import { fetchCommercialCatalog } from '@/lib/fetch-commercial-catalog';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Book a discovery call with ${siteConfig.name}.`,
};

function ContactFormFallback(): ReactElement {
  return (
    <div className="mt-10 h-64 animate-pulse rounded-lg border border-icso-border bg-white/5" />
  );
}

export default async function ContactPage(): Promise<ReactElement> {
  const catalog = await fetchCommercialCatalog();

  return (
    <>
      <section className="icso-section pt-12" id="discovery">
        <div className="icso-container max-w-3xl">
          <p className="icso-eyebrow">Contact</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">Book a discovery call</h1>
          <p className="mt-6 text-lg text-icso-muted">
            Tell us about your business, current tools, and goals. We respond within one
            business day. Pick a package if you already know the fit.
          </p>
          <Suspense fallback={<ContactFormFallback />}>
            <ContactForm catalog={catalog} />
          </Suspense>
          <p className="mt-8 text-sm text-icso-muted">
            Prefer email directly?{' '}
            <a
              href={`mailto:${siteConfig.contactEmail}`}
              className="font-medium text-icso-cyan hover:underline"
            >
              {siteConfig.contactEmail}
            </a>
          </p>
        </div>
      </section>
      <CTASection />
    </>
  );
}
