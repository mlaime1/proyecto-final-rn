import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Screen from '@/components/ui/Screen';
import { getTurnos, type Turno } from '@/services/turnos.service';

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isToday) return 'Hoy';
  if (isTomorrow) return 'Mañana';

  return date.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' });
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const getEstadoBadgeColor = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return '#FEF08A';
    case 'confirmado':
      return '#DCFCE7';
    case 'completado':
      return '#D1FAE5';
    case 'cancelado':
      return '#FECACA';
    default:
      return '#E5E7EB';
  }
};

const getEstadoTextColor = (estado: string) => {
  switch (estado) {
    case 'pendiente':
      return '#854D0E';
    case 'confirmado':
      return '#166534';
    case 'completado':
      return '#065F46';
    case 'cancelado':
      return '#7F1D1D';
    default:
      return '#374151';
  }
};

type TurnoCardProps = {
  turno: Turno & { estado?: string };
  isLast: boolean;
};

function TurnoCard({ turno, isLast }: TurnoCardProps) {
  const fecha = formatDate((turno as any).inicio);
  const hora = formatTime((turno as any).inicio);
  const estado = (turno as any).estado || 'pendiente';

  return (
    <View style={[styles.turnoCard, !isLast && styles.turnoCardWithBorder]}>
      <View style={styles.turnoTimelineLeft}>
        <View style={styles.timelineDot} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.turnoContent}>
        <View style={styles.turnoHeader}>
          <View>
            <Text style={styles.turnoDate}>{fecha}</Text>
            <Text style={styles.turnoTime}>{hora}</Text>
          </View>
          <View
            style={[
              styles.estadoBadge,
              { backgroundColor: getEstadoBadgeColor(estado) },
            ]}
          >
            <Text style={[styles.estadoText, { color: getEstadoTextColor(estado) }]}>
              {estado.charAt(0).toUpperCase() + estado.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.turnoDetails}>
          <View style={styles.turnoDetailRow}>
            <MaterialIcons name="person" size={16} color="#94A3B8" />
            <Text style={styles.turnoDetailText}>
              Cliente #{(turno as any).cliente_id}
            </Text>
          </View>
          <View style={styles.turnoDetailRow}>
            <MaterialIcons name="build" size={16} color="#94A3B8" />
            <Text style={styles.turnoDetailText}>
              Servicio #{(turno as any).servicio_id}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);
  const userName = 'Juan Pablo';

  useEffect(() => {
    loadTurnos();
  }, []);

  const loadTurnos = async () => {
    try {
      const data = await getTurnos();
      setTurnos(data.slice(0, 3));
    } catch (error) {
      console.error('Error loading turnos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {userName.split(' ').map((n) => n[0]).join('')}
              </Text>
            </View>
          </View>
          <Text style={styles.greeting}>Hola, {userName}</Text>
        </View>

        {/* Quick Action Cards */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/turnos')}
            activeOpacity={0.7}
          >
            <View style={styles.actionCardIcon}>
              <MaterialIcons name="event" size={24} color="#4C1D95" />
            </View>
            <Text style={styles.actionCardLabel}>Turnos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/turnos')}
            activeOpacity={0.7}
          >
            <View style={styles.actionCardIcon}>
              <MaterialIcons name="add-circle-outline" size={24} color="#4C1D95" />
            </View>
            <Text style={styles.actionCardLabel}>Nuevo Turno</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/perfil')}
            activeOpacity={0.7}
          >
            <View style={styles.actionCardIcon}>
              <Ionicons name="time-outline" size={24} color="#4C1D95" />
            </View>
            <Text style={styles.actionCardLabel}>Mis Procesos</Text>
          </TouchableOpacity>
        </View>

        {/* Próximos Turnos Section */}
        <View style={styles.turnosSection}>
          <Text style={styles.sectionTitle}>Próx Turnos</Text>
          <View style={styles.turnosContainer}>
            {loading ? (
              <Text style={styles.emptyText}>Cargando turnos...</Text>
            ) : turnos.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="event-busy" size={48} color="#CBD5E1" />
                <Text style={styles.emptyText}>No hay turnos próximos</Text>
              </View>
            ) : (
              turnos.map((turno, index) => (
                <TurnoCard key={turno.id} turno={turno} isLast={index === turnos.length - 1} />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#E9D5FF',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4C1D95',
  },
  greeting: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 32,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  actionCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  turnosSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  turnosContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  turnoCard: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  turnoCardWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  turnoTimelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 24,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4C1D95',
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
  },
  turnoContent: {
    flex: 1,
  },
  turnoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  turnoDate: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    textTransform: 'capitalize',
  },
  turnoTime: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4C1D95',
    marginTop: 2,
  },
  estadoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  estadoText: {
    fontSize: 11,
    fontWeight: '700',
  },
  turnoDetails: {
    gap: 8,
  },
  turnoDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  turnoDetailText: {
    fontSize: 13,
    color: '#64748B',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 12,
  },
});
