import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#0a0a0a',
          card: '#111111',
          purple: '#7c3aed',
          indigo: '#6366f1',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;
