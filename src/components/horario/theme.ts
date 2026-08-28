// theme.ts
// Tokens compartidos por las pantallas de horario. Mismo lenguaje visual
// que el mockup web anterior: simple, blanco, un solo acento.

export const colors = {
  primary: '#4C1D95',
  primarySoft: '#EDE9FE',
  primaryLine: '#C4B5FD',
  ink: '#0F172A',
  inkSoft: '#64748B',
  line: '#E2E8F0',
  lineSoft: '#F1F5F9',
  white: '#FFFFFF',
  bg: '#F8FAFC',
  accent: '#4C1D95',
  accentSoft: '#EDE9FE',
  accentLine: '#C4B5FD',
  danger: '#B91C1C',
  dangerSoft: '#FEE2E2',
};

export const radius = {
  sm: 10,
  md: 14,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

export const type = {
  h1: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 14.5, fontWeight: '400' as const },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  caption: { fontSize: 12.5, fontWeight: '400' as const },
};
