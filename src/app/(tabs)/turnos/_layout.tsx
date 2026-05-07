import { Stack } from 'expo-router';

export default function TurnosLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="nuevo" />
      <Stack.Screen name="confirmar" />
    </Stack>
  );
}
