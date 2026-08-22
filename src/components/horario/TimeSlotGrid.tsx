// TimeSlotGrid.tsx
//
// Grilla de horarios de 30' entre horaInicio y horaFin, con semántica
// de BLOQUEO: todo arranca disponible; tocar un slot lo marca como
// "a bloquear" (rojo). Los slots que ya tienen un BloqueoHorario
// guardado llegan en `existentes` y se muestran grises, deshabilitados
// — para editarlos hay que borrar ese bloqueo primero, no se pisan
// desde acá (ver pantalla de Excepciones).

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radius, type } from './theme';

function minutosDesde(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function labelDesdeMinutos(mins: number): string {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

type Props = {
  horaInicio: string; // "09:00"
  horaFin: string; // "20:00"
  nuevos: Set<string>; // slots recién tildados, pendientes de guardar
  existentes: Set<string>; // slots que ya tienen un BloqueoHorario guardado
  onToggle: (hora: string) => void;
};

export default function TimeSlotGrid({ horaInicio, horaFin, nuevos, existentes, onToggle }: Props) {
  const inicio = minutosDesde(horaInicio);
  const fin = minutosDesde(horaFin);
  const slots: string[] = [];
  for (let t = inicio; t < fin; t += 30) {
    slots.push(labelDesdeMinutos(t));
  }

  return (
    <View style={styles.grid}>
      {slots.map((hora) => {
        const esExistente = existentes.has(hora);
        const esNuevo = !esExistente && nuevos.has(hora);
        return (
          <TouchableOpacity
            key={hora}
            style={[styles.slot, esExistente && styles.slotExistente, esNuevo && styles.slotNuevo]}
            onPress={() => !esExistente && onToggle(hora)}
            disabled={esExistente}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.slotText,
                esExistente && styles.slotTextExistente,
                esNuevo && styles.slotTextNuevo,
              ]}
            >
              {hora}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    width: '23%',
    paddingVertical: 10,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  slotNuevo: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  slotExistente: {
    backgroundColor: colors.lineSoft,
    borderColor: colors.line,
  },
  slotText: {
    ...type.body,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  slotTextNuevo: {
    color: colors.danger,
  },
  slotTextExistente: {
    color: colors.inkSoft,
  },
});
