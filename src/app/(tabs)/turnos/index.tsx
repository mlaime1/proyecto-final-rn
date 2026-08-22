import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Screen from '@/components/ui/Screen';
import Card from '@/components/ui/Card';
import { getTurnos, TurnoUI } from '@/services/turnos.service';

export default function TurnosScreen() {
  const [turnos, setTurnos] = useState<TurnoUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTurnos = useCallback(async () => {
    const data = await getTurnos();
    setTurnos(data);
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

  if (loading) return <Text style={styles.center}>Cargando...</Text>;

  return (
    <Screen>
      <FlatList
        data={turnos}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <Card turno={item} />}
        ListEmptyComponent={<Text style={styles.empty}>No hay turnos</Text>}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 20,
  },
  center: {
    textAlign: 'center',
    marginTop: 40,
  },
});
