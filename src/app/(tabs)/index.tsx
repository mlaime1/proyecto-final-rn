import Screen from '@/components/ui/Screen';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getEmprendedor } from '@/services/emprendedor.service';
import { getTurnos, TurnoUI } from '@/services/turnos.service';

/* =========================
   Helpers
========================= */
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
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
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

/* =========================
   Card
========================= */
type TurnoCardProps = {
  turno: TurnoUI;
  isLast: boolean;
};

function TurnoCard({ turno, isLast }: TurnoCardProps) {
  const fecha = formatDate(turno.inicio);
  const hora = formatTime(turno.inicio);
  const estado = turno.estado;

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

          <View style={[styles.estadoBadge, { backgroundColor: getEstadoBadgeColor(estado) }]}>
            <Text style={[styles.estadoText, { color: getEstadoTextColor(estado) }]}>
              {estado.charAt(0).toUpperCase() + estado.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.turnoDetails}>
          <View style={styles.turnoDetailRow}>
            <MaterialIcons name="person" size={16} color="#94A3B8" />
            <Text style={styles.turnoDetailText}>{turno.cliente_nombre}</Text>
          </View>

          <View style={styles.turnoDetailRow}>
            <MaterialIcons name="build" size={16} color="#94A3B8" />
            <Text style={styles.turnoDetailText}>{turno.servicio_nombre}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/* =========================
   Screen
========================= */
export default function Home() {
  const router = useRouter();
  const [turnos, setTurnos] = useState<TurnoUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Emprendedor');

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const [turnosData, emprendedor] = await Promise.all([getTurnos(), getEmprendedor()]);

      setTurnos(turnosData);

      if (emprendedor?.nombre) {
        setUserName(emprendedor.nombre);
      }
    } catch {
      setTurnos([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Perfil */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userName
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </Text>
          </View>
          <Text style={styles.greeting}>Hola, {userName}</Text>
        </View>

        {/* Acciones */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/turnos')}>
            <MaterialIcons name="event" size={24} color="#4C1D95" />
            <Text style={styles.actionCardLabel}>Turnos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/(tabs)/turnos/nuevo')}
          >
            <MaterialIcons name="add-circle-outline" size={24} color="#4C1D95" />
            <Text style={styles.actionCardLabel}>Nuevo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/perfil')}>
            <Ionicons name="time-outline" size={24} color="#4C1D95" />
            <Text style={styles.actionCardLabel}>Procesos</Text>
          </TouchableOpacity>
        </View>

        {/* Turnos */}
        <View style={styles.turnosSection}>
          <Text style={styles.sectionTitle}>Próx Turnos</Text>

          <View style={styles.turnosContainer}>
            {loading ? (
              <Text style={styles.emptyText}>Cargando...</Text>
            ) : turnos.length === 0 ? (
              <Text style={styles.emptyText}>No hay turnos</Text>
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

/* =========================
   Styles
========================= */
const styles = StyleSheet.create({
  container: { flex: 1 },

  profileSection: {
    alignItems: 'center',
    marginVertical: 24,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4C1D95',
  },

  greeting: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
  },

  quickActionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  actionCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  actionCardLabel: {
    marginTop: 8,
    fontSize: 12,
  },

  turnosSection: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  turnosContainer: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  turnoCard: {
    flexDirection: 'row',
    paddingVertical: 12,
  },

  turnoCardWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  turnoTimelineLeft: {
    width: 24,
    alignItems: 'center',
  },

  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4C1D95',
  },

  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
  },

  turnoContent: {
    flex: 1,
    marginLeft: 12,
  },

  turnoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  turnoDate: {
    fontWeight: '700',
  },

  turnoTime: {
    fontSize: 16,
    color: '#4C1D95',
  },

  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },

  estadoText: {
    fontSize: 10,
    fontWeight: '700',
  },

  turnoDetails: {
    marginTop: 8,
    gap: 4,
  },

  turnoDetailRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },

  turnoDetailText: {
    fontSize: 12,
    color: '#64748B',
  },

  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
  },
});
