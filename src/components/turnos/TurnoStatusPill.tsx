// TurnoStatusPill.tsx
//
// Pill de estado del turno. La UI usa confirmado/cancelado, pero el enum
// de BD tiene 5 valores: los desconocidos caen a neutro capitalizado.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

type PillConfig = { label: string; bg: string; fg: string };

const STATUS_MAP: Record<string, PillConfig> = {
  confirmado: { label: 'Confirmado', bg: colors.greenBg, fg: colors.green },
  cancelado: { label: 'Cancelado', bg: colors.redBg, fg: colors.red },
  pendiente: { label: 'Pendiente', bg: colors.amberBg, fg: colors.amber },
};

const NEUTRAL_BG = colors.lineSoft;
const NEUTRAL_FG = colors.inkSoft;

type Props = {
  estado: string;
};

export default function TurnoStatusPill({ estado }: Props) {
  const config = STATUS_MAP[estado];
  const label = config?.label ?? estado.charAt(0).toUpperCase() + estado.slice(1);

  return (
    <View style={[styles.pill, { backgroundColor: config?.bg ?? NEUTRAL_BG }]}>
      <Text style={[styles.label, { color: config?.fg ?? NEUTRAL_FG }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
  },
});
