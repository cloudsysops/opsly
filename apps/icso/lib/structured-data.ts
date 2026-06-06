import { siteConfig } from '@/lib/site';

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.legalName,
    alternateName: siteConfig.shortName,
    url: siteConfig.url,
    logo: `${siteConfig.url}/brand/logo-primary.png`,
    description: siteConfig.description,
    slogan: siteConfig.tagline,
    email: siteConfig.contactEmail,
    sameAs: [],
  };
}

export function localBusinessJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: siteConfig.legalName,
    image: `${siteConfig.url}/brand/logo-square.png`,
    url: siteConfig.url,
    description: siteConfig.description,
    priceRange: '$$',
    areaServed: 'Worldwide',
    serviceType: [
      'AI Automation',
      'CRM Automation',
      'Workflow Automation',
      'Cloud Consulting',
    ],
  };
}
