import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import { colorTokens } from '@intcloudsysops/components';

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
          bg: colorTokens.background,
          surface: colorTokens.surface,
          border: colorTokens.border,
          green: colorTokens.success,
          yellow: colorTokens.warning,
          red: colorTokens.danger,
          gray: colorTokens.text.secondary,
          blue: colorTokens.secondary,
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
