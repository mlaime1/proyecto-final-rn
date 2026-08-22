// theme.ts
// Tokens compartidos por las pantallas de horario. Mismo lenguaje visual
// que el mockup web anterior: simple, blanco, un solo acento.

export const colors = {
  ink: '#17181c',
  inkSoft: '#6b6f76',
  line: '#e6e7eb',
  lineSoft: '#f0f1f3',
  white: '#ffffff',
  bg: '#fafafb',
  accent: '#f4b400',
  accentSoft: '#fff3d6',
  accentLine: '#e6a800',
  danger: '#d64545',
  dangerSoft: '#fbe9e9',
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
