import Link from 'next/link'
import { PeskidsLockup } from '@/components/brand/peskids-logo'
import { PeskidsWave } from '@/components/brand/peskids-logo'
import { PESKIDS_CONTACT, buildWhatsAppUrl } from '@/lib/contact-channels'
import { PESKIDS_INSTAGRAM } from '@/lib/instagram-feed'

export function SiteFooter(): React.ReactElement {
  return (
    <footer className="relative mt-auto bg-pk-deep text-white">
      <PeskidsWave color="rgba(76,184,176,0.15)" height={48} className="absolute left-0 right-0 top-0 -translate-y-full" />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-8 lg:px-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div>
            <PeskidsLockup height={44} color="#fff" tag="LLANOGRANDE · MEDELLÍN" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              Clases de natación para niños. Sede principal en Llanogrande, Rionegro.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-4 sm:gap-14">
            <FooterCol title="Programa" items={['Etapas', 'Babyswim', 'Torneos', 'Vacacionales']} />
            <FooterCol title="Información" items={['Sedes', 'Tarifas', 'Equipo', 'Preguntas']} />
            <FooterCol
              title="Contacto"
              items={[
                {
                  label: PESKIDS_CONTACT.whatsapp.display,
                  href: buildWhatsAppUrl(),
                },
                {
                  label: PESKIDS_CONTACT.email,
                  href: `mailto:${PESKIDS_CONTACT.email}`,
                },
                {
                  label: PESKIDS_INSTAGRAM.handle,
                  href: PESKIDS_INSTAGRAM.profileUrl,
                },
              ]}
            />
            <FooterCol
              title="Legal"
              items={[
                { label: 'Privacidad', href: '/privacy' },
                { label: 'Términos', href: '/terms' },
                { label: 'Aviso Parental', href: '/aviso-parental' },
                { label: 'Cookies', href: '/cookies' },
                { label: 'Mis derechos', href: '/dsar' },
              ]}
            />
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Peskids · #TeamPesk</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Más que natación, formamos para la vida.</span>
            <Link href="/admin" className="text-white/35 hover:text-white/60">
              Panel admin
            </Link>
          </span>
        </div>
      </div>
    </footer>
  )
}

type FooterItem = string | { label: string; href: string }

function FooterCol({ title, items }: { title: string; items: FooterItem[] }): React.ReactElement {
  return (
    <div>
      <p className="pk-eyebrow mb-3 text-white/50">{title}</p>
      <ul className="flex flex-col gap-2 text-white/85">
        {items.map((item) => {
          const key = typeof item === 'string' ? item : item.href
          if (typeof item === 'string') {
            return <li key={key}>{item}</li>
          }
          return (
            <li key={key}>
              <Link
                href={item.href}
                target={item.href.startsWith('/') ? undefined : '_blank'}
                rel={item.href.startsWith('/') ? undefined : 'noopener noreferrer'}
                className="hover:text-white"
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
