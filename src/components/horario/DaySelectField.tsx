// DaySelectField.tsx
//
// Desplegable (Picker) cuyas opciones son los próximos `maxDays` días
// (default 10) con fecha real, ej. "viernes 21/08".

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius } from './theme';

const DIAS_COMPLETOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export type DiaOption = {
  fecha: string; // YYYY-MM-DD
  label: string; // "viernes 21/08"
  isToday: boolean;
};

export function buildProximosDias(maxDays: number): DiaOption[] {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return Array.from({ length: maxDays }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return {
      fecha: `${yyyy}-${mm}-${dd}`,
      label: `${DIAS_COMPLETOS[d.getDay()]} ${dd}/${mm}`,
      isToday: i === 0,
    };
  });
}

type Props = {
  maxDays?: number;
  selected: string | null; // fecha YYYY-MM-DD, o null si no eligió aún
  onSelect: (fecha: string) => void;
};

const PLACEHOLDER = '';

export default function DaySelectField({ maxDays = 10, selected, onSelect }: Props) {
  const dias = useMemo(() => buildProximosDias(maxDays), [maxDays]);

  return (
    <View style={[styles.wrap, selected && styles.wrapSelected]}>
      <View pointerEvents="none" style={styles.iconWrap}>
        <Ionicons
          name="calendar-outline"
          size={19}
          color={selected ? colors.primary : colors.inkSoft}
        />
      </View>
      <Picker
        selectedValue={selected ?? PLACEHOLDER}
        onValueChange={(value) => {
          if (value !== PLACEHOLDER) onSelect(String(value));
        }}
        style={styles.picker}
      >
        <Picker.Item
          label="Seleccioná un día"
          value={PLACEHOLDER}
          enabled={false}
          color="#9a9ea6"
        />
        {dias.map((dia) => (
          <Picker.Item
            key={dia.fecha}
            label={dia.label + (dia.isToday ? ' (hoy)' : '')}
            value={dia.fecha}
          />
        ))}
      </Picker>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    overflow: 'hidden',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  wrapSelected: {
    borderColor: colors.primaryLine,
    backgroundColor: colors.primarySoft,
  },
  iconWrap: {
    width: 42,
    alignItems: 'center',
  },
  picker: {
    flex: 1,
    height: 54,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '600',
  },
});
