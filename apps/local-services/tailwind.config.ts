import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#09090b',
          border: '#1e1e1e',
          green: '#22c55e',
        },
      },
    },
  },
  plugins: [],
};

export default config;
