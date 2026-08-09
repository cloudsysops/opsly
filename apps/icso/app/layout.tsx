import type { Metadata } from 'next';
import type { ReactElement, ReactNode } from 'react';
import { RootChrome } from '@/components/layout/RootChrome';
import { localBusinessJsonLd, organizationJsonLd } from '@/lib/structured-data';
import { siteConfig } from '@/lib/site';
import './globals.css';

const siteUrl = siteConfig.url;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteConfig.shortName} — AI Automation Agency`,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  keywords: [
    'AI automation',
    'CRM automation',
    'GoHighLevel',
    'workflow automation',
    'IntCloud SysOps',
    'ICSO',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: siteConfig.name,
    title: `${siteConfig.shortName} — AI Automation for Growing Businesses`,
    description: siteConfig.description,
    images: [
      {
        url: '/brand/logo-primary.png',
        width: 512,
        height: 512,
        alt: `${siteConfig.name} logo`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.shortName} — AI Automation Agency`,
    description: siteConfig.description,
    images: ['/brand/logo-primary.png'],
  },
  icons: {
    icon: '/brand/favicon.png',
    apple: '/brand/logo-square.png',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const jsonLd = [organizationJsonLd(), localBusinessJsonLd()];

  return (
    <html lang="en">
      <body className="min-h-screen font-sans">
        {jsonLd.map((data, index) => (
          <script
            key={`jsonld-${index}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
          />
        ))}
        <RootChrome>{children}</RootChrome>
      </body>
    </html>
  );
}
