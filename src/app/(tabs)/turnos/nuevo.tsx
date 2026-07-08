import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getServicios, getTurnosPorDia, type Servicio } from '@/services/turnos.service';


const TIME_SLOTS = [
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
];

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
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

function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function formatDateLong(date: Date): string {
  return `${DAYS_OF_WEEK[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

export default function NuevoTurnoScreen() {
  const [services, setServices] = useState<Servicio[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<Servicio | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [loadingOccupied, setLoadingOccupied] = useState(false);
  const [occupiedError, setOccupiedError] = useState<string | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  useEffect(() => {
    async function loadOccupied() {
      setLoadingOccupied(true);
      setOccupiedError(null);
      try {
        const turnos = await getTurnosPorDia(selectedDate);
        const slots: string[] = [];

        turnos?.forEach((t: { inicio: string; Servicio?: { duracion?: number | null } | null }) => {
          // Parse string (e.g. "2026-05-13T14:00:00" as local time)
          const start = new Date(t.inicio);
          const duration = t.Servicio?.duracion ?? 30;

          let current = new Date(start);
          const end = new Date(start.getTime() + duration * 60000);

          while (current < end) {
            const h = current.getHours().toString().padStart(2, '0');
            const m = current.getMinutes().toString().padStart(2, '0');
            slots.push(`${h}:${m}`);
            current.setMinutes(current.getMinutes() + 30);
          }
        });

        setOccupiedSlots(slots);
        // Deseleccionar si el turno seleccionado quedó ocupado
        if (selectedTime && slots.includes(selectedTime)) {
          setSelectedTime(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al cargar los horarios ocupados';
        setOccupiedError(message);
        if (message === 'Usuario no autenticado') {
          Alert.alert(
            'Sesión expirada',
            'Tu sesión expiró. Por favor iniciá sesión nuevamente.',
            [{ text: 'Aceptar', onPress: () => router.replace('/login') }]
          );
        }
      } finally {
        setLoadingOccupied(false);
      }
    }
    loadOccupied();
  }, [selectedDate]);

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const data = await getServicios();
      setServices(data);
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los servicios.');
    } finally {
      setLoadingServices(false);
    }
  };

  const availableDays: Date[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(new Date().getDate() + i);
    return d;
  });

  const canContinue = selectedService && selectedTime;

  function handleNext() {
    if (!selectedService || !selectedTime) return;

    const [h, m] = selectedTime.split(':').map(Number);
    const selectedDateTime = new Date(selectedDate);
    selectedDateTime.setHours(h, m, 0, 0);

    if (selectedDateTime < new Date()) {
      Alert.alert('Horario no válido', 'No podés reservar un turno en el pasado.');
      return;
    }

    router.push({
      pathname: './confirmar',
      params: {
        serviceId: selectedService.id.toString(),
        serviceName: selectedService.nombre ?? '',
        servicePrice: selectedService.precio?.toString() ?? '0',
        serviceDuration: selectedService.duracion?.toString() ?? '0',
        date: selectedDate.toISOString(),
        time: selectedTime,
      },
    });
  }

  return (
    <View style={styles.container}>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Calendar icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="calendar" size={52} color="#1C1C1E" />
        </View>

        {/* Service selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Servicios</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setShowServiceDropdown(!showServiceDropdown);
              setShowDatePicker(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownText, !selectedService && styles.placeholder]}>
              {selectedService ? selectedService.nombre : 'Seleccionar'}
            </Text>
            <Ionicons
              name={showServiceDropdown ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#636366"
            />
          </TouchableOpacity>

          {showServiceDropdown && (
            <View style={styles.dropdownMenu}>
              {loadingServices ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator color="#007AFF" />
                </View>
              ) : (
                services.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.dropdownItem,
                      selectedService?.id === s.id && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedService(s);
                      setShowServiceDropdown(false);
                      setSelectedTime(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedService?.id === s.id && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {s.nombre}
                    </Text>
                    <Text style={styles.dropdownItemPrice}>${s.precio?.toLocaleString('es-AR') ?? 0}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* Date selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Días</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setShowDatePicker(!showDatePicker);
              setShowServiceDropdown(false);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownText}>{formatDate(selectedDate)}</Text>
            <Ionicons
              name={showDatePicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#636366"
            />
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.dropdownMenu}>
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {availableDays.map((day, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.dropdownItem,
                      formatDate(day) === formatDate(selectedDate) && styles.dropdownItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedDate(day);
                      setShowDatePicker(false);
                      setSelectedTime(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        formatDate(day) === formatDate(selectedDate) &&
                          styles.dropdownItemTextSelected,
                      ]}
                    >
                      {formatDateLong(day)}
                    </Text>
                    <Text style={styles.dropdownItemPrice}>{formatDate(day)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Time slots */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Horarios disponibles</Text>
          {occupiedError && !occupiedError.includes('autenticado') && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{occupiedError}</Text>
            </View>
          )}
          {loadingOccupied ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color="#007AFF" />
              <Text style={{ marginTop: 8, color: '#636366' }}>Cargando horarios...</Text>
            </View>
          ) : (
          <View style={styles.timeGrid}>
            {TIME_SLOTS.map((time) => {
              const isOccupied = occupiedSlots.includes(time);
              
              const now = new Date();
              const isToday = selectedDate.getDate() === now.getDate() && 
                              selectedDate.getMonth() === now.getMonth() && 
                              selectedDate.getFullYear() === now.getFullYear();
              let isPast = false;
              if (isToday) {
                const [h, m] = time.split(':').map(Number);
                if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
                  isPast = true;
                }
              }
              
              const isDisabled = isOccupied || isPast;

              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeSlot,
                    selectedTime === time && styles.timeSlotSelected,
                    isDisabled && styles.timeSlotDisabled
                  ]}
                  onPress={() => setSelectedTime(time === selectedTime ? null : time)}
                  activeOpacity={0.75}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.timeSlotText,
                      selectedTime === time && styles.timeSlotTextSelected,
                      isDisabled && styles.timeSlotTextDisabled
                    ]}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomService}>
            {selectedService ? selectedService.nombre : 'Servicio'}
          </Text>
          {selectedService && (
            <Text style={styles.bottomPrice}>${selectedService.precio?.toLocaleString('es-AR') ?? 0}</Text>
          )}
          <Text style={styles.bottomDateTime}>
            {formatDateLong(selectedDate)} · {selectedTime ?? '--:--'} hs
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.nextButton, !canContinue && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingBottom: 120,
  },
  iconContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#3C3C43',
    marginBottom: 8,
    fontWeight: '500',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#C7C7CC',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  placeholder: {
    color: '#8E8E93',
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  dropdownItemSelected: {
    backgroundColor: '#F2F2F7',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#1C1C1E',
  },
  dropdownItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  dropdownItemPrice: {
    fontSize: 13,
    color: '#8E8E93',
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  timeSlot: {
    width: '22%',
    paddingVertical: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotSelected: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  timeSlotDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#F1F5F9',
    opacity: 0.6,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  timeSlotTextSelected: {
    color: '#FFFFFF',
  },
  timeSlotTextDisabled: {
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#DC2626',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  bottomInfo: {
    flex: 1,
  },
  bottomService: {
    fontSize: 13,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  bottomPrice: {
    fontSize: 12,
    color: '#636366',
  },
  bottomDateTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 2,
  },
  nextButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 10,
    marginLeft: 12,
  },
  nextButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
