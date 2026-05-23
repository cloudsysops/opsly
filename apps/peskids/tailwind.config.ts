import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'
import { peskidsColorTokens } from './lib/tokens'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pk: {
          bg: peskidsColorTokens.neutral.lightBorder,
          surface: peskidsColorTokens.neutral.white,
          muted: peskidsColorTokens.neutral.lightGray,
          snow: peskidsColorTokens.neutral.lightBg,
          border: peskidsColorTokens.neutral.mediumGray,
          ink: peskidsColorTokens.primary.blue,
          sub: peskidsColorTokens.neutral.darkBg,
          mutedText: peskidsColorTokens.neutral.darkGray,
          primary: peskidsColorTokens.primary.teal,
          'primary-dark': peskidsColorTokens.dark.darkBlue,
          deep: peskidsColorTokens.primary.blue,
          accent: peskidsColorTokens.secondary.orange,
          sun: peskidsColorTokens.secondary.yellow,
          success: peskidsColorTokens.status.success,
          warning: peskidsColorTokens.secondary.yellow,
          danger: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'system-ui', 'sans-serif'],
        brush: ['var(--font-brush)', 'cursive'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(13 76 99 / 0.06), 0 12px 32px -8px rgb(13 76 99 / 0.12)',
        'card-hover': '0 20px 50px -10px rgb(11 42 74 / 0.2)',
        hero: '0 30px 80px -30px rgba(11,42,74,0.45)',
      },
      borderRadius: {
        pk: '1.25rem',
        'pk-lg': '2rem',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
