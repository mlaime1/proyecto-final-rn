import Card from '@/components/ui/Card';
import Screen from '@/components/ui/Screen';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { upcomingAppointments } from './_data';

export default function TurnosScreen() {
  return (
    <Screen>
      <View style={styles.list}>
        {upcomingAppointments.length === 0 ? (
          <Text style={styles.empty}>No hay turnos</Text>
        ) : (
          upcomingAppointments.map((turno) => (
            <Card key={turno.id} turno={turno} onPress={() => router.push(`./turnos/${turno.id}`)} />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  time: {
    color: '#0284C7',
    fontSize: 18,
    fontWeight: '700',
  },
  service: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  customer: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 16,
    marginTop: 20,
  },
});
