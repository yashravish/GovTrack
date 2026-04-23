export const theme = {
  colors: {
    bg: '#FFFFFF',
    surface: '#F5F7FA',
    text: '#0B1F3A',
    muted: '#4A5A77',
    primary: '#0B5FFF',
    danger: '#B3261E',
    success: '#0F7B3F',
    border: '#D6DEEB',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  radii: { sm: 6, md: 10, lg: 16 },
  typography: {
    h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
    h2: { fontSize: 20, fontWeight: '600' as const, lineHeight: 26 },
    body: { fontSize: 16, lineHeight: 22 },
    caption: { fontSize: 13, color: '#4A5A77' },
  },
};
