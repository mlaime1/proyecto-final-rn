import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '@/components/ui/Screen';

export default function Home() {
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>
            Bienvenido a tu panel principal. Desde la navegacion inferior puedes acceder a turnos y
            perfil.
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>Resumen rapido</Text>
          <Text style={styles.summaryTitle}>Gestiona tu negocio desde un solo lugar</Text>
          <Text style={styles.summaryText}>
            Usa la barra inferior para navegar entre el dashboard, el listado de turnos y tu perfil.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 24,
    justifyContent: 'center',
  },
  header: {
    gap: 8,
  },
  title: {
    color: '#0F172A',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#475569',
    fontSize: 16,
    lineHeight: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
  },
  sectionLabel: {
    color: '#0EA5E9',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  summaryTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  summaryText: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
});
