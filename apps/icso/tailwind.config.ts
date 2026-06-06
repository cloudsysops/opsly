import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        icso: {
          bg: '#0A0A0A',
          surface: '#111827',
          border: 'rgba(243, 244, 246, 0.12)',
          text: '#F3F4F6',
          muted: '#9CA3AF',
          primary: '#2563EB',
          cyan: '#06B6D4',
          accent: '#8B5CF6',
          success: '#22C55E',
        },
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(37, 99, 235, 0.25)',
        'glow-cyan': '0 0 32px rgba(6, 182, 212, 0.2)',
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(37, 99, 235, 0.35), transparent 60%)',
        'card-gradient':
          'linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(139, 92, 246, 0.06) 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
