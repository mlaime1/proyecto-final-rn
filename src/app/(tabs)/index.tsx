import Screen from '@/components/ui/Screen';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getBarbero } from '@/services/barbero.service';
import { getTurnos, TurnoUI } from '@/services/turnos.service';

/* =========================
   Constants
========================= */
const MAX_PROXIMOS_TURNOS = 4;

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

const formatDateTimeLong = (dateString: string) =>
  `${formatDate(dateString)} · ${formatTime(dateString)}`;

const getEstadoBadgeColor = (estado: string) => {
  switch (estado) {
    case 'confirmado':
      return '#DCFCE7';
    case 'cancelado':
      return '#FECACA';
    default:
      return '#E5E7EB';
  }
};

const getEstadoTextColor = (estado: string) => {
  switch (estado) {
    case 'confirmado':
      return '#166534';
    case 'cancelado':
      return '#7F1D1D';
    default:
      return '#374151';
  }
};

const selectProximosTurnos = (turnos: TurnoUI[]): TurnoUI[] => {
  const now = Date.now();

  return turnos
    .filter((turno) => {
      if (turno.estado === 'cancelado') return false;
      const inicioTime = new Date(turno.inicio).getTime();
      return Number.isFinite(inicioTime) && inicioTime >= now;
    })
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    .slice(0, MAX_PROXIMOS_TURNOS);
};

const selectUltimoTurno = (turnos: TurnoUI[]): TurnoUI | null => {
  const now = Date.now();

  const pasados = turnos.filter((turno) => {
    if (turno.estado === 'cancelado') return false;
    const inicioTime = new Date(turno.inicio).getTime();
    return Number.isFinite(inicioTime) && inicioTime < now;
  });

  if (pasados.length === 0) return null;

  pasados.sort((a, b) => new Date(b.inicio).getTime() - new Date(a.inicio).getTime());
  return pasados[0];
};

const formatServicioLine = (turno: TurnoUI): string => {
  if (turno.servicio_duracion != null) {
    return `${turno.servicio_nombre} · ${turno.servicio_duracion} min`;
  }
  return turno.servicio_nombre;
};

/* =========================
   Cards
========================= */
type TurnoCardProps = {
  turno: TurnoUI;
  isLast: boolean;
  onPress: () => void;
};

function TurnoCard({ turno, isLast, onPress }: TurnoCardProps) {
  const fecha = formatDate(turno.inicio);
  const hora = formatTime(turno.inicio);
  const estado = turno.estado;

  return (
    <TouchableOpacity
      style={[styles.turnoCard, !isLast && styles.turnoCardWithBorder]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Turno de ${turno.cliente_nombre} el ${fecha} a las ${hora}`}
    >
      <View style={styles.turnoTimelineLeft}>
        <View style={styles.timelineDot} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.turnoContent}>
        <View style={styles.turnoHeader}>
          <Text style={styles.turnoDateTime} numberOfLines={1}>
            {fecha} · {hora}
          </Text>
          <View style={[styles.estadoBadge, { backgroundColor: getEstadoBadgeColor(estado) }]}>
            <Text style={[styles.estadoText, { color: getEstadoTextColor(estado) }]}>
              {estado.charAt(0).toUpperCase() + estado.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.turnoDetails}>
          <View style={styles.turnoDetailRow}>
            <Ionicons name="person-outline" size={14} color="#94A3B8" />
            <Text style={styles.turnoClienteText} numberOfLines={1}>
              {turno.cliente_nombre}
            </Text>
          </View>

          <View style={styles.turnoDetailRow}>
            <Ionicons name="cut-outline" size={14} color="#94A3B8" />
            <Text style={styles.turnoServicioText} numberOfLines={1}>
              {formatServicioLine(turno)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function UltimoTurnoCard({ turno }: { turno: TurnoUI | null }) {
  if (!turno) {
    return (
      <View style={styles.ultimoTurnoCard}>
        <View style={styles.ultimoTurnoHeader}>
          <Text style={styles.ultimoTurnoTitle}>Último turno</Text>
          <View style={styles.ultimoTurnoIconWrap}>
            <Ionicons name="time-outline" size={16} color="#4C1D95" />
          </View>
        </View>
        <Text style={styles.ultimoTurnoEmpty}>Todavía no hay turnos anteriores</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.ultimoTurnoCard}
      accessibilityLabel={`Último turno de ${turno.cliente_nombre}`}
    >
      <View style={styles.ultimoTurnoHeader}>
        <Text style={styles.ultimoTurnoTitle}>Último turno</Text>
        <Text style={styles.ultimoTurnoDate}>{formatDateTimeLong(turno.inicio)}</Text>
      </View>

      <View style={styles.ultimoTurnoDetails}>
        <View style={styles.turnoDetailRow}>
          <Ionicons name="person-outline" size={14} color="#94A3B8" />
          <Text style={styles.turnoClienteText} numberOfLines={1}>
            {turno.cliente_nombre}
          </Text>
        </View>

        <View style={styles.turnoDetailRow}>
          <Ionicons name="cut-outline" size={14} color="#94A3B8" />
          <Text style={styles.turnoServicioText} numberOfLines={1}>
            {formatServicioLine(turno)}
          </Text>
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
  const [userName, setUserName] = useState('Barbero');

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const barbero = await getBarbero();
      const turnosData = await getTurnos();

      setTurnos(turnosData);

      if (barbero?.nombre) {
        setUserName(barbero.nombre);
      }
    } catch {
      setTurnos([]);
    } finally {
      setLoading(false);
    }
  };

  const proximosTurnos = useMemo(() => selectProximosTurnos(turnos), [turnos]);
  const ultimoTurno = useMemo(() => selectUltimoTurno(turnos), [turnos]);

  return (
    <Screen>
      <View style={styles.wrapper}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

          {/* Último turno - no clickeable */}
          <View style={styles.ultimoTurnoSection}>
            <UltimoTurnoCard turno={ultimoTurno} />
          </View>

          {/* Próximos turnos */}
          <View style={styles.turnosSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Próximos turnos</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/turnos')} hitSlop={8}>
                <Text style={styles.sectionAction}>Ver todos</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.turnosContainer}>
              {loading ? (
                <Text style={styles.emptyText}>Cargando...</Text>
              ) : proximosTurnos.length === 0 ? (
                <Text style={styles.emptyText}>No tenés próximos turnos</Text>
              ) : (
                proximosTurnos.map((turno, index) => (
                  <TurnoCard
                    key={turno.id}
                    turno={turno}
                    isLast={index === proximosTurnos.length - 1}
                    onPress={() => router.push(`/turnos/${turno.id}`)}
                  />
                ))
              )}
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/turnos/nuevo')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Crear nuevo turno"
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

/* =========================
   Styles
========================= */
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },

  container: { flex: 1 },

  scrollContent: {
    paddingBottom: 96,
  },

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

  ultimoTurnoSection: {
    marginBottom: 24,
  },

  ultimoTurnoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },

  ultimoTurnoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  ultimoTurnoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  ultimoTurnoDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4C1D95',
    flexShrink: 1,
    textAlign: 'right',
  },

  ultimoTurnoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ultimoTurnoDetails: {
    gap: 6,
  },

  ultimoTurnoEmpty: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 4,
  },

  turnosSection: {
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4C1D95',
  },

  turnosContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  turnoCard: {
    flexDirection: 'row',
    paddingVertical: 10,
  },

  turnoCardWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },

  turnoTimelineLeft: {
    width: 20,
    alignItems: 'center',
  },

  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4C1D95',
    marginTop: 6,
  },

  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },

  turnoContent: {
    flex: 1,
    marginLeft: 8,
    gap: 6,
  },

  turnoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  turnoDateTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flexShrink: 1,
  },

  estadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },

  estadoText: {
    fontSize: 10,
    fontWeight: '700',
  },

  turnoDetails: {
    gap: 4,
  },

  turnoDetailRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },

  turnoClienteText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flexShrink: 1,
  },

  turnoServicioText: {
    fontSize: 12,
    color: '#64748B',
    flexShrink: 1,
  },

  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    paddingVertical: 16,
    fontSize: 13,
  },

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4C1D95',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
});
