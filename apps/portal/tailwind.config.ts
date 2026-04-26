import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './styles/**/*.css',
    './hooks/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#0a0a0a',
          surface: '#111111',
          border: '#1e1e1e',
          green: '#22c55e',
          yellow: '#eab308',
          red: '#ef4444',
          gray: '#666666',
          blue: '#3388ff',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
