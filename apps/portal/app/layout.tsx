import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactElement, ReactNode } from "react";
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
  title: "Opsly — Portal de Cliente",
  description: "Portal de cliente Opsly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): ReactElement {
  return (
    <html lang="es" className="dark">
      <body
        className={`${sans.variable} ${mono.variable} min-h-screen bg-ops-bg font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
