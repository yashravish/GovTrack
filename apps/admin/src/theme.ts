// Matches mobile design tokens (apps/mobile) for brand consistency.
export const theme = {
  color: {
    primary: '#1D4ED8',
    primaryDark: '#1E3A8A',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    muted: '#475569',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    focus: '#2563EB',
  },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radius: { sm: 4, md: 8, lg: 12 },
  fontSize: { sm: 13, base: 15, lg: 17, xl: 22, xxl: 28 },
} as const;
