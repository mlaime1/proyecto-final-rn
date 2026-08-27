// TurnoHeader.tsx
//
// Subbar con back + título centrado para las pantallas empujadas del
// flujo de turnos (detalle / nuevo / confirmar), según el mock de
// referencia. No maneja SafeArea: cada pantalla aplica su padding superior.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from './theme';

const HEADER_SIDE = 70;

type Props = {
  title: string;
};

export default function TurnoHeader({ title }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Volver</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: HEADER_SIDE,
  },
  backText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  spacer: {
    width: HEADER_SIDE,
  },
});
