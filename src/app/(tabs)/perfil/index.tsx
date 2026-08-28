import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { BarberoConBarberia, getBarbero } from '@/services/barbero.service';
import Screen from '@/components/ui/Screen';

export default function PerfilScreen() {
  const { signOut, session } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [barbero, setBarbero] = useState<BarberoConBarberia | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    getBarbero()
      .then((data) => {
        if (mounted) setBarbero(data);
      })
      .catch(() => {
        // silent fail
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const profileItems = [
    { label: 'Barbería', value: barbero?.Barberia?.nombre || 'No vinculada' },
    { label: 'Barbero', value: barbero?.nombre || 'No disponible' },
    { label: 'Email', value: session?.user?.email || 'No disponible' },
  ];

  return (
    <Screen>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(barbero?.nombre || 'BR')
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>
          <Text style={styles.title}>Mi Perfil</Text>
          <Text style={styles.subtitle}>Información de tu cuenta y barbería</Text>
        </View>

        {loading && <ActivityIndicator color="#0EA5E9" />}

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Información</Text>
          {profileItems.map((item) => (
            <View key={item.label} style={styles.item}>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Configuración</Text>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => router.push('/(tabs)/perfil/horario')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Editar horario habitual"
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="time-outline" size={20} color="#4C1D95" />
              <View>
                <Text style={styles.menuTitle}>Horario habitual</Text>
                <Text style={styles.menuSubtitle}>Días y franja horaria de trabajo</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, styles.menuRowLast]}
            onPress={() => router.push('/(tabs)/perfil/excepciones')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Administrar excepciones"
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="calendar-outline" size={20} color="#4C1D95" />
              <View>
                <Text style={styles.menuTitle}>Excepciones</Text>
                <Text style={styles.menuSubtitle}>Bloquear franjas o días puntuales</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, signingOut && styles.logoutButtonDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          {signingOut ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <>
              <Ionicons name="log-out" size={18} color="#DC2626" />
              <Text style={styles.logoutText}>Cerrar sesión</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 20,
  },
  hero: {
    alignItems: 'center',
    marginVertical: 8,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    width: 80,
  },
  avatarText: {
    color: '#4C1D95',
    fontSize: 26,
    fontWeight: '700',
  },
  title: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  subtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  item: {
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    gap: 4,
    paddingVertical: 12,
  },
  label: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
  },
  menuSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: 'transparent',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
  },
});
