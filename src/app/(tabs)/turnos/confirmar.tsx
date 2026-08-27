import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { createAppointment, type OrigenTurno } from '@/services/turnos.service';
import TurnoHeader from '@/components/turnos/TurnoHeader';
import { colors, radius } from '@/components/turnos/theme';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ConfirmarTurnoScreen() {
  const params = useLocalSearchParams<{
    serviceId: string;
    serviceName: string;
    servicePrice: string;
    serviceDuration: string;
    date: string;
    time: string;
  }>();

  const date = new Date(params.date);
  const duration = parseInt(params.serviceDuration, 10);
  const price = parseInt(params.servicePrice, 10);
  const serviceId = parseInt(params.serviceId, 10);
  const timeParts = params.time?.split(':').map(Number) ?? [];

  const paramsValid =
    !isNaN(date.getTime()) &&
    !isNaN(duration) &&
    !isNaN(price) &&
    !isNaN(serviceId) &&
    timeParts.length === 2 &&
    !isNaN(timeParts[0]) &&
    !isNaN(timeParts[1]);

  const endTime = (() => {
    const [h, m] = timeParts;
    const total = h * 60 + m + duration;
    const eh = Math.floor(total / 60);
    const em = total % 60;
    return `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
  })();

  const formattedDate = paramsValid
    ? `${DAYS_OF_WEEK[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`
    : '';

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [origen, setOrigen] = useState<OrigenTurno>('presencial');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const telefonoLimpio = telefono.replace(/\D/g, '');
  // Telefono es opcional: si se ingresa, debe tener 8-15 digitos; vacio es valido
  const telefonoValid =
    telefonoLimpio.length === 0 || (telefonoLimpio.length >= 8 && telefonoLimpio.length <= 15);
  const canReserve =
    paramsValid && nombre.trim().length >= 2 && apellido.trim().length >= 2 && telefonoValid;

  async function handleReservar() {
    if (!canReserve) return;
    setLoading(true);
    try {
      const [h, m] = timeParts;
      const startDateTime = new Date(date);
      startDateTime.setHours(h, m, 0, 0);

      const tzOffset = startDateTime.getTimezoneOffset() * 60000;
      const localISOTime = new Date(startDateTime.getTime() - tzOffset).toISOString().slice(0, -1);

      await createAppointment({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefonoLimpio ? parseInt(telefonoLimpio, 10) : null,
        servicio_id: serviceId,
        inicio: localISOTime,
        origen,
      });

      setShowSuccessModal(true);
    } catch (error: any) {
      const friendlyMessage = error?.message ?? 'No se pudo confirmar el turno. Intentá de nuevo.';
      Alert.alert('Error', friendlyMessage);
    } finally {
      setLoading(false);
    }
  }

  if (!paramsValid) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.headerWrap}>
          <TurnoHeader title="Turnos" />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="warning-outline" size={48} color={colors.red} />
          <Text style={styles.emptyStateText}>Los datos del turno no son válidos.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      // Android: el resize nativo maneja el teclado; 'height' colapsaba el header.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.headerWrap}>
        <TurnoHeader title="Turnos" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Calendar icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="calendar" size={52} color="#1C1C1E" />
        </View>

        {/* Booking summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.summaryText}>{formattedDate}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={16} color={colors.primary} />
            <Text style={styles.summaryText}>{params.serviceName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="cut-outline" size={16} color={colors.primary} />
            <Text style={styles.summaryText}>
              {params.time} - {endTime}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Ionicons name="card-outline" size={16} color={colors.primary} />
            <Text style={styles.summaryPrice}>${price.toLocaleString('es-AR')}</Text>
          </View>
        </View>

        {/* Customer data form */}
        <Text style={styles.sectionTitle}>Datos del cliente</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={styles.input}
            placeholder="Pablo"
            placeholderTextColor={colors.inkSoft}
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Apellido</Text>
          <TextInput
            style={styles.input}
            placeholder="Perez"
            placeholderTextColor={colors.inkSoft}
            value={apellido}
            onChangeText={setApellido}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Teléfono (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Celular"
            placeholderTextColor={colors.inkSoft}
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            returnKeyType="done"
          />
        </View>

        {/* Origen de la reserva */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Origen</Text>
          <View style={styles.origenRow}>
            <TouchableOpacity
              style={[styles.origenButton, origen === 'presencial' && styles.origenButtonSelected]}
              onPress={() => setOrigen('presencial')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="storefront-outline"
                size={18}
                color={origen === 'presencial' ? '#FFFFFF' : colors.inkSoft}
              />
              <Text
                style={[styles.origenText, origen === 'presencial' && styles.origenTextSelected]}
              >
                Presencial
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.origenButton, origen === 'whatsapp' && styles.origenButtonSelected]}
              onPress={() => setOrigen('whatsapp')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="logo-whatsapp"
                size={18}
                color={origen === 'whatsapp' ? '#FFFFFF' : colors.inkSoft}
              />
              <Text style={[styles.origenText, origen === 'whatsapp' && styles.origenTextSelected]}>
                WhatsApp
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Reserve button */}
        <TouchableOpacity
          style={[styles.reserveButton, (!canReserve || loading) && styles.reserveButtonDisabled]}
          onPress={handleReservar}
          disabled={!canReserve || loading}
          activeOpacity={0.85}
        >
          <Text style={styles.reserveButtonText}>{loading ? 'Reservando...' : 'Reservar'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#34C759" />
            </View>
            <Text style={styles.modalTitle}>¡Turno reservado!</Text>
            <Text style={styles.modalMessage}>
              Tu turno para {params.serviceName} el {formattedDate} a las {params.time} hs ha sido
              confirmado.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.navigate('/(tabs)/turnos');
              }}
            >
              <Text style={styles.modalButtonText}>Ver mis turnos</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  headerWrap: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  summaryCard: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 28,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryText: {
    fontSize: 15,
    color: colors.ink,
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.primaryLine,
    marginVertical: 4,
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  reserveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  reserveButtonDisabled: {
    backgroundColor: colors.line,
  },
  reserveButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  origenRow: {
    flexDirection: 'row',
    gap: 12,
  },
  origenButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  origenButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  origenText: {
    fontSize: 15,
    color: colors.inkSoft,
    fontWeight: '600',
  },
  origenTextSelected: {
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.ink,
    textAlign: 'center',
  },
  secondaryButton: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },
});
