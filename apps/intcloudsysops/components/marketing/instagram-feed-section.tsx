import Link from 'next/link';
import { ExternalLink, Instagram } from 'lucide-react';
import { InstagramFeedRotator } from '@/components/marketing/instagram-feed-rotator';
import { PESKIDS_INSTAGRAM } from '@/lib/instagram-feed';
import { loadInstagramFeedItems } from '@/lib/instagram-feed-loader';

export async function InstagramFeedSection(): Promise<React.ReactElement> {
  const items = await loadInstagramFeedItems();
  const usingLivePosts = items.some((item) => item.thumbnailUrl);

  return (
    <section
      id="redes"
      className="relative scroll-mt-24 overflow-hidden bg-pk-snow py-16 sm:py-20"
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
              Instagram y avances de clase
            </h2>
            <p className="mt-4 text-base leading-relaxed text-pk-sub sm:text-lg">
              Fotos, reels y momentos de clase en un solo vistazo.
            </p>
            {!usingLivePosts ? (
              <p className="mt-3 text-sm text-pk-mutedText">
                Mostramos piezas de marca hasta cargar publicaciones reales.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={PESKIDS_INSTAGRAM.profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-6 text-sm font-bold text-white shadow-md transition-transform duration-150 hover:scale-[1.02] active:scale-[0.99]"
            >
              <Instagram className="h-5 w-5" aria-hidden />
              Seguir en Instagram
              <ExternalLink className="h-4 w-4 opacity-90" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="mt-10">
          <InstagramFeedRotator items={items} />
        </div>

        <p className="mt-8 text-center text-sm text-pk-mutedText">
          <Link
            href={PESKIDS_INSTAGRAM.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-pk-primary hover:text-pk-primary-dark"
          >
            Ver más en Instagram
          </Link>
        </p>
      </div>
    </section>
  );
}
