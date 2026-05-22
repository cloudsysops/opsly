import {
  getInstagramPermalinksFromEnv,
  inferInstagramMediaType,
  INSTAGRAM_FALLBACK_ITEMS,
  type InstagramFeedItem,
} from '@/lib/instagram-feed'
import { fetchInstagramOEmbed } from '@/lib/instagram-oembed'

async function permalinkToFeedItem(permalink: string, index: number): Promise<InstagramFeedItem> {
  const mediaType = inferInstagramMediaType(permalink)
  const oembed = await fetchInstagramOEmbed(permalink)
  const fallback = INSTAGRAM_FALLBACK_ITEMS[index % INSTAGRAM_FALLBACK_ITEMS.length]

  return {
    id: `ig-${index}`,
    permalink,
    mediaType,
    caption: oembed?.title || fallback?.fallback?.title,
    thumbnailUrl: oembed?.thumbnailUrl,
    fallback: oembed ? undefined : fallback?.fallback,
  }
}

/** Prioriza permalinks en env; si faltan o fallan, muestra grid de marca + enlace al perfil. */
export async function loadInstagramFeedItems(): Promise<InstagramFeedItem[]> {
  const permalinks = getInstagramPermalinksFromEnv()
  if (permalinks.length === 0) {
    return INSTAGRAM_FALLBACK_ITEMS
  }

  const items = await Promise.all(
    permalinks.map((permalink, index) => permalinkToFeedItem(permalink, index))
  )

  const withThumbnail = items.filter((item) => item.thumbnailUrl)
  return withThumbnail.length > 0 ? items : INSTAGRAM_FALLBACK_ITEMS
}
