import type { ReactNode } from 'react'
import Link from 'next/link'

type OpslyLegalPageLayoutProps = {
  title: string
  version: string
  effectiveDate: string
  children: ReactNode
}

export function OpslyLegalPageLayout({
  title,
  version,
  effectiveDate,
  children,
}: OpslyLegalPageLayoutProps): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <nav className="mb-8 flex items-center justify-between text-sm text-zinc-500">
          <Link href="/" className="hover:text-zinc-300">← Opsly</Link>
          <div className="flex gap-4">
            <Link href="/legal/terms" className="hover:text-zinc-300">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-zinc-300">Privacy</Link>
            <Link href="/legal/aup" className="hover:text-zinc-300">AUP</Link>
            <Link href="/legal/cookies" className="hover:text-zinc-300">Cookies</Link>
          </div>
        </nav>

        <header className="mb-10 border-b border-zinc-800 pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Version {version} · Effective {effectiveDate}
          </p>
        </header>

        <div className="space-y-8 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mt-6 [&_h3]:font-medium [&_h3]:text-zinc-200 [&_p]:leading-relaxed [&_p]:text-zinc-400 [&_ul]:space-y-1.5 [&_ul]:text-zinc-400 [&_li]:leading-relaxed [&_ol]:space-y-1.5 [&_ol]:text-zinc-400 [&_a]:text-indigo-400 [&_a:hover]:text-indigo-300 [&_strong]:text-zinc-200 [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:border-zinc-800 [&_th]:pb-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-zinc-400 [&_td]:border-b [&_td]:border-zinc-800/60 [&_td]:py-2.5 [&_td]:text-zinc-400 [&_code]:rounded [&_code]:bg-zinc-900 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-zinc-300">
          {children}
        </div>

        <footer className="mt-16 border-t border-zinc-800 pt-8 text-xs text-zinc-600">
          <p>Opsly · Legal documents available at opsly.io/legal</p>
        </footer>
      </div>
    </div>
  )
}
