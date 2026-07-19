/** Perfil y feed de Instagram — https://www.instagram.com/peskidsnatacion/ */

export const PESKIDS_INSTAGRAM = {
  profileUrl: 'https://www.instagram.com/peskidsnatacion/',
  handle: '@peskidsnatacion',
  displayName: 'Peskids Natación',
} as const;

export type InstagramMediaType = 'image' | 'video' | 'reel' | 'carousel';

export type InstagramFallbackTone = 'teal' | 'deep' | 'coral' | 'sun';

export type InstagramFeedItem = {
  id: string;
  permalink: string;
  mediaType: InstagramMediaType;
  caption?: string;
  thumbnailUrl?: string;
  /** Cuando oEmbed no devuelve miniatura (sin permalinks en env o post privado). */
  fallback?: {
    title: string;
    body: string;
    tone: InstagramFallbackTone;
    mediaLabel?: string;
  };
};

/** Publicaciones de respaldo (marca) hasta pegar permalinks reales en Doppler. */
export const INSTAGRAM_FALLBACK_ITEMS: InstagramFeedItem[] = [
  {
    id: 'fallback-1',
    permalink: PESKIDS_INSTAGRAM.profileUrl,
    mediaType: 'image',
    fallback: {
      tone: 'teal',
      title: 'Ciclo junio · cupos abiertos',
      body: 'Disfrutar del agua empieza ya. Bebés desde 6 meses · Llanogrande.',
      mediaLabel: 'Publicación',
    },
  },
  {
    id: 'fallback-2',
    permalink: PESKIDS_INSTAGRAM.profileUrl,
    mediaType: 'video',
    fallback: {
      tone: 'deep',
      title: 'Logro en piscina',
      body: 'Momentos de progreso y alegría con #TeamPesk.',
      mediaLabel: 'Reel / video',
    },
  },
  {
    id: 'fallback-3',
    permalink: PESKIDS_INSTAGRAM.profileUrl,
    mediaType: 'image',
    fallback: {
      tone: 'coral',
      title: '¿Sabías que…?',
      body: 'Tu bebé puede familiarizarse con el agua desde los 6 meses.',
      mediaLabel: 'Carrusel',
    },
  },
  {
    id: 'fallback-4',
    permalink: PESKIDS_INSTAGRAM.profileUrl,
    mediaType: 'reel',
    fallback: {
      tone: 'sun',
      title: 'Clase de prueba',
      body: 'Reserva por DM o formulario web. Te esperamos en la sede.',
      mediaLabel: 'Reel',
    },
  },
  {
    id: 'fallback-5',
    permalink: PESKIDS_INSTAGRAM.profileUrl,
    mediaType: 'image',
    fallback: {
      tone: 'teal',
      title: 'Torneos y vacacionales',
      body: 'Entrenamiento olímpico y de competencia para quienes quieren más.',
      mediaLabel: 'Foto',
    },
  },
  {
    id: 'fallback-6',
    permalink: PESKIDS_INSTAGRAM.profileUrl,
    mediaType: 'video',
    fallback: {
      tone: 'deep',
      title: 'Detrás del método Peskids',
      body: 'Seguridad, juego y técnica en cada etapa.',
      mediaLabel: 'Video',
    },
  },
];

/** Permalinks separados por coma en Doppler/VPS (`runtime/peskids.env`). */
export function getInstagramPermalinksFromEnv(): string[] {
  const raw = process.env.INSTAGRAM_POST_PERMALINKS ?? '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.startsWith('https://www.instagram.com/'));
}

export function inferInstagramMediaType(permalink: string): InstagramMediaType {
  if (permalink.includes('/reel/')) return 'reel';
  if (permalink.includes('/tv/')) return 'video';
  return 'image';
}
