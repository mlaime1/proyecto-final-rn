import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '@/hooks/useAuth'

export default function RootLayout() {
  const { session, loading } = useAuth()
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    if (loading) return

    const inAuthScreen = segments[0] === 'login' || segments[0] === 'register'
    const inTabsScreen = segments[0] === '(tabs)'

    if (!session && !inAuthScreen) {
      // Sin sesión y no estamos en login/register → redirigir a login
      router.replace('/login')
    } else if (session && inAuthScreen) {
      // Con sesión y estamos en login/register → redirigir a tabs
      router.replace('/(tabs)')
    }
  }, [session, loading, segments])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  )
}
