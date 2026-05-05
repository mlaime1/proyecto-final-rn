import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '@/components/ui/Screen';

const upcomingAppointments = [
  { id: '1', customer: 'Ana Perez', service: 'Corte de cabello', time: '09:00' },
  { id: '2', customer: 'Lucas Gomez', service: 'Perfilado de barba', time: '11:30' },
  { id: '3', customer: 'Micaela Diaz', service: 'Coloracion', time: '15:00' },
];

export default function TurnosScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Listado de turnos</Text>
          <Text style={styles.subtitle}>Consulta rapidamente las reservas del dia.</Text>
        </View>

        <View style={styles.list}>
          {upcomingAppointments.map((turno) => (
            <View key={turno.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.time}>{turno.time}</Text>
                <Text style={styles.service}>{turno.service}</Text>
              </View>
              <Text style={styles.customer}>{turno.customer}</Text>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  time: {
    color: '#0284C7',
    fontSize: 18,
    fontWeight: '700',
  },
  service: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  customer: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
});
