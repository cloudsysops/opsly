import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Peskids - Manage Your After-School Program',
  description: 'A simple platform to organize leads, track feedback, and manage follow-ups for after-school programs.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  )
}
