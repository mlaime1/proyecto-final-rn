import Screen from '@/components/ui/Screen';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getTurnoById, updateTurno } from '@/services/turnos.service';
import { useEffect, useState } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AlertModal from '@/components/ui/AlertModal';
import ModificarTurnoModal from '@/components/ui/ModificarTurnoModal';
import TurnoHeader from '@/components/turnos/TurnoHeader';
import TurnoStatusPill from '@/components/turnos/TurnoStatusPill';
import { colors, radius } from '@/components/turnos/theme';

const STATUS_LABELS: Record<string, string> = {
  confirmado: 'Confirmado',
  cancelado: 'Cancelado',
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
    hour12: false,
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
  const { id } = useLocalSearchParams();
  const turnoId = Number(Array.isArray(id) ? id[0] : id);

  const [turno, setTurno] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ visible: boolean; status: string }>({
    visible: false,
    status: '',
  });
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ visible: false, title: '', message: '', type: 'info' });
  const [modificarModalVisible, setModificarModalVisible] = useState(false);

  useEffect(() => {
    if (!turnoId || isNaN(turnoId)) {
      setError('ID de turno inválido');
      setLoading(false);
      return;
    }

    async function loadTurno() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTurnoById(turnoId);
        setTurno(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar el turno');
      } finally {
        setLoading(false);
      }
    }
    loadTurno();
  }, [turnoId]);

  const executeStatusUpdate = async (status: string) => {
    try {
      setUpdating(true);
      await updateTurno(turnoId, { estado: status as 'confirmado' | 'cancelado' });
      setTurno((prev: any) => ({ ...prev, estado: status }));
      setAlertModal({
        visible: true,
        title: 'Éxito',
        message: `El turno fue marcado como ${STATUS_LABELS[status].toLowerCase()}.`,
        type: 'success',
      });
    } catch (err: any) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: err.message || 'No se pudo actualizar el estado.',
        type: 'error',
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = (status: string) => {
    setConfirmModal({ visible: true, status });
  };

  const handleModificarTurno = async (data: { servicio_id: number; inicio: string }) => {
    try {
      setModificarModalVisible(false);
      setUpdating(true);
      await updateTurno(turnoId, data);

      const updated = await getTurnoById(turnoId);
      setTurno(updated);

      setAlertModal({
        visible: true,
        title: 'Éxito',
        message: 'El turno fue modificado correctamente.',
        type: 'success',
      });
    } catch (err: any) {
      setAlertModal({
        visible: true,
        title: 'Error',
        message: err.message || 'No se pudo modificar el turno.',
        type: 'error',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { marginTop: 12 }]}>Cargando turno...</Text>
        </View>
      </Screen>
    );
  }

  if (error || !turno) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{error || 'Turno no encontrado.'}</Text>
          <TouchableOpacity style={styles.outlineButton} onPress={() => router.back()}>
            <Text style={styles.outlineButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const start = new Date(turno.inicio);
  const duracionMs = (turno.duracion_minutos || 30) * 60000;
  const end = new Date(start.getTime() + duracionMs);

  return (
    <Screen>
      <TurnoHeader title="Turnos" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="calendar" size={44} color={colors.primary} />
        </View>

        <View style={styles.detailCard}>
          <View style={styles.detailHeader}>
            <Text style={styles.sectionLabel}>Cliente</Text>
            <TurnoStatusPill estado={turno.estado} />
          </View>

          <Text style={styles.clientName}>
            {turno.Cliente?.nombre ?? `Cliente #${turno.cliente_id}`}
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.infoText}>{formatLongDate(start)}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.infoText}>
              {formatTime(start)} - {formatTime(end)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="cut-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.infoText}>
              {turno.Servicio?.nombre ?? 'Servicio no especificado'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="card-outline" size={16} color={colors.primary} />
            </View>
            <Text style={styles.infoText}>{formatCurrency(turno.Servicio?.precio || 0)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.outlineButton} onPress={() => {}}>
          <Text style={styles.outlineButtonText}>Contactar por wsp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, updating && styles.buttonDisabled]}
          disabled={updating}
          onPress={() => setModificarModalVisible(true)}
        >
          <Text style={styles.primaryButtonText}>Modificar turno</Text>
        </TouchableOpacity>
        {turno.estado !== 'cancelado' && (
          <TouchableOpacity
            style={[styles.ghostDangerButton, updating && styles.buttonDisabled]}
            disabled={updating}
            onPress={() => handleUpdateStatus('cancelado')}
          >
            {updating ? (
              <ActivityIndicator color={colors.red} />
            ) : (
              <Text style={styles.ghostDangerText}>Cancelar turno</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      <ConfirmModal
        visible={confirmModal.visible}
        title="Confirmar acción"
        message={`¿Estás seguro de marcar el turno como ${
          confirmModal.status ? STATUS_LABELS[confirmModal.status].toLowerCase() : ''
        }?`}
        onCancel={() => setConfirmModal({ visible: false, status: '' })}
        onConfirm={() => {
          setConfirmModal({ visible: false, status: '' });
          executeStatusUpdate(confirmModal.status);
        }}
        confirmText="Sí, marcar"
        cancelText="No, volver"
        isDestructive={confirmModal.status === 'cancelado'}
      />

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({ ...alertModal, visible: false })}
      />

      <ModificarTurnoModal
        visible={modificarModalVisible}
        turno={turno}
        onClose={() => setModificarModalVisible(false)}
        onSave={handleModificarTurno}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 18,
  },
  iconContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  clientName: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.ink,
    marginTop: -6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    color: colors.ink,
    fontSize: 13.5,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginVertical: 4,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 13,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  outlineButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 13,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  ghostDangerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  ghostDangerText: {
    color: colors.red,
    fontWeight: '700',
    fontSize: 13.5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.inkSoft,
  },
});
