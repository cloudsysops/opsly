import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Legal · Opsly',
}

const documents = [
  { href: '/legal/terms', title: 'Terms of Service', desc: 'Master agreement governing use of the Opsly platform.' },
  { href: '/legal/privacy', title: 'Privacy Policy', desc: 'How Opsly collects, uses, and protects your data. CCPA included.' },
  { href: '/legal/aup', title: 'Acceptable Use Policy', desc: 'What you may and may not do on the Opsly platform.' },
  { href: '/legal/cookies', title: 'Cookie Policy', desc: 'What cookies and local storage Opsly uses.' },
]

export default function LegalIndexPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <Link href="/" className="mb-8 block text-sm text-zinc-500 hover:text-zinc-300">← Opsly</Link>
        <h1 className="text-3xl font-bold">Legal</h1>
        <p className="mt-2 text-zinc-500">Opsly legal documents. Governing law: State of Delaware, United States.</p>
        <ul className="mt-10 divide-y divide-zinc-800">
          {documents.map((doc) => (
            <li key={doc.href}>
              <Link href={doc.href} className="flex items-center justify-between py-5 hover:opacity-80">
                <div>
                  <p className="font-medium text-white">{doc.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-500">{doc.desc}</p>
                </div>
                <span className="ml-4 text-zinc-600">→</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-12 text-sm text-zinc-600">
          Questions? <a href="mailto:legal@opsly.io" className="text-indigo-400 hover:text-indigo-300">legal@opsly.io</a>
        </p>
      </div>
    </div>
  )
}
