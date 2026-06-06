import Link from 'next/link';
import type { ReactElement } from 'react';
import { BrandLogo } from '@/components/layout/BrandLogo';
import { brandTagline } from '@/lib/brand';
import { navLinks, poweredByStack, siteConfig } from '@/lib/site';

export function SiteFooter(): ReactElement {
  return (
    <footer className="border-t border-icso-border bg-icso-surface/40">
      <div className="icso-container py-12 sm:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <BrandLogo />
            <p className="mt-4 max-w-md text-sm text-icso-muted">{siteConfig.mission}</p>
            <p className="mt-3 text-xs font-semibold tracking-widest text-icso-cyan">
              {brandTagline}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-icso-text">Explore</p>
            <ul className="mt-4 space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-icso-muted hover:text-icso-text"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-icso-text">Contact</p>
            <p className="mt-4 text-sm text-icso-muted">
              <a
                href={`mailto:${siteConfig.contactEmail}`}
                className="hover:text-icso-cyan"
              >
                {siteConfig.contactEmail}
              </a>
            </p>
          </div>
        </div>
        <div className="mt-12 rounded-2xl border border-icso-border bg-icso-bg/80 p-6">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-icso-muted">
            Powered by
          </p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {poweredByStack.map((name) => (
              <li
                key={name}
                className="rounded-full border border-icso-border bg-white/5 px-4 py-2 text-xs font-medium text-icso-text sm:text-sm"
              >
                {name}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-8 text-center text-xs text-icso-muted">
          © {new Date().getFullYear()} {siteConfig.legalName}. AI Powered Growth Operations.
        </p>
      </div>
    </footer>
  );
}
