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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { BarberoConBarberia, getBarbero } from '@/services/barbero.service';

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
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'left', 'bottom']}>
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
          <Text style={styles.subtitle}>Gestiona la informacion principal de tu negocio.</Text>
        </View>

        {loading && <ActivityIndicator color="#0EA5E9" />}

        <View style={styles.card}>
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
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="time-outline" size={20} color="#0F172A" />
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
          >
            <View style={styles.menuRowLeft}>
              <Ionicons name="calendar-outline" size={20} color="#0F172A" />
              <View>
                <Text style={styles.menuTitle}>Excepciones</Text>
                <Text style={styles.menuSubtitle}>Bloquear franjas o días puntuales</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.logoutButton, signingOut && styles.logoutButtonDisabled]}
          onPress={handleSignOut}
          disabled={signingOut}
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 24,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
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
  sectionLabel: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
  menuSubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 8,
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
