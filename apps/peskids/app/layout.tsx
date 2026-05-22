import type { Metadata } from 'next'
import { Caveat_Brush, JetBrains_Mono, Nunito } from 'next/font/google'
import { WhatsAppFloatingButton } from '@/components/contact/whatsapp-floating-button'
import './globals.css'

const fontNunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
  weight: ['400', '600', '700', '800', '900'],
})

const fontBrush = Caveat_Brush({
  subsets: ['latin'],
  variable: '--font-brush',
  display: 'swap',
  weight: '400',
})

const fontMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['500', '700'],
})

export const metadata: Metadata = {
  title: 'Peskids — Academia de natación · Medellín',
  description:
    'Natación para niños de 3 meses a 15 años. Sede Llanogrande. Aprenden, se divierten, son Peskids.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <html
      lang="es"
      className={`${fontNunito.variable} ${fontBrush.variable} ${fontMono.variable}`}
    >
      <body>
        {children}
        <WhatsAppFloatingButton />
      </body>
    </html>
  )
}
