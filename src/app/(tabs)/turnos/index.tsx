// index.tsx — Agenda "Mis turnos"
// Lista de turnos filtrable por día (DayStrip) y por estado (chips),
// según el mock de referencia con paleta violeta. Sin header propio ni
// FAB: respeta el chrome actual (Screen + tab bar).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Screen from '@/components/ui/Screen';
import DayStrip, { buildDayRange, dateKey } from '@/components/turnos/DayStrip';
import TurnoStatusPill from '@/components/turnos/TurnoStatusPill';
import { colors, radius } from '@/components/turnos/theme';
import { getTurnos, TurnoUI } from '@/services/turnos.service';

type Filtro = 'todos' | 'confirmados';

function formatTime(inicio: string): string {
  const date = new Date(inicio);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatServicioLine(turno: TurnoUI): string {
  const parts = [turno.servicio_nombre];
  if (turno.servicio_precio != null) {
    parts.push(`$${turno.servicio_precio.toLocaleString('es-AR')}`);
  }
  if (turno.servicio_duracion != null) {
    parts.push(`${turno.servicio_duracion} min`);
  }
  return parts.join(' · ');
}

export default function TurnosScreen() {
  const router = useRouter();
  const [turnos, setTurnos] = useState<TurnoUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [filtro, setFiltro] = useState<Filtro>('todos');

  const loadTurnos = useCallback(async () => {
    try {
      setError(null);
      const data = await getTurnos();
      setTurnos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los turnos.');
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadTurnos();
      setLoading(false);
    })();
  }, [loadTurnos]);

  useFocusEffect(
    useCallback(() => {
      loadTurnos();
    }, [loadTurnos]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTurnos();
    setRefreshing(false);
  };

  const dias = useMemo(() => buildDayRange(), []);
  const selectedKey = dateKey(selectedDay);

  const turnosDelDia = useMemo(
    () =>
      turnos.filter(
        (t) =>
          dateKey(new Date(t.inicio)) === selectedKey &&
          (filtro === 'todos' || t.estado === 'confirmado'),
      ),
    [turnos, selectedKey, filtro],
  );

  return (
    <Screen>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>Agenda</Text>
          <Text style={styles.title}>Mis turnos</Text>
        </View>

        <DayStrip days={dias} selected={selectedDay} onSelect={setSelectedDay} />

        <View style={styles.toolsRow}>
          <Chip label="Todos" active={filtro === 'todos'} onPress={() => setFiltro('todos')} />
          <Chip
            label="Confirmados"
            active={filtro === 'confirmados'}
            onPress={() => setFiltro('confirmados')}
          />
          <TouchableOpacity
            style={styles.nuevoBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/turnos/nuevo')}
          >
            <Text style={styles.nuevoBtnText}>+ Nuevo</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.agendaCard}>
            {turnosDelDia.length === 0 ? (
              <Text style={styles.emptyText}>No hay turnos para este día</Text>
            ) : (
              turnosDelDia.map((turno, index) => (
                <SlotRow
                  key={turno.id}
                  turno={turno}
                  isLast={index === turnosDelDia.length - 1}
                  onPress={() => router.push(`/turnos/${turno.id}`)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function SlotRow({
  turno,
  isLast,
  onPress,
}: {
  turno: TurnoUI;
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.slot, !isLast && styles.slotBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.slotTime}>{formatTime(turno.inicio)}</Text>

      <View style={styles.slotInfo}>
        <Text style={styles.slotCliente} numberOfLines={1}>
          {turno.cliente_nombre}
        </Text>
        <Text style={styles.slotServicio} numberOfLines={1}>
          {formatServicioLine(turno)}
        </Text>
      </View>

      <TurnoStatusPill estado={turno.estado} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingBottom: 24,
  },

  headerBlock: {
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.inkSoft,
    marginBottom: 3,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.5,
  },

  toolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 11,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryLine,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  nuevoBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  nuevoBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },

  loader: {
    marginTop: 40,
  },
  errorText: {
    textAlign: 'center',
    color: colors.red,
    fontSize: 13,
    marginTop: 20,
  },

  agendaCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.inkSoft,
    fontSize: 12.5,
    paddingVertical: 22,
  },

  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  slotBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  slotTime: {
    width: 42,
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  slotInfo: {
    flex: 1,
    minWidth: 0,
  },
  slotCliente: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.ink,
  },
  slotServicio: {
    marginTop: 3,
    fontSize: 11.5,
    color: colors.inkSoft,
  },
});
