import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pk: {
          bg: '#E6F6FB',
          surface: '#FFFFFF',
          muted: '#F2F4F7',
          snow: '#F7FBFD',
          border: '#E4ECF0',
          ink: '#0D4C63',
          sub: '#3D6679',
          mutedText: '#7D96A4',
          primary: '#2DB7B0',
          'primary-dark': '#1a9a94',
          deep: '#0D4C63',
          accent: '#FF5A1F',
          sun: '#FFC20E',
          success: '#16a34a',
          warning: '#ca8a04',
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
