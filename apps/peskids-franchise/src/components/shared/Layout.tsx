"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Simplified navigation - key pages only
const primaryNav = [
  { name: "About", href: "/about" },
  { name: "How It Works", href: "/business-model" },
  { name: "Why Us", href: "/why-stc" },
  { name: "Markets", href: "/markets" },
  { name: "Investment", href: "/investment" },
];

const secondaryNav = [
  { name: "Support", href: "/support" },
  { name: "Steps", href: "/steps" },
  { name: "FAQ", href: "/faq" },
  { name: "Testimonials", href: "/testimonials" },
];

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <nav aria-label="Main navigation" className="mx-auto max-w-7xl">
        {/* Main nav row */}
        <div className="flex items-center justify-between px-4 py-3 lg:px-8">
          {/* Logo - larger and more prominent */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/logo/logo.svg"
              alt="Acme Franchise"
              width={200}
              height={67}
              className="h-14 w-auto"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex lg:items-center lg:gap-x-1">
            {primaryNav.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-brand-purple hover:bg-brand-light/50 rounded-lg transition-all"
              >
                {item.name}
              </Link>
            ))}

            {/* More dropdown */}
            <div className="relative group">
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-brand-purple hover:bg-brand-light/50 rounded-lg transition-all flex items-center gap-1">
                More
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-2">
                  {secondaryNav.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-brand-light hover:text-brand-purple"
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right side CTAs */}
          <div className="hidden lg:flex lg:items-center lg:gap-x-3">
            <Link
              href="/contact"
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-navy to-brand-purple rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open menu</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={cn("lg:hidden", mobileMenuOpen ? "fixed inset-0 z-50" : "hidden")}>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
              <Image
                src="/logo/logo.svg"
                alt="Acme Franchise"
                width={140}
                height={47}
                className="h-10 w-auto"
              />
            </Link>
            <button
              type="button"
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(100vh-80px)]">
            <div className="space-y-1">
              {[...primaryNav, ...secondaryNav].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block px-4 py-3 text-base font-medium text-gray-700 hover:bg-brand-light hover:text-brand-purple rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t space-y-3">
              <Link
                href="/contact"
                className="block w-full px-4 py-3 text-center text-base font-semibold text-white bg-gradient-to-r from-brand-navy to-brand-purple rounded-full"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-brand-navy">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg p-3 inline-block">
              <Image
                src="/logo/logo.svg"
                alt="Acme Franchise"
                width={200}
                height={67}
                className="h-12 w-auto"
              />
            </div>
            <p className="mt-4 text-white/70 max-w-md">
              The world&apos;s most engaging chess education program for children.
              Join our franchise family and make a difference in your community.
            </p>
            <div className="mt-6 flex gap-4">
              <a href="https://www.facebook.com/acmefranchise" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/acmefranchise" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links columns */}
          <div>
            <h4 className="text-white font-semibold mb-4">Explore</h4>
            <ul className="space-y-3">
              {[
                { name: "About Us", href: "/about" },
                { name: "How It Works", href: "/business-model" },
                { name: "Investment", href: "/investment" },
                { name: "Available Markets", href: "/markets" },
                { name: "FAQ", href: "/faq" },
                { name: "Franchise Login", href: "/login" },
              ].map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-white/70 hover:text-white transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-white/70">
              <li>
                <a href="mailto:franchising@acmefranchise.com" className="hover:text-white transition-colors">
                  franchising@acmefranchise.com
                </a>
              </li>
              <li>Westside, TN</li>
              <li className="pt-4">
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 text-brand-cyan hover:text-white transition-colors"
                >
                  Start Your Journey
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Franchise Disclosure Statement */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/10">
          <p className="text-white/40 text-[10px] sm:text-xs leading-relaxed max-w-4xl mx-auto">
            This information is not intended as an offer to sell, or the solicitation of an offer to buy, a franchise.
            It is for information purposes only. An offer is made only by a Franchise Disclosure Document (FDD).
            Currently, the following states regulate the offer and sale of franchises: California, Hawaii, Illinois,
            Indiana, Maryland, Michigan, Minnesota, New York, North Dakota, Rhode Island, South Dakota, Virginia,
            Washington, and Wisconsin. If you are a resident of or want to locate a franchise in one of these states,
            we will not offer you a franchise unless and until we have complied with applicable pre-sale registration
            and disclosure requirements in your state. A copy of our FDD is available upon request and will be
            provided at least 14 calendar days before you sign any agreement or pay any fee.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mt-4 sm:mt-6">
            <p className="text-center text-white/50 text-xs sm:text-sm">
              &copy; {new Date().getFullYear()} Acme Franchise Franchising LLC. All rights reserved.
            </p>
            <div className="flex gap-3 text-white/40 text-xs">
              <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
              <span>|</span>
              <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Use</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
