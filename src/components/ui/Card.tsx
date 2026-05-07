import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ClienteResumen = {
  id: number;
  nombre: string;
};

export type TurnoCardData = {
  id: number;
  created_at: string;
  duracion: string;
  estado: string;
  inicio: string;
  precio: number;
  cliente_id: number;
  emprendedor_id: number;
  fin: string;
  update_at: string;
  servicio?: string;
  cliente?: ClienteResumen | null;
};

type Props = {
  turno: TurnoCardData;
  onPress?: (id: number) => void;
};

function formatDate(date: string) {
  const parsedDate = new Date(date);

  return parsedDate.toLocaleString('es-AR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(price: number) {
  return price.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}

function Card({ turno, onPress }: Props) {
  const isPressable = typeof onPress === 'function';
  const customerName = turno.cliente?.nombre ?? `Cliente #${turno.cliente_id}`;

  return (
    <TouchableOpacity
      activeOpacity={isPressable ? 0.8 : 1}
      disabled={!isPressable}
      onPress={() => onPress?.(turno.id)}
      style={styles.card}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="calendar-outline" size={22} color="#0F172A" />
      </View>

      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.customer}>{customerName}</Text>
          <Text style={styles.status}>{turno.estado}</Text>
        </View>

        <Text style={styles.time}>{formatDate(turno.inicio)}</Text>
        <Text style={styles.meta}>
          Duracion: {turno.duracion} · {formatPrice(turno.precio)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  customer: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  status: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  time: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    color: '#64748B',
    fontSize: 12,
  },
});

export default Card;
