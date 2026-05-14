// Design system tokens - consolidated from portal and admin

export const colorTokens = {
  primary: '#00d084', // ops-green
  secondary: '#6366f1', // indigo
  danger: '#ef4444', // ops-red
  warning: '#f59e0b', // amber
  success: '#10b981', // emerald
  background: '#09090b', // ops-bg
  surface: '#18181b', // ops-surface
  border: '#27272a', // ops-border
  text: {
    primary: '#fafafa', // neutral-50
    secondary: '#a1a1aa', // neutral-400
    tertiary: '#71717a', // neutral-500
  },
} as const;

export const spacingTokens = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '2.5rem', // 40px
  '3xl': '3rem', // 48px
} as const;

export const typographyTokens = {
  heading: {
    h1: { size: '2.5rem', weight: 700, lineHeight: 1.2 },
    h2: { size: '2rem', weight: 700, lineHeight: 1.3 },
    h3: { size: '1.5rem', weight: 600, lineHeight: 1.4 },
    h4: { size: '1.25rem', weight: 600, lineHeight: 1.4 },
  },
  body: {
    large: { size: '1.125rem', weight: 400, lineHeight: 1.6 },
    regular: { size: '1rem', weight: 400, lineHeight: 1.6 },
    small: { size: '0.875rem', weight: 400, lineHeight: 1.5 },
  },
  mono: {
    regular: { size: '0.875rem', weight: 500, lineHeight: 1.5 },
  },
} as const;
