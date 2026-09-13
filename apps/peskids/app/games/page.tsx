import Link from 'next/link'
import { Gamepad2, Joystick, ShieldCheck, Sparkles } from 'lucide-react'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

export const metadata = {
  title: 'Peskids Games — Astral Arena y laboratorio retro',
  description:
    'Zona de juegos Peskids para probar Astral Arena, prototipos retro originales y el Emulator Lab con contenido legal.',
}

const launchers = [
  {
    title: 'Astral Arena',
    description:
      'Entra al juego principal y prueba la aventura de Arena y Brissa. Recomendado en horizontal desde el celular.',
    href: '/astral-arena/',
    cta: 'Jugar ahora',
    icon: Sparkles,
    accent: 'from-[#7155FF] to-[#E65AAE]',
  },
  {
    title: 'Retro Originals',
    description:
      'Minijuegos originales inspirados en mecánicas clásicas. Juega, vota y guarda ideas para nuevos prototipos Astral.',
    href: '/astral-arena/games/',
    cta: 'Explorar juegos',
    icon: Gamepad2,
    accent: 'from-[#2DB7B0] to-[#0A7894]',
  },
  {
    title: 'Emulator Lab',
    description:
      'Prueba homebrew, dominio público o archivos tuyos que tengas derecho a usar. Los archivos se abren localmente en el navegador.',
    href: '/astral-arena/games/emulator.html',
    cta: 'Abrir emulador',
    icon: Joystick,
    accent: 'from-[#F4A261] to-[#E76F51]',
  },
] as const

export default function GamesPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-[#F7FBFA] text-[#063B4A]">
      <SiteHeader />

      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 sm:px-8 lg:px-14">
        <section className="overflow-hidden rounded-[32px] bg-[#061A2B] px-6 py-8 text-white shadow-xl sm:px-10 sm:py-12">
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold tracking-[0.18em] text-[#BFEFEB]">
              PESKIDS GAMES
            </div>
            <h1 className="text-4xl font-black leading-tight sm:text-5xl">
              Elige un juego y empieza a probar.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
              Una entrada simple para jugar desde celular, tablet o computador. Empezamos con
              Astral Arena y Retro Originals y vamos agregando nuevos juegos a medida que los
              probamos.
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-3" aria-label="Juegos disponibles">
          {launchers.map(({ title, description, href, cta, icon: Icon, accent }) => (
            <article
              key={title}
              className="flex min-h-[320px] flex-col rounded-[28px] border border-[#DDEBE8] bg-white p-5 shadow-sm"
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-sm`}
              >
                <Icon className="h-7 w-7" aria-hidden />
              </div>
              <h2 className="mt-5 text-2xl font-black text-[#063B4A]">{title}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-[#47656D]">{description}</p>
              <a
                href={href}
                className="mt-6 inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#063B4A] px-5 text-base font-extrabold text-white transition hover:bg-[#0A5C70] focus:outline-none focus:ring-4 focus:ring-[#54BFB1]/30"
              >
                {cta}
              </a>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[28px] border border-[#DDEBE8] bg-white p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E9F8F5] text-[#087D78]">
              <ShieldCheck className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-black">Retro legal y seguro</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#47656D]">
                El laboratorio no incluye ROMs comerciales. Usa únicamente homebrew, dominio
                público o copias que tengas derecho a utilizar. Los prototipos de Peskids usan
                código, nombres y visuales propios.
              </p>
              <a
                href="/astral-arena/games/licenses.html"
                className="mt-4 inline-flex min-h-11 items-center font-extrabold text-[#087D78] underline decoration-2 underline-offset-4"
              >
                Ver política de licencias
              </a>
            </div>
          </div>
        </section>

        <section className="mt-8 flex flex-col gap-3 rounded-[28px] bg-[#E9F8F5] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div>
            <h2 className="text-xl font-black">¿Quieres volver a Peskids?</h2>
            <p className="mt-1 text-sm text-[#47656D]">
              Puedes regresar a la academia sin perder las ideas guardadas en el navegador.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border-2 border-[#087D78] px-5 font-extrabold text-[#087D78]"
          >
            Volver al inicio
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
