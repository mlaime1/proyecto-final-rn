import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getServicios, getTurnosPorDia, type Servicio } from '@/services/turnos.service';
import { getBarbero, type BarberoConBarberia } from '@/services/barbero.service';
import { getBloqueosDelDia } from '@/services/bloqueos.service';
import {
  computeOccupiedSlots,
  estaEnVentana,
  generateTimeSlots,
  isDiaHabil,
  resolverHorarioReservable,
} from '@/lib/availability';
import { showAlert } from '@/lib/alert';

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

interface ModificarTurnoModalProps {
  visible: boolean;
  turno: any;
  onClose: () => void;
  onSave: (data: { servicio_id: number; inicio: string }) => void;
}

export default function ModificarTurnoModal({
  visible,
  turno,
  onClose,
  onSave,
}: ModificarTurnoModalProps) {
  const [barbero, setBarbero] = useState<BarberoConBarberia | null>(null);
  const [services, setServices] = useState<Servicio[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [selectedService, setSelectedService] = useState<Servicio | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(new Set());

  // Horario reservable: intersección barbero ∩ barbería (techo del local).
  // Sin intersección el estado es "cerrado" (origen 'cerrado') y no hay slots.
  const horario = useMemo(() => resolverHorarioReservable(barbero, barbero?.Barberia), [barbero]);

  // Estado "cerrado": en vez de una grilla muda se muestra el aviso.
  const sinHorario = horario.origen === 'cerrado';

  // Día fuera del techo: también aviso, aunque la intersección global tenga
  // días válidos.
  const diaNoHabil = !isDiaHabil(selectedDate, horario.dias_habiles);

  // Slots generados según apertura/cierre efectivos (vacío si "cerrado")
  const timeSlots = useMemo(
    () => generateTimeSlots(horario.hora_apertura, horario.hora_cierre),
    [horario],
  );

  useEffect(() => {
    let mounted = true;

    if (visible) {
      getBarbero()
        .then((data) => {
          if (mounted) setBarbero(data);
        })
        .catch(() => {
          // getBarbero() null = cuenta no vinculada: se deja el estado
          // "cerrado" con su aviso, sin caer a defaults en silencio.
        });

      (async () => {
        try {
          setLoadingServices(true);
          const data = await getServicios();
          if (!mounted) return;
          setServices(data);
          if (turno?.servicio_id) {
            const currentService = data.find((s) => s.id === turno.servicio_id);
            if (currentService) setSelectedService(currentService);
          }
        } catch {
          // Ignorar
        } finally {
          if (mounted) setLoadingServices(false);
        }
      })();

      if (turno) {
        const startDate = new Date(turno.inicio);
        if (mounted) {
          setSelectedDate(startDate);
          setSelectedTime(
            `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`,
          );
        }
      }
    } else {
      if (mounted) {
        // Reset state on close
        setSelectedTime(null);
        setOccupiedSlots(new Set());
      }
    }

    return () => {
      mounted = false;
    };
  }, [visible, turno]);

  useEffect(() => {
    // Igual que en nuevo.tsx: `mounted` es por ejecución del efecto y el cleanup
    // descarta las respuestas de una fecha ya abandonada, sin necesidad de un token.
    let mounted = true;

    async function loadOccupied() {
      if (!visible) return;
      try {
        const [turnos, bloqueos] = await Promise.all([
          getTurnosPorDia(selectedDate),
          getBloqueosDelDia(selectedDate),
        ]);

        if (!mounted) return;

        // omitir el turno actual del cálculo de ocupados
        const otrosTurnos = turno ? turnos.filter((t) => t.id !== turno.id) : turnos;
        const slots = computeOccupiedSlots(otrosTurnos, bloqueos);

        setOccupiedSlots(slots);

        // Si no estamos inicializando con el turno viejo y el seleccionado se ocupó
        if (selectedTime && slots.has(selectedTime) && turno?.inicio) {
          const oldTimeH = new Date(turno.inicio).getHours().toString().padStart(2, '0');
          const oldTimeM = new Date(turno.inicio).getMinutes().toString().padStart(2, '0');
          if (selectedTime !== `${oldTimeH}:${oldTimeM}`) {
            setSelectedTime(null);
          }
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Error cargando turnos del dia:', err);
      }
    }
    loadOccupied();

    return () => {
      mounted = false;
    };
  }, [selectedDate, visible, turno]);

  // Solo días reservables (intersección) dentro de los próximos 14 días
  const availableDays: Date[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(new Date().getDate() + i);
    return d;
  }).filter((day) => isDiaHabil(day, horario.dias_habiles));

  const handleSave = () => {
    if (!selectedService || !selectedTime) return;

    // Defensa ante estado viejo: el día tiene que estar en la intersección y
    // el slot dentro de la ventana. Se avisa con alerta, como en nuevo.tsx.
    if (!isDiaHabil(selectedDate, horario.dias_habiles)) {
      showAlert('Día no disponible', 'Ese día no hay atención. Elegí otro día hábil.');
      return;
    }

    if (!estaEnVentana(selectedTime, horario.hora_apertura, horario.hora_cierre)) {
      showAlert('Horario no válido', 'Está fuera del horario de atención.');
      return;
    }

    const [h, m] = selectedTime.split(':').map(Number);
    const newInicio = new Date(selectedDate);
    newInicio.setHours(h, m, 0, 0);

    const tzOffset = newInicio.getTimezoneOffset() * 60000;
    const localISOTime = new Date(newInicio.getTime() - tzOffset).toISOString().slice(0, -1);

    onSave({
      servicio_id: selectedService.id,
      inicio: localISOTime,
    });
  };

  const canSave = selectedService && selectedTime;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Modificar Turno</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1C1C1E" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Service */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Servicio</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setShowServiceDropdown(!showServiceDropdown);
                  setShowDatePicker(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownText}>
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
                    <ActivityIndicator style={{ padding: 16 }} />
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
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Date */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Fecha</Text>
              {sinHorario && (
                <Text style={styles.avisoHint}>
                  Sin horario configurado: cargá el horario del profesional para elegir fecha.
                </Text>
              )}
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setShowDatePicker(!showDatePicker);
                  setShowServiceDropdown(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownText}>{formatDateLong(selectedDate)}</Text>
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
                          formatDate(day) === formatDate(selectedDate) &&
                            styles.dropdownItemSelected,
                        ]}
                        onPress={() => {
                          setSelectedDate(day);
                          setShowDatePicker(false);
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
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Time */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Horario</Text>
              {sinHorario || diaNoHabil ? (
                <View style={styles.avisoBox}>
                  <Ionicons name="information-circle-outline" size={18} color="#4C1D95" />
                  <View style={styles.avisoBody}>
                    <Text style={styles.avisoTitle}>
                      {sinHorario ? 'Sin horario configurado' : 'Día no disponible'}
                    </Text>
                    <Text style={styles.avisoText}>
                      {sinHorario
                        ? 'Cargá el horario del profesional para ver los horarios disponibles.'
                        : 'Ese día no hay atención. Elegí otro día hábil.'}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.timeGrid}>
                  {timeSlots.map((time) => {
                    const isOccupied = occupiedSlots.has(time);

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
                        onPress={() => setSelectedTime(time)}
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

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
              disabled={!canSave}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>Guardar Cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
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
  dropdownMenu: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownItem: {
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
  avisoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EDE9FE',
    borderWidth: 1,
    borderColor: '#C4B5FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  avisoBody: {
    flex: 1,
  },
  avisoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  avisoText: {
    fontSize: 13,
    color: '#636366',
    marginTop: 2,
  },
  avisoHint: {
    fontSize: 13,
    color: '#636366',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#C7C7CC',
  },
  cancelBtnText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '600',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
