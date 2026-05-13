import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getServicios, getTurnosPorDia, type Servicio } from '@/services/turnos.service';

const TIME_SLOTS = [
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

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

export default function ModificarTurnoModal({ visible, turno, onClose, onSave }: ModificarTurnoModalProps) {
  const [services, setServices] = useState<Servicio[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  
  const [selectedService, setSelectedService] = useState<Servicio | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      loadServices();
      if (turno) {
        const startDate = new Date(turno.inicio);
        setSelectedDate(startDate);
        setSelectedTime(`${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`);
      }
    } else {
      // Reset state on close
      setSelectedTime(null);
      setOccupiedSlots([]);
    }
  }, [visible, turno]);

  useEffect(() => {
    async function loadOccupied() {
      if (!visible) return;
      try {
        const turnos = await getTurnosPorDia(selectedDate);
        const slots: string[] = [];
        
        turnos.forEach((t: any) => {
          if (turno && t.id === turno.id) return; // omitir el turno actual

          const start = new Date(t.inicio);
          const duration = t.Servicio?.duracion || 30;
          
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
        
        // Si no estamos inicializando con el turno viejo y el seleccionado se ocupó
        if (selectedTime && slots.includes(selectedTime) && turno?.inicio) {
          const oldTimeH = new Date(turno.inicio).getHours().toString().padStart(2, '0');
          const oldTimeM = new Date(turno.inicio).getMinutes().toString().padStart(2, '0');
          if (selectedTime !== `${oldTimeH}:${oldTimeM}`) {
            setSelectedTime(null);
          }
        }
      } catch (err) {
        console.error('Error cargando turnos del dia:', err);
      }
    }
    loadOccupied();
  }, [selectedDate, visible, turno]);

  const loadServices = async () => {
    try {
      setLoadingServices(true);
      const data = await getServicios();
      setServices(data);
      if (turno?.servicio_id) {
        const currentService = data.find(s => s.id === turno.servicio_id);
        if (currentService) setSelectedService(currentService);
      }
    } catch (error) {
      // Ignorar
    } finally {
      setLoadingServices(false);
    }
  };

  const availableDays: Date[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(new Date().getDate() + i);
    return d;
  });

  const handleSave = () => {
    if (!selectedService || !selectedTime) return;
    
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
                onPress={() => { setShowServiceDropdown(!showServiceDropdown); setShowDatePicker(false); }}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownText}>
                  {selectedService ? selectedService.nombre : 'Seleccionar'}
                </Text>
                <Ionicons name={showServiceDropdown ? 'chevron-up' : 'chevron-down'} size={18} color="#636366" />
              </TouchableOpacity>
              
              {showServiceDropdown && (
                <View style={styles.dropdownMenu}>
                  {loadingServices ? (
                    <ActivityIndicator style={{ padding: 16 }} />
                  ) : (
                    services.map(s => (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.dropdownItem, selectedService?.id === s.id && styles.dropdownItemSelected]}
                        onPress={() => { setSelectedService(s); setShowServiceDropdown(false); }}
                      >
                        <Text style={[styles.dropdownItemText, selectedService?.id === s.id && styles.dropdownItemTextSelected]}>
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
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => { setShowDatePicker(!showDatePicker); setShowServiceDropdown(false); }}
                activeOpacity={0.8}
              >
                <Text style={styles.dropdownText}>{formatDateLong(selectedDate)}</Text>
                <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={18} color="#636366" />
              </TouchableOpacity>

              {showDatePicker && (
                <View style={styles.dropdownMenu}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {availableDays.map((day, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.dropdownItem, formatDate(day) === formatDate(selectedDate) && styles.dropdownItemSelected]}
                        onPress={() => { setSelectedDate(day); setShowDatePicker(false); }}
                      >
                        <Text style={[styles.dropdownItemText, formatDate(day) === formatDate(selectedDate) && styles.dropdownItemTextSelected]}>
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
                      onPress={() => setSelectedTime(time)}
                      activeOpacity={0.75}
                      disabled={isDisabled}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        selectedTime === time && styles.timeSlotTextSelected,
                        isDisabled && styles.timeSlotTextDisabled
                      ]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
