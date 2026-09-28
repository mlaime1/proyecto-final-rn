import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import AlertHost from '@/components/ui/AlertHost';

export default function RootLayout() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  // PWA service worker: web only, never on native. Dynamic import keeps it
  // out of the native bundle; registerSw itself is plain Web APIs.
  useEffect(() => {
    if (Platform.OS === 'web') {
      void import('@/lib/push/registerSw').then(({ registerPushServiceWorker }) =>
        registerPushServiceWorker(),
      );
    }
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthScreen = segments[0] === 'login';

    if (!session && !inAuthScreen) {
      router.replace('/login');
    } else if (session && inAuthScreen) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
      </Stack>
      <AlertHost />
    </ErrorBoundary>
  );
}
