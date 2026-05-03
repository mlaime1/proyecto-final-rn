import React, { useEffect } from 'react';
import { Button } from 'react-native';
import Screen from '@/components/ui/Screen';
import { useRouter } from 'expo-router';
import { getTurnos } from '@/services/turnos.service';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Aquí podrías cargar datos iniciales o realizar otras tareas de configuración
    const getTurno = async (): Promise<any> => {
      const data = await getTurnos();
      console.log(data, 'esta es la data');
    };

    getTurno();
  }, []);

  return (
    <Screen>
      <Button title="Movies" onPress={() => router.push('/movies/index')} />
      <Button title="Categories" />
    </Screen>
  );
}
