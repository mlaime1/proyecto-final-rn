// horario.tsx
//
// Configura el patrón semanal recurrente del barbero: qué días trabaja
// y en qué franja horaria general. Mapea 1 a 1 con la tabla `Barbero`
// (dias_habiles, hora_apertura, hora_cierre).

import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getBarbero,
  updateHorarioHabitual,
  type BarberoConBarberia,
} from '@/services/barbero.service';
import {
  detectarDesajusteConBarberia,
  resolverHorarioEfectivo,
  toHHMM,
  DIAS_SEMANA,
  type OrigenHorario,
} from '@/lib/availability';
import { colors, radius, spacing, type } from '@/components/horario/theme';
import Screen from '@/components/ui/Screen';
import ProfileHeader from '@/components/ui/ProfileHeader';
import { showAlert } from '@/lib/alert';

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

type BarberiaHorario = NonNullable<BarberoConBarberia['Barberia']>;

function sumarMinutos(hora: string, delta: number): string {
  const [h, m] = hora.split(':').map(Number);
  let total = h * 60 + m + delta;
  total = Math.max(0, Math.min(23 * 60 + 30, total));
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** "lunes y martes" / "lunes, martes y miércoles" — para nombrar los días del aviso. */
function enumerarDias(dias: number[]): string {
  const nombres = dias.map((dia) => DIAS_SEMANA[dia] ?? String(dia));
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * "09:00–20:00" con lo que la barbería tenga efectivamente cargado. Si viene
 * un solo extremo se muestra ese: preferimos una etiqueta incompleta a imprimir
 * un "null" en el aviso.
 */
function rangoDeBarberia(barberia: BarberiaHorario | null): string {
  if (!barberia) return '';
  return [barberia.hora_apertura, barberia.hora_cierre]
    .filter((hora): hora is string => !!hora)
    .map(toHHMM)
    .join('–');
}

/**
 * "07:00–12:00" usando solo los extremos que el barbero cargó. El aviso se
 * dispara por un extremo suelto (por ejemplo, solo la apertura), así que no se
 * pueden mostrar los dos valores efectivos: el otro vendría heredado y
 * atribuiría al barbero una hora que no eligió.
 */
function rangoPropio(hora_apertura: string, hora_cierre: string): string {
  return [hora_apertura, hora_cierre].filter((hora) => !!hora).join('–');
}

export default function HorarioHabitualScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [diasHabiles, setDiasHabiles] = useState<Set<number>>(new Set());
  const [horaApertura, setHoraApertura] = useState('');
  const [horaCierre, setHoraCierre] = useState('');
  const [guardado, setGuardado] = useState(false);
  const [origen, setOrigen] = useState<OrigenHorario>('barbero');
  const [barberia, setBarberia] = useState<BarberiaHorario | null>(null);

  useEffect(() => {
    let mounted = true;
    getBarbero()
      .then((barbero) => {
        if (!mounted || !barbero) return;
        // El formulario debe arrancar del horario que la app está usando de
        // verdad: si el barbero no tiene el propio, hereda el de la barbería.
        // Sembrarlo con un default local hacía que guardar pisara la herencia
        // con valores que el barbero nunca eligió.
        const efectivo = resolverHorarioEfectivo(barbero, barbero.Barberia);
        setDiasHabiles(new Set(efectivo.dias_habiles ?? []));
        setHoraApertura(efectivo.hora_apertura);
        setHoraCierre(efectivo.hora_cierre);
        setOrigen(efectivo.origen);
        setBarberia(barbero.Barberia);
      })
      .catch(() => {
        showAlert('Error', 'No se pudo cargar tu horario actual.');
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

  // Aviso informativo contra el techo que impone la barbería. Se recalcula en
  // cada toggle de día y en cada paso de hora, así que no queda desactualizado
  // respecto de lo que el barbero está por guardar. Con el rango local inválido
  // se pasan las horas en null: el helper solo compara lo que el barbero cargó,
  // y comparar una franja invertida no aportaría nada.
  const desajuste = useMemo(
    () =>
      detectarDesajusteConBarberia(
        {
          dias_habiles: Array.from(diasHabiles),
          hora_apertura: rangoValido ? horaApertura : null,
          hora_cierre: rangoValido ? horaCierre : null,
        },
        barberia,
      ),
    [diasHabiles, horaApertura, horaCierre, rangoValido, barberia],
  );
  const diasFueraTexto = enumerarDias(desajuste.diasFuera);
  const rangoBarberia = rangoDeBarberia(barberia);
  const rangoBarbero = rangoPropio(rangoValido ? horaApertura : '', rangoValido ? horaCierre : '');
  const mostrarAviso = desajuste.fueraDeHorario || desajuste.diasFuera.length > 0;

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
      showAlert('Error', message);
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

          {origen !== 'barbero' && (
            <View style={styles.heredadoCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.heredadoText}>
                {origen === 'barberia'
                  ? 'Estás viendo el horario de tu barbería, porque todavía no cargaste el tuyo. Si guardás, empezás a usar este horario como propio.'
                  : 'Estás viendo un horario por defecto, porque ni vos ni tu barbería tienen uno cargado. Si guardás, empezás a usar este horario como propio.'}
              </Text>
            </View>
          )}

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

          {mostrarAviso && (
            <View style={styles.avisoCard}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
              <View style={styles.avisoBody}>
                {desajuste.fueraDeHorario && (
                  <Text style={styles.avisoText}>
                    Tu horario ({rangoBarbero}) se extiende fuera del horario de la barbería (
                    {rangoBarberia}). Las horas fuera de ese rango no se van a poder reservar.
                  </Text>
                )}
                {desajuste.diasFuera.length > 0 && (
                  <Text style={styles.avisoText}>
                    Marcaste días que la barbería no abre: {diasFueraTexto}. Esos días no se van a
                    poder reservar.
                  </Text>
                )}
              </View>
            </View>
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

  avisoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(2.5),
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(4),
  },
  avisoBody: { flex: 1, gap: spacing(2) },
  avisoText: { ...type.caption, color: colors.ink, lineHeight: 18 },

  heredadoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing(2.5),
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryLine,
    borderRadius: radius.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(6),
  },
  heredadoText: { ...type.caption, flex: 1, color: colors.ink, lineHeight: 18 },

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
