import type { ReactNode } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

type LegalPageLayoutProps = {
  title: string;
  version: string;
  effectiveDate: string;
  policyId: string;
  children: ReactNode;
};

export function LegalPageLayout({
  title,
  version,
  effectiveDate,
  policyId,
  children,
}: LegalPageLayoutProps): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-pk-snow">
      <SiteHeader />
      <main className="flex-1 py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-8">
          <nav className="mb-6 text-sm text-pk-sub">
            <Link href="/" className="hover:text-pk-primary">
              Inicio
            </Link>
            {' · '}
            <span>Legal</span>
          </nav>
          <header className="mb-8 border-b border-pk-border pb-6">
            <h1 className="text-2xl font-bold text-pk-ink sm:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-pk-sub">
              Versión {version} · Vigente desde {effectiveDate} ·{' '}
              <code className="font-mono text-xs">{policyId}</code>
            </p>
          </header>
          <div className="prose prose-pk max-w-none [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-pk-ink [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-pk-ink [&_p]:text-pk-sub [&_p]:leading-relaxed [&_ul]:text-pk-sub [&_li]:my-1 [&_table]:w-full [&_table]:text-sm [&_th]:bg-pk-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border-t [&_td]:border-pk-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-pk-sub [&_a]:text-pk-primary [&_a]:underline-offset-2 [&_a:hover]:underline [&_ol]:text-pk-sub [&_ol]:space-y-1 [&_section]:mb-8 [&_code]:rounded [&_code]:bg-pk-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
