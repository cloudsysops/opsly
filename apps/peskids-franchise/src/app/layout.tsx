import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Suspense } from "react";
import { VisitorTracker } from "@/components/tracking/VisitorTracker";
import { SessionRecorder } from "@/components/tracking/SessionRecorder";
import { SessionProvider } from "@/components/providers/SessionProvider";
import JsonLd from "@/components/shared/JsonLd";
import "@/styles/globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "Acme Franchise | Own a Children's Chess Education Business",
    template: "%s | Acme Franchise",
  },
  description:
    "Join the Acme Franchise family. Own a proven children's chess education business with comprehensive training, support, and a unique curriculum that makes learning chess fun.",
  keywords: [
    "chess franchise",
    "children's education franchise",
    "chess tutoring business",
    "Acme Franchise",
    "franchise opportunity",
    "education business",
  ],
  authors: [{ name: "Acme Franchise" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://franchising.acmefranchise.com",
    siteName: "Acme Franchise",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Acme Franchise Opportunity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Acme Franchise | Own a Children's Chess Education Business",
    description:
      "Join the Acme Franchise family. Own a proven children's chess education business.",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "STC Franchise",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="antialiased">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Acme Franchise",
            url: "https://franchising.acmefranchise.com",
            logo: "https://franchising.acmefranchise.com/images/logo.png",
            description:
              "Join the Acme Franchise family. Own a proven children's chess education business with comprehensive training, support, and a unique curriculum that makes learning chess fun.",
            contactPoint: {
              "@type": "ContactPoint",
              email: "franchising@acmefranchise.com",
              contactType: "sales",
              availableLanguage: "English",
            },
            sameAs: [
              "https://www.acmefranchise.com",
              "https://www.facebook.com/acmefranchise",
              "https://www.instagram.com/acmefranchise",
            ],
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://franchising.acmefranchise.com" },
              { "@type": "ListItem", position: 2, name: "About", item: "https://franchising.acmefranchise.com/about" },
              { "@type": "ListItem", position: 3, name: "Business Model", item: "https://franchising.acmefranchise.com/business-model" },
              { "@type": "ListItem", position: 4, name: "Investment", item: "https://franchising.acmefranchise.com/investment" },
              { "@type": "ListItem", position: 5, name: "Why Us", item: "https://franchising.acmefranchise.com/why-stc" },
              { "@type": "ListItem", position: 6, name: "Markets", item: "https://franchising.acmefranchise.com/markets" },
              { "@type": "ListItem", position: 7, name: "Testimonials", item: "https://franchising.acmefranchise.com/testimonials" },
              { "@type": "ListItem", position: 8, name: "Steps", item: "https://franchising.acmefranchise.com/steps" },
              { "@type": "ListItem", position: 9, name: "FAQ", item: "https://franchising.acmefranchise.com/faq" },
              { "@type": "ListItem", position: 10, name: "Contact", item: "https://franchising.acmefranchise.com/contact" },
            ],
          }}
        />
        <SessionProvider>
          <Suspense fallback={null}>
            <VisitorTracker />
            <SessionRecorder enabled={false} />
          </Suspense>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
