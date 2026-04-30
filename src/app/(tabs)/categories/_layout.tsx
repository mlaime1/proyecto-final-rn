import { Stack } from 'expo-router';

export default function LayoutStackCategories() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title:'Categories' }} />
      <Stack.Screen name="[category]" options={{ title:'Category Movie' }} />
    </Stack>
  );
}