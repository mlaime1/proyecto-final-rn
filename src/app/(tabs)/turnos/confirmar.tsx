import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { createAppointment } from '@/services/turnos.service';
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
  // Recibimos los params de nuevo.tsx
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

  const endTime = (() => {
    const [h, m] = params.time.split(':').map(Number);
    const total = h * 60 + m + duration;
    const eh = Math.floor(total / 60);
    const em = total % 60;
    return `${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`;
  })();

  const formattedDate = `${DAYS_OF_WEEK[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`;

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [telefono, setTelefono] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const canReserve = nombre.trim() && apellido.trim() && telefono.trim().length >= 8;

  async function handleReservar() {
    if (!canReserve) return;
    setLoading(true);
    try {
      const [h, m] = params.time.split(':').map(Number);
      const startDateTime = new Date(date);
      startDateTime.setHours(h, m, 0, 0);

      await createAppointment({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: parseInt(telefono, 10),
        servicio_id: parseInt(params.serviceId, 10),
        inicio: startDateTime.toISOString(),
      });

      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo confirmar el turno. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={20} color="#007AFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Turnos</Text>
        <View style={{ width: 60 }} />
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
            <Ionicons name="calendar-outline" size={16} color="#636366" />
            <Text style={styles.summaryText}>{formattedDate}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="time-outline" size={16} color="#636366" />
            <Text style={styles.summaryText}>{params.serviceName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Ionicons name="cut-outline" size={16} color="#636366" />
            <Text style={styles.summaryText}>
              {params.time} - {endTime}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Ionicons name="card-outline" size={16} color="#636366" />
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
            placeholderTextColor="#C7C7CC"
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
            placeholderTextColor="#C7C7CC"
            value={apellido}
            onChangeText={setApellido}
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="Celular"
            placeholderTextColor="#C7C7CC"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            returnKeyType="done"
          />
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
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#34C759" />
            </View>
            <Text style={styles.modalTitle}>¡Turno reservado!</Text>
            <Text style={styles.modalMessage}>
              Tu turno para {params.serviceName} el {formattedDate} a las {params.time} hs ha sido confirmado.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowSuccessModal(false);
                router.push('/(tabs)/turnos');
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: 60,
  },
  backText: {
    color: '#007AFF',
    fontSize: 17,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
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
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
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
    color: '#1C1C1E',
  },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#C7C7CC',
    marginVertical: 4,
  },
  summaryPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#636366',
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#FFFFFF',
  },
  reserveButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  reserveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  reserveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
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
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#636366',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
