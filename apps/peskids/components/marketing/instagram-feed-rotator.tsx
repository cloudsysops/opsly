'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Film, Instagram, Images, Play } from 'lucide-react'
import { InstagramMediaCard } from '@/components/marketing/instagram-media-card'
import { PESKIDS_INSTAGRAM, type InstagramFeedItem } from '@/lib/instagram-feed'
import { cn } from '@/lib/utils'

interface InstagramFeedRotatorProps {
  items: InstagramFeedItem[]
}

export function InstagramFeedRotator({ items }: InstagramFeedRotatorProps): React.ReactElement | null {
  const safeItems = useMemo(() => (items.length > 0 ? items : []), [items])
  const [activeIndex, setActiveIndex] = useState(0)
  const [previewLimit, setPreviewLimit] = useState(4)

  useEffect(() => {
    if (safeItems.length < 2) return
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeItems.length)
    }, 5200)

    return () => window.clearInterval(interval)
  }, [safeItems.length])

  useEffect(() => {
    if (activeIndex >= safeItems.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, safeItems.length])

  useEffect(() => {
    const updatePreviewLimit = (): void => {
      if (window.innerWidth >= 1440) {
        setPreviewLimit(6)
        return
      }
      if (window.innerWidth >= 1024) {
        setPreviewLimit(4)
        return
      }
      setPreviewLimit(3)
    }

    updatePreviewLimit()
    window.addEventListener('resize', updatePreviewLimit)
    return () => window.removeEventListener('resize', updatePreviewLimit)
  }, [])

  if (safeItems.length === 0) {
    return null
  }

  const activeItem = safeItems[activeIndex]
  const previewItems = safeItems
    .filter((_, index) => index !== activeIndex)
    .slice(0, previewLimit)

  const move = (delta: number): void => {
    setActiveIndex((current) => (current + delta + safeItems.length) % safeItems.length)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.28fr_0.72fr]">
      <InstagramMediaCard item={activeItem} variant="featured" />

      <div className="rounded-[1.5rem] border border-pk-border bg-pk-snow p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="pk-eyebrow flex items-center gap-2">
              <Instagram className="h-4 w-4 text-pk-primary" aria-hidden />
              Rotación automática
            </p>
            <p className="mt-1 text-sm font-semibold text-pk-ink">
              {PESKIDS_INSTAGRAM.handle}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => move(-1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-pk-border bg-white text-pk-ink transition hover:border-pk-primary/30 hover:bg-pk-bg"
              aria-label="Anterior publicación"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-pk-border bg-white text-pk-ink transition hover:border-pk-primary/30 hover:bg-pk-bg"
              aria-label="Siguiente publicación"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {previewItems.map((item, index) => {
            const absoluteIndex = safeItems.findIndex((candidate) => candidate.id === item.id)
            const isActive = absoluteIndex === activeIndex

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(absoluteIndex)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border p-2 text-left transition',
                  isActive
                    ? 'border-pk-primary/40 bg-pk-bg shadow-sm'
                    : 'border-pk-border bg-white hover:border-pk-primary/25 hover:bg-pk-bg'
                )}
              >
                <div
                  className={cn(
                    'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border',
                    item.fallback?.tone === 'deep'
                      ? 'border-pk-deep/20 bg-pk-deep text-white'
                      : item.fallback?.tone === 'coral'
                        ? 'border-pk-accent/20 bg-pk-accent text-white'
                        : item.fallback?.tone === 'sun'
                          ? 'border-pk-sun/30 bg-gradient-to-br from-[#FFE38A] to-pk-sun text-pk-ink'
                          : 'border-pk-primary/20 bg-pk-primary text-white'
                  )}
                >
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Instagram CDN hostnames vary.
                    <img
                      src={item.thumbnailUrl}
                      alt={item.caption ?? 'Publicación de Peskids en Instagram'}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center">
                      {item.mediaType === 'carousel' ? (
                        <Images className="h-4 w-4" aria-hidden />
                      ) : item.mediaType === 'video' || item.mediaType === 'reel' ? (
                        <Play className="h-4 w-4 fill-current" aria-hidden />
                      ) : (
                        <Film className="h-4 w-4" aria-hidden />
                      )}
                      <span className="text-[9px] font-bold uppercase tracking-[0.18em]">
                        {item.fallback?.mediaLabel ?? 'Instagram'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-pk-ink">
                    {item.caption ?? item.fallback?.title ?? `Publicación ${index + 1}`}
                  </p>
                  <p className="mt-1 max-h-10 overflow-hidden text-xs leading-relaxed text-pk-mutedText">
                    {item.fallback?.body ?? 'Toca para ver esta publicación en Instagram.'}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center gap-2">
          {safeItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                'h-2.5 rounded-full transition-all',
                index === activeIndex ? 'w-8 bg-pk-primary' : 'w-2.5 bg-pk-border'
              )}
              aria-label={`Ir a la publicación ${index + 1}`}
              aria-pressed={index === activeIndex}
            />
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-pk-mutedText">
          Si no hay publicaciones reales en Doppler, mostramos piezas de marca para que la sección
          nunca quede vacía.
        </p>
      </div>
    </div>
  )
}
