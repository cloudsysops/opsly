import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ops: {
          bg: '#0A0E27',
          surface: '#101734',
          border: '#223064',
          green: '#22c55e',
          yellow: '#eab308',
          red: '#ef4444',
          gray: '#94a3b8',
          blue: '#3388ff',
          cyan: '#00FFFF',
          magenta: '#FF00FF',
          purple: '#9D00FF',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
        display: ['var(--font-ops-display)', 'var(--font-geist-sans)', 'sans-serif'],
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-120%)' },
          '100%': { transform: 'translateY(120%)' },
        },
        'neon-flicker': {
          '0%, 18%, 22%, 100%': { opacity: '1' },
          '20%, 21%': { opacity: '0.7' },
        },
        'grid-pan': {
          '0%': { backgroundPosition: '0 0, 0 0' },
          '100%': { backgroundPosition: '0 44px, 44px 0' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.2s ease-in-out infinite',
        blink: 'blink 1s step-end infinite',
        scanline: 'scanline 8s linear infinite',
        'neon-flicker': 'neon-flicker 2.4s ease-in-out infinite',
        'grid-pan': 'grid-pan 16s linear infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
