import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { getBarbero, type BarberoConBarberia } from '@/services/barbero.service';
import { getBloqueosDelDia } from '@/services/bloqueos.service';
import { getServicios, getTurnosPorDia, type Servicio } from '@/services/turnos.service';
import { computeOccupiedSlots, generateTimeSlots, isDiaHabil } from '@/lib/availability';
import DayStrip, { buildDayRange } from '@/components/turnos/DayStrip';
import TurnoHeader from '@/components/turnos/TurnoHeader';
import { colors, radius } from '@/components/turnos/theme';

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

function formatDateLong(date: Date): string {
  return `${DAYS_OF_WEEK[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

export default function NuevoTurnoScreen() {
  const [barbero, setBarbero] = useState<BarberoConBarberia | null>(null);
  const [services, setServices] = useState<Servicio[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedService, setSelectedService] = useState<Servicio | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [loadingOccupied, setLoadingOccupied] = useState(false);
  const [occupiedError, setOccupiedError] = useState<string | null>(null);

  // Slots generados según apertura/cierre del barbero
  const timeSlots = generateTimeSlots(barbero?.hora_apertura, barbero?.hora_cierre);

  // Solo días futuros: hoy + 14. Los no hábiles se deshabilitan en el strip.
  const diasFuturos = useMemo(() => buildDayRange({ back: 0, forward: 14 }), []);

  useEffect(() => {
    loadBarbero();
    loadServices();
  }, []);

  useEffect(() => {
    async function loadOccupied() {
      setLoadingOccupied(true);
      setOccupiedError(null);
      try {
        const [turnos, bloqueos] = await Promise.all([
          getTurnosPorDia(selectedDate),
          getBloqueosDelDia(selectedDate),
        ]);
        const slots = computeOccupiedSlots(turnos, bloqueos);

        setOccupiedSlots(slots);
        // Deseleccionar si el turno seleccionado quedó ocupado
        if (selectedTime && slots.includes(selectedTime)) {
          setSelectedTime(null);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Error al cargar los horarios ocupados';
        setOccupiedError(message);
        if (message === 'Usuario no autenticado') {
          Alert.alert('Sesión expirada', 'Tu sesión expiró. Por favor iniciá sesión nuevamente.', [
            { text: 'Aceptar', onPress: () => router.replace('/login') },
          ]);
        }
      } finally {
        setLoadingOccupied(false);
      }
    }
    loadOccupied();
  }, [selectedDate]);

  const loadBarbero = async () => {
    try {
      const data = await getBarbero();
      setBarbero(data);

      // Si el día seleccionado no es hábil para el barbero, saltar al primero hábil
      if (data && !isDiaHabil(selectedDate, data.dias_habiles)) {
        const next = Array.from({ length: 15 }, (_, i) => {
          const d = new Date();
          d.setDate(new Date().getDate() + i);
          return d;
        }).find((d) => isDiaHabil(d, data.dias_habiles));
        if (next) setSelectedDate(next);
      }
    } catch {
      // sin config del barbero, se usan los defaults de availability.ts
    }
  };

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
        <TurnoHeader title="Turnos" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Service selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Servicios</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowServiceDropdown(!showServiceDropdown)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dropdownText, !selectedService && styles.placeholder]}>
              {selectedService ? selectedService.nombre : 'Seleccionar'}
            </Text>
            <Ionicons
              name={showServiceDropdown ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.inkSoft}
            />
          </TouchableOpacity>

          {showServiceDropdown && (
            <View style={styles.dropdownMenu}>
              {loadingServices ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary} />
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
                    <Text style={styles.dropdownItemPrice}>
                      ${s.precio?.toLocaleString('es-AR') ?? 0}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* Day selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Días</Text>
          <DayStrip
            days={diasFuturos}
            selected={selectedDate}
            onSelect={(day) => {
              setSelectedDate(day);
              setSelectedTime(null);
            }}
            isDisabled={(day) => !isDiaHabil(day, barbero?.dias_habiles)}
          />
        </View>

        {/* Time slots */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Horarios disponibles</Text>
          {occupiedError && !occupiedError.includes('autenticado') && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.red} />
              <Text style={styles.errorText}>{occupiedError}</Text>
            </View>
          )}
          {loadingOccupied ? (
            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ marginTop: 8, color: colors.inkSoft }}>Cargando horarios...</Text>
            </View>
          ) : (
            <View style={styles.timeGrid}>
              {timeSlots.map((time) => {
                const isOccupied = occupiedSlots.includes(time);

                const now = new Date();
                const isToday =
                  selectedDate.getDate() === now.getDate() &&
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
                      isDisabled && styles.timeSlotDisabled,
                    ]}
                    onPress={() => setSelectedTime(time === selectedTime ? null : time)}
                    activeOpacity={0.75}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        selectedTime === time && styles.timeSlotTextSelected,
                        isDisabled && styles.timeSlotTextDisabled,
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

      {/* Summary bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomService}>
            {selectedService ? selectedService.nombre : 'Servicio'}
          </Text>
          {selectedService && (
            <Text style={styles.bottomPrice}>
              ${selectedService.precio?.toLocaleString('es-AR') ?? 0}
            </Text>
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
    backgroundColor: colors.white,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : 24,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    color: colors.ink,
    marginBottom: 8,
    fontWeight: '700',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.white,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.ink,
  },
  placeholder: {
    color: colors.inkSoft,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    marginTop: 4,
    backgroundColor: colors.white,
    overflow: 'hidden',
    shadowColor: colors.ink,
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
    borderBottomColor: colors.line,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primarySoft,
  },
  dropdownItemText: {
    fontSize: 15,
    color: colors.ink,
  },
  dropdownItemTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  dropdownItemPrice: {
    fontSize: 13,
    color: colors.inkSoft,
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
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSlotSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  timeSlotDisabled: {
    backgroundColor: colors.lineSoft,
    borderColor: colors.lineSoft,
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  timeSlotTextSelected: {
    color: colors.white,
  },
  timeSlotTextDisabled: {
    color: colors.inkSoft,
    textDecorationLine: 'line-through',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.redBg,
    borderColor: colors.red,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    gap: 10,
  },
  errorText: {
    color: colors.red,
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
    borderTopColor: colors.line,
    backgroundColor: colors.white,
  },
  bottomInfo: {
    flex: 1,
  },
  bottomService: {
    fontSize: 13,
    color: colors.ink,
    fontWeight: '700',
  },
  bottomPrice: {
    fontSize: 12,
    color: colors.inkSoft,
  },
  bottomDateTime: {
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: 2,
  },
  nextButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: radius.sm,
    marginLeft: 12,
  },
  nextButtonDisabled: {
    backgroundColor: colors.line,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
