// horario.tsx
//
// Configura el patrón semanal recurrente del barbero: qué días trabaja
// y en qué franja horaria general. Mapea 1 a 1 con la tabla `Barbero`
// (dias_habiles, hora_apertura, hora_cierre).

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getBarbero, updateHorarioHabitual } from '@/services/barbero.service';
import { DEFAULT_APERTURA, DEFAULT_CIERRE, toHHMM } from '@/lib/availability';
import { colors, radius, spacing, type } from '@/components/horario/theme';
import Screen from '@/components/ui/Screen';
import ProfileHeader from '@/components/ui/ProfileHeader';

// Convención JS (Date.getDay()): 0=Dom … 6=Sáb. Se muestran de Lunes a Domingo.
const DIAS = [
  { id: 1, label: 'L' },
  { id: 2, label: 'M' },
  { id: 3, label: 'X' },
  { id: 4, label: 'J' },
  { id: 5, label: 'V' },
  { id: 6, label: 'S' },
  { id: 0, label: 'D' },
];

const PASO_MINUTOS = 30;

function sumarMinutos(hora: string, delta: number): string {
  const [h, m] = hora.split(':').map(Number);
  let total = h * 60 + m + delta;
  total = Math.max(0, Math.min(23 * 60 + 30, total));
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function HorarioHabitualScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [diasHabiles, setDiasHabiles] = useState<Set<number>>(new Set());
  const [horaApertura, setHoraApertura] = useState(DEFAULT_APERTURA);
  const [horaCierre, setHoraCierre] = useState(DEFAULT_CIERRE);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    let mounted = true;
    getBarbero()
      .then((barbero) => {
        if (!mounted || !barbero) return;
        setDiasHabiles(new Set(barbero.dias_habiles ?? [1, 2, 3, 4, 5]));
        if (barbero.hora_apertura) setHoraApertura(toHHMM(barbero.hora_apertura));
        if (barbero.hora_cierre) setHoraCierre(toHHMM(barbero.hora_cierre));
      })
      .catch(() => {
        Alert.alert('Error', 'No se pudo cargar tu horario actual.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const toggleDia = (id: number) => {
    setDiasHabiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setGuardado(false);
  };

  const rangoValido = horaApertura < horaCierre && diasHabiles.size > 0;

  const guardar = async () => {
    if (!rangoValido || saving) return;
    setSaving(true);
    try {
      await updateHorarioHabitual({
        dias_habiles: Array.from(diasHabiles).sort((a, b) => a - b),
        hora_apertura: horaApertura,
        hora_cierre: horaCierre,
      });
      setGuardado(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo guardar tu horario.';
      Alert.alert('Error', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <ProfileHeader title="Horario" />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.screen}>
          <Text style={styles.h1}>Horario habitual</Text>
          <Text style={styles.intro}>
            Definí los días que trabajás y tu franja horaria general. Los clientes solo van a poder
            reservar dentro de este horario.
          </Text>

          <Text style={styles.label}>Días que trabajás</Text>
          <View style={styles.diasRow}>
            {DIAS.map((dia) => {
              const activo = diasHabiles.has(dia.id);
              return (
                <TouchableOpacity
                  key={dia.id}
                  style={[styles.diaCircle, activo && styles.diaCircleActivo]}
                  onPress={() => toggleDia(dia.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.diaText, activo && styles.diaTextActivo]}>{dia.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {diasHabiles.size === 0 && (
            <Text style={styles.errorText}>Seleccioná al menos un día hábil.</Text>
          )}

          <Text style={styles.label}>Franja horaria</Text>
          <View style={styles.rangoCard}>
            <TimeStepper
              title="Desde"
              value={horaApertura}
              onChange={(v) => {
                setHoraApertura(v);
                setGuardado(false);
              }}
            />
            <View style={styles.rangoDivider} />
            <TimeStepper
              title="Hasta"
              value={horaCierre}
              onChange={(v) => {
                setHoraCierre(v);
                setGuardado(false);
              }}
            />
          </View>
          {horaApertura >= horaCierre && (
            <Text style={styles.errorText}>
              El horario de cierre debe ser posterior al de apertura.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btnPrimary, (!rangoValido || saving) && styles.btnDisabled]}
            onPress={guardar}
            disabled={!rangoValido || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.btnPrimaryText}>
                {guardado ? 'Guardado ✓' : 'Guardar horario habitual'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </Screen>
  );
}

function TimeStepper({
  title,
  value,
  onChange,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperTitle}>{title}</Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onChange(sumarMinutos(value, -PASO_MINUTOS))}
        >
          <Text style={styles.stepperBtnText}>–</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          style={styles.stepperBtn}
          onPress={() => onChange(sumarMinutos(value, PASO_MINUTOS))}
        >
          <Text style={styles.stepperBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  screen: { paddingTop: spacing(2), paddingBottom: spacing(10) },
  h1: { ...type.h1, color: colors.ink, marginBottom: spacing(2) },
  intro: { ...type.body, color: colors.inkSoft, lineHeight: 20, marginBottom: spacing(6) },
  label: { ...type.label, color: colors.inkSoft, marginBottom: spacing(3) },

  diasRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(2) },
  diaCircle: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaCircleActivo: { backgroundColor: colors.primarySoft, borderColor: colors.primaryLine },
  diaText: { fontSize: 14, fontWeight: '700', color: colors.inkSoft },
  diaTextActivo: { color: colors.primary },

  rangoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: spacing(4),
    marginBottom: spacing(2),
  },
  rangoDivider: {
    width: 1,
    height: 44,
    backgroundColor: colors.line,
    marginHorizontal: spacing(3),
  },
  stepper: { flex: 1, alignItems: 'center' },
  stepperTitle: { ...type.caption, color: colors.inkSoft, marginBottom: spacing(2) },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing(3) },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 18, fontWeight: '600', color: colors.ink, marginTop: -2 },
  stepperValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    minWidth: 52,
    textAlign: 'center',
  },

  errorText: { color: colors.danger, fontSize: 12.5, marginBottom: spacing(4) },

  btnPrimary: {
    marginTop: spacing(6),
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnPrimaryText: { color: colors.white, fontWeight: '700', fontSize: 14.5 },
});
