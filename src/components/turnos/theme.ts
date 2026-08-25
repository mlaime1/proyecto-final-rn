// theme.ts
// Tokens visuales compartidos por las pantallas de turnos.
// Paleta violeta alineada con la tab bar (#4C1D95 / #EDE9FE) sobre
// neutros slate, siguiendo el patrón de components/horario/theme.ts.

export const colors = {
  primary: '#4C1D95',
  primary2: '#6D28D9',
  primaryDeep: '#3B1475',
  primarySoft: '#EDE9FE',
  primaryLine: '#C4B5FD',
  ink: '#0F172A',
  inkSoft: '#64748B',
  line: '#E2E8F0',
  lineSoft: '#F1F5F9',
  bg: '#F8FAFC',
  white: '#FFFFFF',

  green: '#15803D',
  greenBg: '#DCFCE7',
  red: '#B91C1C',
  redBg: '#FEE2E2',
  amber: '#A16207',
  amberBg: '#FEF3C7',
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

export const spacing = (n: number) => n * 4;
