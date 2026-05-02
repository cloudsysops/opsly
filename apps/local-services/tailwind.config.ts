import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#0a0a0a',
          surface: '#111111',
          border: '#262626',
          muted: '#a3a3a3',
          accent: '#22c55e',
          accentHover: '#16a34a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
