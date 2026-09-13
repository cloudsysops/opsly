import Link from 'next/link'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { SwimHomeGame } from '@/components/games/swim-home-game'

export const metadata = {
  title: 'Peki en Casa — Peskids',
  description:
    'Juego educativo Peskids para que niños y padres practiquen coordinación, postura y confianza para natación de forma segura fuera del agua.',
}

export default function GamesPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#F7FBFA]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8 lg:px-10">
        <SwimHomeGame />
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-[#087D78] px-5 font-extrabold text-[#087D78]"
          >
            Volver a Peskids
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
