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
    default: "Peskids Franchise | Own a Children's After-School Enrichment Business",
    template: "%s | Peskids Franchise",
  },
  description:
    "Join the Peskids Franchise family. Own a proven children's after-school enrichment business with comprehensive training, support, and a program families trust.",
  keywords: [
    "after-school franchise",
    "children's education franchise",
    "kids enrichment business",
    "Peskids Franchise",
    "franchise opportunity",
    "education business",
  ],
  authors: [{ name: "Peskids Franchise" }],
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
    url: "https://franchise.peskids.com",
    siteName: "Peskids Franchise",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "Peskids Franchise Opportunity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Peskids Franchise | Own a Children's After-School Enrichment Business",
    description:
      "Join the Peskids Franchise family. Own a proven children's after-school enrichment business.",
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Peskids Franchise",
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
            name: "Peskids Franchise",
            url: "https://franchise.peskids.com",
            logo: "https://franchise.peskids.com/images/logo.png",
            description:
              "Join the Peskids Franchise family. Own a proven children's after-school enrichment business with comprehensive training, support, and a program families trust.",
            contactPoint: {
              "@type": "ContactPoint",
              email: "franchising@peskids.com",
              contactType: "sales",
              availableLanguage: "English",
            },
            sameAs: [
              "https://www.peskids.com",
              "https://www.facebook.com/peskids",
              "https://www.instagram.com/peskids",
            ],
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://franchise.peskids.com" },
              { "@type": "ListItem", position: 2, name: "About", item: "https://franchise.peskids.com/about" },
              { "@type": "ListItem", position: 3, name: "Business Model", item: "https://franchise.peskids.com/business-model" },
              { "@type": "ListItem", position: 4, name: "Investment", item: "https://franchise.peskids.com/investment" },
              { "@type": "ListItem", position: 5, name: "Why Us", item: "https://franchise.peskids.com/why-peskids" },
              { "@type": "ListItem", position: 6, name: "Markets", item: "https://franchise.peskids.com/markets" },
              { "@type": "ListItem", position: 7, name: "Testimonials", item: "https://franchise.peskids.com/testimonials" },
              { "@type": "ListItem", position: 8, name: "Steps", item: "https://franchise.peskids.com/steps" },
              { "@type": "ListItem", position: 9, name: "FAQ", item: "https://franchise.peskids.com/faq" },
              { "@type": "ListItem", position: 10, name: "Contact", item: "https://franchise.peskids.com/contact" },
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
