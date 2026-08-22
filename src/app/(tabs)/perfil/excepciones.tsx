// excepciones.tsx
//
// Carga excepciones puntuales sobre el horario habitual: bloquear una
// franja horaria o el día completo en una fecha concreta.
// Mapea 1 a 1 con `BloqueoHorario` (fecha, hora_inicio, hora_fin, motivo).
//
// La BD modela bloqueos como RANGO (hora_inicio–hora_fin), pero acá se
// tildan slots sueltos de 30': `fusionarSlots()` agrupa los contiguos
// antes de guardar.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getBarbero, type BarberoConBarberia } from '@/services/barbero.service';
import {
  createBloqueo,
  deleteBloqueo,
  getBloqueosDelDia,
  type BloqueoHorario,
} from '@/services/bloqueos.service';
import {
  DEFAULT_APERTURA,
  DEFAULT_CIERRE,
  isDiaHabil,
  parseFechaLocal,
  toHHMM,
} from '@/lib/availability';
import DaySelectField from '@/components/horario/DaySelectField';
import TimeSlotGrid from '@/components/horario/TimeSlotGrid';
import { colors, radius, spacing, type } from '@/components/horario/theme';

type BloqueoUI = {
  id: number;
  horaInicio: string | null; // null = día completo
  horaFin: string | null;
  nota: string | null;
};

function toBloqueoUI(b: BloqueoHorario): BloqueoUI {
  return {
    id: b.id,
    horaInicio: b.hora_inicio ? toHHMM(b.hora_inicio) : null,
    horaFin: b.hora_fin ? toHHMM(b.hora_fin) : null,
    nota: b.motivo,
  };
}

function minutosDesde(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}
function labelDesdeMinutos(mins: number): string {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// {10:00, 10:30} -> [{horaInicio:'10:00', horaFin:'11:00'}]
// {10:00, 11:30} -> [{10:00-10:30}, {11:30-12:00}]
function fusionarSlots(slots: Set<string>, pasoMin = 30) {
  const minutos = Array.from(slots)
    .map(minutosDesde)
    .sort((a, b) => a - b);
  if (!minutos.length) return [] as { horaInicio: string; horaFin: string }[];
  const rangos: { inicio: number; fin: number }[] = [];
  let inicio = minutos[0];
  let anterior = minutos[0];
  for (let i = 1; i < minutos.length; i++) {
    if (minutos[i] === anterior + pasoMin) {
      anterior = minutos[i];
    } else {
      rangos.push({ inicio, fin: anterior + pasoMin });
      inicio = minutos[i];
      anterior = minutos[i];
    }
  }
  rangos.push({ inicio, fin: anterior + pasoMin });
  return rangos.map((r) => ({
    horaInicio: labelDesdeMinutos(r.inicio),
    horaFin: labelDesdeMinutos(r.fin),
  }));
}

function slotsDeRangos(rangos: BloqueoUI[]): Set<string> {
  const set = new Set<string>();
  rangos.forEach((r) => {
    if (r.horaInicio === null || r.horaFin === null) return;
    for (let t = minutosDesde(r.horaInicio); t < minutosDesde(r.horaFin); t += 30) {
      set.add(labelDesdeMinutos(t));
    }
  });
  return set;
}

export default function ExcepcionesScreen() {
  const [barbero, setBarbero] = useState<BarberoConBarberia | null>(null);
  const [loadingBarbero, setLoadingBarbero] = useState(true);

  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null);
  const [existentes, setExistentes] = useState<BloqueoUI[]>([]);
  const [loadingBloqueos, setLoadingBloqueos] = useState(false);
  const [mutando, setMutando] = useState(false);

  const [diaCompleto, setDiaCompleto] = useState(false);
  const [nuevosSlots, setNuevosSlots] = useState<Set<string>>(new Set());
  const [nota, setNota] = useState('');

  useEffect(() => {
    let mounted = true;
    getBarbero()
      .then((data) => {
        if (mounted) setBarbero(data);
      })
      .catch(() => {
        Alert.alert('Error', 'No se pudo cargar tu horario habitual.');
      })
      .finally(() => {
        if (mounted) setLoadingBarbero(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const cargarBloqueos = useCallback(async (fecha: string) => {
    setLoadingBloqueos(true);
    try {
      const data = await getBloqueosDelDia(parseFechaLocal(fecha));
      setExistentes(data.map(toBloqueoUI));
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los bloqueos del día.');
      setExistentes([]);
    } finally {
      setLoadingBloqueos(false);
    }
  }, []);

  const horaApertura = barbero?.hora_apertura ? toHHMM(barbero.hora_apertura) : DEFAULT_APERTURA;
  const horaCierre = barbero?.hora_cierre ? toHHMM(barbero.hora_cierre) : DEFAULT_CIERRE;

  const esLaboral = fechaSeleccionada
    ? isDiaHabil(parseFechaLocal(fechaSeleccionada), barbero?.dias_habiles)
    : false;

  const bloqueoDiaCompletoExistente = existentes.find((b) => b.horaInicio === null);
  const parcialesExistentes = existentes.filter((b) => b.horaInicio !== null);
  const slotsExistentesSet = useMemo(
    () => slotsDeRangos(parcialesExistentes),
    [parcialesExistentes],
  );

  const resetSeleccion = () => {
    setDiaCompleto(false);
    setNuevosSlots(new Set());
    setNota('');
  };

  const toggleSlot = (hora: string) => {
    setNuevosSlots((prev) => {
      const next = new Set(prev);
      if (next.has(hora)) {
        next.delete(hora);
      } else {
        next.add(hora);
      }
      return next;
    });
  };

  const guardarBloqueo = async () => {
    if (!fechaSeleccionada || mutando) return;
    setMutando(true);
    try {
      const motivo = nota.trim() || null;
      if (diaCompleto) {
        await createBloqueo({ fecha: fechaSeleccionada, motivo });
      } else {
        const rangos = fusionarSlots(nuevosSlots);
        await Promise.all(
          rangos.map((r) =>
            createBloqueo({
              fecha: fechaSeleccionada,
              hora_inicio: r.horaInicio,
              hora_fin: r.horaFin,
              motivo,
            }),
          ),
        );
      }
      resetSeleccion();
      await cargarBloqueos(fechaSeleccionada);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar el bloqueo.';
      Alert.alert('Error', message);
    } finally {
      setMutando(false);
    }
  };

  const eliminarBloqueo = async (id: number) => {
    if (!fechaSeleccionada || mutando) return;
    setMutando(true);
    try {
      await deleteBloqueo(id);
      await cargarBloqueos(fechaSeleccionada);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el bloqueo.';
      Alert.alert('Error', message);
    } finally {
      setMutando(false);
    }
  };

  const puedeGuardar = (diaCompleto || nuevosSlots.size > 0) && !mutando;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'right', 'left']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={20} color="#007AFF" />
            <Text style={styles.backText}>Perfil</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Horario</Text>
          <View style={{ width: 60 }} />
        </View>

        {loadingBarbero ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.ink} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
            <Text style={styles.h1}>Excepciones</Text>
            <Text style={styles.intro}>
              Bloqueá una franja o todo el día en una fecha puntual, por fuera de tu horario
              habitual.
            </Text>

            <Text style={styles.label}>Elegí el día</Text>
            <DaySelectField
              maxDays={10}
              selected={fechaSeleccionada}
              onSelect={(fecha) => {
                setFechaSeleccionada(fecha);
                resetSeleccion();
                cargarBloqueos(fecha);
              }}
            />

            {!fechaSeleccionada && (
              <Text style={styles.emptyHint}>
                Elegí un día arriba para configurar una excepción.
              </Text>
            )}

            {fechaSeleccionada && !esLaboral && (
              <Text style={styles.warningText}>
                Ese día no está dentro de tu horario habitual, no hace falta bloquearlo.
              </Text>
            )}

            {fechaSeleccionada && esLaboral && loadingBloqueos && (
              <ActivityIndicator color={colors.ink} style={{ marginTop: spacing(6) }} />
            )}

            {fechaSeleccionada && esLaboral && !loadingBloqueos && bloqueoDiaCompletoExistente && (
              <View style={styles.fullDayBlock}>
                <Text style={styles.fullDayText}>
                  Ya bloqueaste este día completo
                  {bloqueoDiaCompletoExistente.nota ? ` · ${bloqueoDiaCompletoExistente.nota}` : ''}
                  .
                </Text>
                <TouchableOpacity
                  onPress={() => eliminarBloqueo(bloqueoDiaCompletoExistente.id)}
                  disabled={mutando}
                >
                  <Text style={styles.deleteLink}>Eliminar bloqueo</Text>
                </TouchableOpacity>
              </View>
            )}

            {fechaSeleccionada && esLaboral && !loadingBloqueos && !bloqueoDiaCompletoExistente && (
              <>
                {parcialesExistentes.length > 0 && (
                  <>
                    <Text style={styles.label}>Ya bloqueado este día</Text>
                    {parcialesExistentes
                      .slice()
                      .sort((a, b) => minutosDesde(a.horaInicio!) - minutosDesde(b.horaInicio!))
                      .map((b) => (
                        <View key={b.id} style={styles.existingRow}>
                          <View style={{ flexShrink: 1 }}>
                            <Text style={styles.existingHora}>
                              {b.horaInicio}–{b.horaFin}
                            </Text>
                            {b.nota && <Text style={styles.existingNota}>{b.nota}</Text>}
                          </View>
                          <TouchableOpacity
                            onPress={() => eliminarBloqueo(b.id)}
                            disabled={mutando}
                          >
                            <Text style={styles.deleteLink}>Eliminar</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                  </>
                )}

                <View style={styles.diaCompletoRow}>
                  <Text style={styles.diaCompletoText}>Bloquear el día completo</Text>
                  <Switch
                    value={diaCompleto}
                    onValueChange={setDiaCompleto}
                    disabled={parcialesExistentes.length > 0}
                    trackColor={{ false: colors.line, true: colors.danger }}
                    thumbColor={colors.white}
                  />
                </View>
                {parcialesExistentes.length > 0 && (
                  <Text style={styles.errorText}>
                    Ya hay bloqueos cargados este día — eliminalos primero si querés bloquear el día
                    completo.
                  </Text>
                )}

                {!diaCompleto && (
                  <>
                    <Text style={styles.label}>Tocá los horarios que querés bloquear</Text>
                    <TimeSlotGrid
                      horaInicio={horaApertura}
                      horaFin={horaCierre}
                      nuevos={nuevosSlots}
                      existentes={slotsExistentesSet}
                      onToggle={toggleSlot}
                    />
                  </>
                )}

                <Text style={[styles.label, { marginTop: spacing(6) }]}>
                  Nota <Text style={styles.optional}>(opcional)</Text>
                </Text>
                <TextInput
                  style={styles.notaInput}
                  placeholder="Ej: turno médico"
                  placeholderTextColor="#9a9ea6"
                  value={nota}
                  onChangeText={setNota}
                  maxLength={80}
                />

                <TouchableOpacity
                  style={[styles.btnPrimary, !puedeGuardar && styles.btnDisabled]}
                  onPress={guardarBloqueo}
                  disabled={!puedeGuardar}
                  activeOpacity={0.85}
                >
                  {mutando ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Guardar bloqueo</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  kav: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 60 },
  backText: { color: '#007AFF', fontSize: 17 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  screen: { padding: spacing(5), paddingBottom: spacing(10) },
  h1: { ...type.h1, color: colors.ink, marginBottom: spacing(2) },
  intro: { ...type.body, color: colors.inkSoft, lineHeight: 20, marginBottom: spacing(6) },
  label: {
    ...type.label,
    color: colors.inkSoft,
    marginBottom: spacing(3),
    marginTop: spacing(2),
  },
  optional: { textTransform: 'none', fontWeight: '400', color: '#a9adb3' },

  emptyHint: {
    ...type.caption,
    color: colors.inkSoft,
    textAlign: 'center',
    marginTop: spacing(10),
    lineHeight: 20,
  },

  warningText: {
    ...type.caption,
    color: colors.inkSoft,
    backgroundColor: colors.lineSoft,
    padding: spacing(3),
    borderRadius: radius.sm,
    marginTop: spacing(4),
  },

  fullDayBlock: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
    padding: spacing(4),
    marginTop: spacing(4),
  },
  fullDayText: { ...type.body, fontWeight: '600', color: colors.ink, marginBottom: spacing(3) },

  existingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2),
    gap: spacing(2),
  },
  existingHora: { fontSize: 14, fontWeight: '700', color: colors.ink },
  existingNota: { fontSize: 12.5, color: colors.inkSoft, marginTop: 2 },
  deleteLink: { fontSize: 12.5, fontWeight: '600', color: colors.danger },

  diaCompletoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing(5),
    marginBottom: spacing(2),
    paddingVertical: spacing(2),
  },
  diaCompletoText: { ...type.body, fontWeight: '600', color: colors.ink },
  errorText: { color: colors.danger, fontSize: 12.5, marginBottom: spacing(4) },

  notaInput: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing(3),
    paddingVertical: 12,
    fontSize: 14.5,
    color: colors.ink,
    marginBottom: spacing(2),
  },

  btnPrimary: {
    marginTop: spacing(6),
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 14.5 },
});
