import Screen from '@/components/ui/Screen';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { upcomingAppointments } from './data';

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  completado: 'Completado',
};

const STATUS_COLORS: Record<string, string> = {
  pendiente: '#F97316',
  confirmado: '#2563EB',
  completado: '#16A34A',
};

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatLongDate(date: Date) {
  return `${DAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}

export default function TurnoDetalleScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const turnoId = Number(params.id);
  const turno = upcomingAppointments.find((item) => item.id === turnoId);

  if (!turno) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Turno no encontrado.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const start = new Date(turno.inicio);
  const end = new Date(turno.fin);
  const statusColor = STATUS_COLORS[turno.estado] ?? '#0F172A';

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Turnos</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar" size={52} color="#0F172A" />
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={styles.sectionTitle}>Cliente</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusBadgeText}>
                {STATUS_LABELS[turno.estado] ?? turno.estado}
              </Text>
            </View>
          </View>

          <Text style={styles.clientName}>
            {turno.cliente?.nombre ?? `Cliente #${turno.cliente_id}`}
          </Text>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#64748B" />
            <Text style={styles.infoText}>{formatLongDate(start)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color="#64748B" />
            <Text style={styles.infoText}>
              {formatTime(start)} - {formatTime(end)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="cut-outline" size={18} color="#64748B" />
            <Text style={styles.infoText}>{turno.servicio ?? 'Servicio no especificado'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={18} color="#64748B" />
            <Text style={styles.infoText}>{formatCurrency(turno.precio)}</Text>
          </View>
        </View>

        <View style={styles.primaryActions}>
          <TouchableOpacity style={[styles.actionButton, styles.alertButton]} onPress={() => {}}>
            <Text style={styles.actionButtonText}>Ausente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.completeButton]} onPress={() => {}}>
            <Text style={styles.actionButtonText}>Finalizar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.secondaryButton} onPress={() => {}}>
          <Text style={styles.secondaryButtonText}>Contactar por wsp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => {}}>
          <Text style={styles.secondaryButtonText}>Modificar turno</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => {}}>
          <Text style={styles.secondaryButtonText}>Cancelar turno</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  backText: {
    color: '#007AFF',
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  content: {
    gap: 18,
  },
  iconContainer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 18,
    gap: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  clientName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    color: '#334155',
    fontSize: 15,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  alertButton: {
    backgroundColor: '#EF4444',
  },
  completeButton: {
    backgroundColor: '#16A34A',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#CBD5E1',
    marginVertical: 4,
  },
  secondaryButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
  },
});
