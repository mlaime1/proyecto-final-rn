// HorarioHeredadoBanner.tsx
//
// Aviso informativo para el barbero que todavía no tiene horario propio
// configurado: lo que la app está mostrando viene heredado de la barbería
// (o del default), no de él. No bloquea nada ni se puede cerrar a mano:
// desaparece solo apenas guarda su horario en Perfil → Horario.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, type } from '@/components/horario/theme';
import type { OrigenHorario } from '@/lib/availability';

type Props = {
  /** null = todavía no sabemos el origen (cargando, o cuenta sin vincular). */
  origen: OrigenHorario | null;
};

const MENSAJES: Record<Exclude<OrigenHorario, 'barbero'>, string> = {
  barberia: 'Estás usando el horario de la barbería. Configurá tu horario propio.',
  default: 'Estás usando un horario por defecto. Configurá tu horario propio.',
};

export default function HorarioHeredadoBanner({ origen }: Props) {
  const router = useRouter();

  // Sin horario propio no hay nada que avisar.
  if (!origen || origen === 'barbero') return null;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={() => router.push('/(tabs)/perfil/horario')}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={MENSAJES[origen]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
      </View>
      <Text style={styles.text}>{MENSAJES[origen]}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2.5),
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryLine,
    borderRadius: radius.md,
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(5),
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    ...type.caption,
    flex: 1,
    color: colors.ink,
  },
});
