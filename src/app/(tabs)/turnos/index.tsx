import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '@/components/ui/Screen';
import Card, { type TurnoCardData } from '@/components/ui/Card';

const upcomingAppointments: TurnoCardData[] = [
  {
    id: 1,
    created_at: '2026-05-05T08:00:00.000Z',
    duracion: '00:45:00',
    estado: 'pendiente',
    inicio: '2026-05-05T09:00:00.000Z',
    precio: 18000,
    cliente_id: 1,
    emprendedor_id: 3,
    fin: '2026-05-05T09:45:00.000Z',
    update_at: '2026-05-05T08:00:00.000Z',
    cliente: {
      id: 1,
      nombre: 'Ana Perez',
    },
  },
  {
    id: 2,
    created_at: '2026-05-05T08:10:00.000Z',
    duracion: '00:30:00',
    estado: 'confirmado',
    inicio: '2026-05-05T11:30:00.000Z',
    precio: 12000,
    cliente_id: 2,
    emprendedor_id: 3,
    fin: '2026-05-05T12:00:00.000Z',
    update_at: '2026-05-05T08:10:00.000Z',
    cliente: {
      id: 2,
      nombre: 'Lucas Gomez',
    },
  },
  {
    id: 3,
    created_at: '2026-05-05T08:20:00.000Z',
    duracion: '01:30:00',
    estado: 'pendiente',
    inicio: '2026-05-05T15:00:00.000Z',
    precio: 32000,
    cliente_id: 3,
    emprendedor_id: 4,
    fin: '2026-05-05T16:30:00.000Z',
    update_at: '2026-05-05T08:20:00.000Z',
    cliente: {
      id: 3,
      nombre: 'Micaela Diaz',
    },
  },
];

export default function TurnosScreen() {
  return (
    <Screen>
      <View style={styles.list}>
        {upcomingAppointments.length === 0 ? (
          <Text style={styles.empty}>No hay turnos</Text>
        ) : (
          upcomingAppointments.map((turno) => (
            <Card key={turno.id} turno={turno} />
          ))
        )}
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
  empty: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 16,
    marginTop: 20,
  },
});
