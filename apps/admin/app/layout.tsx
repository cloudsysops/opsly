import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppChrome } from "@/components/layout/AppChrome";
import { Providers } from "@/components/providers";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Opsly — Admin",
  description: "Opsly platform admin",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body
        className={`${sans.variable} ${mono.variable} min-h-screen font-sans antialiased`}
      >
        <Providers>
          <AppChrome>{children}</AppChrome>
        </Providers>
      </body>
    </html>
  );
}
