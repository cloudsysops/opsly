'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState, type ReactElement } from 'react';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { navLinks } from '@/lib/site';

export function SiteHeader(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-icso-border/80 bg-icso-bg/90 backdrop-blur-md">
      <div className="icso-container flex h-16 items-center justify-between sm:h-18">
        <BrandLogo />
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-icso-muted transition hover:text-icso-text"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block">
          <Link href="/contact#discovery" className="icso-btn-primary text-sm">
            Book a Discovery Call
          </Link>
        </div>
        <button
          type="button"
          className="rounded-lg p-2 text-icso-text md:hidden"
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open ? (
        <div className="border-t border-icso-border bg-icso-bg px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3" aria-label="Mobile">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-icso-muted"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/contact#discovery"
              className="icso-btn-primary mt-2 text-center"
              onClick={() => setOpen(false)}
            >
              Book a Discovery Call
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
