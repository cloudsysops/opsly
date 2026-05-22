import Link from 'next/link'
import { Film, Images, Instagram, Play } from 'lucide-react'
import { PeskidsLogo } from '@/components/brand/peskids-logo'
import type { InstagramFeedItem, InstagramFallbackTone } from '@/lib/instagram-feed'
import { cn } from '@/lib/utils'

const toneBg: Record<InstagramFallbackTone, string> = {
  teal: 'bg-pk-primary',
  deep: 'bg-pk-deep',
  coral: 'bg-pk-accent',
  sun: 'bg-gradient-to-br from-pk-sun to-pk-accent',
}

interface InstagramMediaCardProps {
  item: InstagramFeedItem
}

export function InstagramMediaCard({ item }: InstagramMediaCardProps): React.ReactElement {
  const isVideo = item.mediaType === 'video' || item.mediaType === 'reel'
  const tone = item.fallback?.tone ?? 'teal'

  return (
    <Link
      href={item.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative aspect-square overflow-hidden rounded-[1.5rem] shadow-card transition-shadow duration-200 hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pk-primary"
      aria-label={
        item.caption
          ? `Ver en Instagram: ${item.caption}`
          : 'Ver publicación en Instagram de Peskids'
      }
    >
      {item.thumbnailUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- CDN Instagram (hostnames variables) */}
          <img
            src={item.thumbnailUrl}
            alt={item.caption ?? 'Publicación de Peskids en Instagram'}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-pk-deep/75 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          {item.caption ? (
            <p className="absolute bottom-0 left-0 right-0 line-clamp-2 p-3 text-xs font-semibold text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {item.caption}
            </p>
          ) : null}
        </>
      ) : (
        <div
          className={cn(
            'flex h-full w-full flex-col justify-between p-4 text-white',
            toneBg[tone]
          )}
        >
          <div className="flex items-center justify-between">
            <PeskidsLogo size={28} />
            <Instagram className="h-5 w-5 opacity-80" aria-hidden />
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/75">
              {item.fallback?.mediaLabel ?? 'Instagram'}
            </p>
            <p className="mt-1 text-sm font-bold leading-tight">
              {item.fallback?.title ?? 'Peskids'}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/90">
              {item.fallback?.body}
            </p>
          </div>
        </div>
      )}

      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
        {item.mediaType === 'carousel' ? (
          <Images className="h-3.5 w-3.5" aria-hidden />
        ) : isVideo ? (
          <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
        ) : (
          <Film className="h-3.5 w-3.5" aria-hidden />
        )}
        <span>{isVideo ? 'Video' : item.mediaType === 'carousel' ? 'Álbum' : 'Foto'}</span>
      </div>
    </Link>
  )
}
