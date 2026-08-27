// DayStrip.tsx
//
// Tira horizontal scrolleable para elegir un día. Reutilizable: el rango
// lo arma el padre (helper buildDayRange u otro criterio) y acá solo se
// dibuja la celda seleccionada y el marcador de "hoy".

import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from './theme';

const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Clave local YYYY-MM-DD: compara fechas sin corrimientos de zona horaria. */
export function dateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function isToday(date: Date): boolean {
  return dateKey(date) === dateKey(new Date());
}

/**
 * Días consecutivos alrededor de hoy: `back` hacia atrás + hoy + `forward`
 * hacia adelante. Default 5 atrás / 10 adelante.
 */
export function buildDayRange(options?: { back?: number; forward?: number }): Date[] {
  const back = options?.back ?? 5;
  const forward = options?.forward ?? 10;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: back + 1 + forward }, (_, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - back + i);
    return day;
  });
}

const CELL_WIDTH = 48;
const CELL_GAP = 8;
const CELL_STRIDE = CELL_WIDTH + CELL_GAP;

type Props = {
  days: Date[];
  selected: Date;
  onSelect: (day: Date) => void;
  /** Días no seleccionables (ej. no hábiles): celda gris, sin toque. */
  isDisabled?: (day: Date) => boolean;
};

export default function DayStrip({ days, selected, onSelect, isDisabled }: Props) {
  const selectedKey = dateKey(selected);

  // Arranca con "hoy" en el borde izquierdo; los días pasados quedan a la
  // izquierda, alcanzables scrolleando.
  const initialIndex = useMemo(() => {
    const idx = days.findIndex((day) => isToday(day));
    return idx === -1 ? 0 : idx;
  }, [days]);

  return (
    <FlatList
      data={days}
      horizontal
      keyExtractor={(day) => dateKey(day)}
      getItemLayout={(_, index) => ({ length: CELL_STRIDE, offset: CELL_STRIDE * index, index })}
      initialScrollIndex={initialIndex}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      renderItem={({ item }) => {
        const isSelected = dateKey(item) === selectedKey;
        const esHoy = isToday(item);
        const isDisabledDay = isDisabled?.(item) ?? false;
        return (
          <TouchableOpacity
            style={[
              styles.cell,
              isDisabledDay && styles.cellDisabled,
              !isDisabledDay && isSelected && styles.cellSelected,
            ]}
            onPress={() => !isDisabledDay && onSelect(item)}
            disabled={isDisabledDay}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dayName,
                isDisabledDay && styles.textDisabled,
                !isDisabledDay && isSelected && styles.textSelected,
              ]}
            >
              {DIAS_CORTOS[item.getDay()]}
            </Text>
            <Text
              style={[
                styles.dayNum,
                isDisabledDay && styles.textDisabled,
                !isDisabledDay && isSelected && styles.textSelected,
              ]}
            >
              {item.getDate()}
            </Text>
            {/* Spacer de altura fija para no romper getItemLayout */}
            <View style={[styles.todayDotSpacer, !isSelected && esHoy && styles.todayDot]} />
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  strip: {
    gap: CELL_GAP,
    paddingVertical: spacing(1),
  },
  cell: {
    width: CELL_WIDTH,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(2),
  },
  cellSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cellDisabled: {
    backgroundColor: colors.lineSoft,
    borderColor: colors.line,
  },
  textDisabled: {
    color: colors.inkSoft,
    opacity: 0.5,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'capitalize',
  },
  dayNum: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 2,
  },
  textSelected: {
    color: colors.white,
  },
  todayDotSpacer: {
    width: 4,
    height: 4,
    borderRadius: radius.pill,
    marginTop: 3,
  },
  todayDot: {
    backgroundColor: colors.primaryLine,
  },
});
