import Link from 'next/link'
import { ExternalLink, Instagram } from 'lucide-react'
import { WhatsAppLink } from '@/components/contact/whatsapp-link'
import { InstagramMediaCard } from '@/components/marketing/instagram-media-card'
import { PESKIDS_INSTAGRAM } from '@/lib/instagram-feed'
import { loadInstagramFeedItems } from '@/lib/instagram-feed-loader'
import { cn } from '@/lib/utils'

export async function InstagramFeedSection(): Promise<React.ReactElement> {
  const items = await loadInstagramFeedItems()
  const usingLivePosts = items.some((item) => item.thumbnailUrl)
  const [featuredItem, ...restItems] = items

  return (
    <section
      id="redes"
      className="relative scroll-mt-24 overflow-hidden bg-white py-16 sm:py-20"
      aria-labelledby="instagram-feed-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="pk-eyebrow flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pk-primary" aria-hidden />
              Redes sociales
            </p>
            <h2
              id="instagram-feed-heading"
              className="mt-3 text-3xl font-bold tracking-tight text-pk-ink sm:text-4xl"
            >
              Fotos y videos de nuestras clases
            </h2>
            <p className="mt-4 text-base leading-relaxed text-pk-sub sm:text-lg">
              Sigue el día a día en piscina: logros de los niños, cupos, tips para padres y reels
              de entrenamiento. Todo en{' '}
              <span className="font-semibold text-pk-ink">{PESKIDS_INSTAGRAM.handle}</span>.
            </p>
            {!usingLivePosts ? (
              <p className="mt-3 text-sm text-pk-mutedText">
                Vista previa de marca. Para mostrar publicaciones reales, añade en Doppler la
                variable{' '}
                <code className="rounded bg-pk-snow px-1.5 py-0.5 font-mono text-xs">
                  INSTAGRAM_POST_PERMALINKS
                </code>{' '}
                con URLs de posts o reels separadas por coma.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={PESKIDS_INSTAGRAM.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-6 text-sm font-bold text-white shadow-md transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99]'
              )}
            >
              <Instagram className="h-5 w-5" aria-hidden />
              Seguir en Instagram
              <ExternalLink className="h-4 w-4 opacity-90" aria-hidden />
            </Link>
            <WhatsAppLink variant="button" label="WhatsApp" />
          </div>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
          {featuredItem ? (
            <InstagramMediaCard item={featuredItem} variant="featured" />
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            {restItems.map((item) => (
              <InstagramMediaCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-pk-mutedText">
          <Link
            href={PESKIDS_INSTAGRAM.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-pk-primary hover:text-pk-primary-dark"
          >
            Ver más en {PESKIDS_INSTAGRAM.profileUrl.replace('https://www.', '')}
          </Link>
        </p>
      </div>
    </section>
  )
}
