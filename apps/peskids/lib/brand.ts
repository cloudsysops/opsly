/** Paleta y tipografía oficial — design pack Peskids v2 (Napkin) */
export const BRAND = {
  azulProfundo: '#0D4C63',
  turquesa: '#2DB7B0',
  naranja: '#FF5A1F',
  amarillo: '#FFC20E',
  azulClaro: '#E6F6FB',
  blanco: '#FFFFFF',
  grisClaro: '#F2F4F7',
  ink: '#0D4C63',
  ink2: '#3D6679',
  ink3: '#7D96A4',
  line: '#E4ECF0',
  snow: '#F7FBFD',
} as const

export type SwimLevel = {
  n: number
  name: string
  emoji: string
  color: string
  desc: string
  dark?: boolean
}

export const SWIM_LEVELS: SwimLevel[] = [
  { n: 1, name: 'Burbujas', emoji: '💧', color: '#A8DDE3', desc: 'Familiarización · 6 meses a 3 años con acompañante.' },
  { n: 2, name: 'Peces', emoji: '🐠', color: '#2DB7B0', desc: 'Flotación independiente y patada estilo libre.' },
  { n: 3, name: 'Delfines', emoji: '🐬', color: '#0D4C63', desc: 'Brazada coordinada y respiración lateral.', dark: true },
  { n: 4, name: 'Tiburones', emoji: '🦈', color: '#0D4C63', desc: 'Cuatro estilos básicos y resistencia.', dark: true },
  { n: 5, name: 'Olímpicos', emoji: '🏆', color: '#FFC20E', desc: 'Técnica avanzada, clavados y virajes.' },
  { n: 6, name: 'Competencia', emoji: '⚡', color: '#FF5A1F', desc: 'Equipo de torneos y entrenamiento dirigido.' },
]
