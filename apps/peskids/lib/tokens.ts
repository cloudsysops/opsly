// Peskids Design System Tokens
// Canon: docs/brand/peskids/BRAND.md (+ logopeskids.ai master)

export const peskidsColorTokens = {
  // Primary brand colors (sampled from official logo kit)
  primary: {
    whatsapp: '#25D366', // WhatsApp green
    teal: '#54BFB1', // Official teal from brand logo
    blue: '#235A7F', // Official blue from brand logo
  },

  // Secondary colors (from official Peskids logo)
  secondary: {
    orange: '#F47259', // Official salmon/orange from brand
    coral: '#F0382B', // Official coral red from brand
    yellow: '#E9AF17', // Official yellow from brand logo
    lightTeal: '#A8DDE3', // Light teal
    lightYellow: '#FFE38A', // Light yellow
  },

  // Status colors
  status: {
    success: '#1ebe57', // Success green
  },

  // Neutral colors
  neutral: {
    white: '#FFFFFF',
    lightBg: '#F7FBFD',
    lightGray: '#F2F4F7',
    lightBorder: '#E6F6FB',
    mediumGray: '#E4ECF0',
    darkGray: '#7D96A4',
    darkBg: '#3D6679',
  },

  // Dark theme colors
  dark: {
    darkestBlue: '#1B607E',
    darkBlue: '#128C7E',
    brown: '#8B6A00',
    // Full dark-mode surface palette (mirrors the light neutral.* roles below).
    // Matches the navy tone already used for the always-dark admin sidebar
    // (#11253d) so light/dark toggle feels like one system, not two.
    bg: '#0b1626',
    surface: '#14273d',
    muted: '#1b3049',
    border: '#2a4562',
    ink: '#f1f5f9',
    sub: '#c7d4e2',
    mutedText: '#8ba0b6',
  },
} as const;

export const peskidsSpacingTokens = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '2.5rem', // 40px
  '3xl': '3rem', // 48px
} as const;

export const peskidsTypographyTokens = {
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
