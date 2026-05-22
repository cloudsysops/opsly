export type InstagramOEmbedPayload = {
  thumbnailUrl: string
  title: string
  authorName: string
}

type InstagramOEmbedApiResponse = {
  thumbnail_url?: string
  title?: string
  author_name?: string
}

const OEMBED_ENDPOINT = 'https://api.instagram.com/oembed'

/** Miniatura pública vía oEmbed (sin token Meta). Revalida cada hora. */
export async function fetchInstagramOEmbed(
  permalink: string
): Promise<InstagramOEmbedPayload | null> {
  const url = new URL(OEMBED_ENDPOINT)
  url.searchParams.set('url', permalink)
  url.searchParams.set('omitscript', 'true')
  url.searchParams.set('hidecaption', 'true')

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null

    const data = (await res.json()) as InstagramOEmbedApiResponse
    if (!data.thumbnail_url) return null

    return {
      thumbnailUrl: data.thumbnail_url,
      title: data.title ?? '',
      authorName: data.author_name ?? '',
    }
  } catch {
    return null
  }
}
