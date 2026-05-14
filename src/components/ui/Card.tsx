import React from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TurnoUI } from '@/services/turnos.service';

type Props = {
  turno: TurnoUI;
};

function formatDate(date: string) {
  const d = new Date(date);
  return d.toLocaleString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Card({ turno }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/turno/${turno.id}`)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="cut-outline" size={22} color="#0F172A" />
      </View>

      <View style={styles.info}>
        <Text style={styles.customer}>{turno.cliente_nombre}</Text>
        <Text style={styles.service}>{turno.servicio_nombre}</Text>
        <Text style={styles.time}>{formatDate(turno.inicio)}</Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  customer: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  service: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  time: {
    fontSize: 12,
    color: '#64748B',
  },
});

export default Card;