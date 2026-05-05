import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '@/components/ui/Screen';

const profileItems = [
  { label: 'Emprendimiento', value: 'Studio Norte' },
  { label: 'Rubro', value: 'Belleza y cuidado personal' },
  { label: 'Telefono', value: '+54 9 11 5555 1234' },
  { label: 'Email', value: 'contacto@studionorte.com' },
];

export default function PerfilScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>SN</Text>
          </View>
          <Text style={styles.title}>Mi Perfil</Text>
          <Text style={styles.subtitle}>Gestiona la informacion principal de tu negocio.</Text>
        </View>

        <View style={styles.card}>
          {profileItems.map((item) => (
            <View key={item.label} style={styles.item}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
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
  hero: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#0EA5E9',
    borderRadius: 999,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
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
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  item: {
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    gap: 6,
    paddingVertical: 14,
  },
  label: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
});
