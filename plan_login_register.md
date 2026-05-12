Plan: Login y Register Screens

## Context
El proyecto no tiene infraestructura de autenticación. Necesitamos un lugar central que guarde la sesión y que cualquier pantalla pueda consultar. Construiremos un sistema de auth con Supabase donde la sesión persiste entre reinicios y la navegación se decide automáticamente según si el usuario está logueado o no.

## Arquitectura

```
src/
├── lib/
│   └── supabase.ts         - cliente singleton (se crea una vez)
├── services/
│   └── auth.service.ts     - signIn / signUp / signOut (solo habla con Supabase)
├── hooks/
│   └── useAuth.ts          - session, loading, error + funciones
└── app/
    ├── _layout.tsx         - decide qué stack mostrar según sesión
    ├── login.tsx           - captura email/password y llama al hook
    ├── register.tsx        - captura datos y usa signUp
    └── (tabs)/             - pantallas protegidas
```

## Paso 1: Instalar AsyncStorage y configurar cliente

**Instalar dependencia:**
```bash
npx expo install @react-native-async-storage/async-storage
```

**Crear variables de entorno en `.env`:**
```
EXPO_PUBLIC_SUPABASE_URL=https://[TU_URL_DE_SUPABASE]
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Modificar `src/lib/supabase.ts`:**
- Agregar AsyncStorage como adapter de sesión
- Habilitar persistSession para guardar la sesión entre reinicios
- Habilitar autoRefreshToken para renovar tokens antes de expirar

```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
})
```

## Paso 2: Crear servicio de autenticación

**Crear `src/services/auth.service.ts`:**
- Solo traduce acciones (login, signup, logout) en llamadas a Supabase
- No sabe nada de React, solo maneja errores y devuelve datos
- Las funciones: `signUp`, `signIn`, `signOut`

```typescript
import { supabase } from '../lib/supabase'

export type AuthCredentials = {
  email: string
  password: string
}

export const authService = {
  signUp: async ({ email, password }: AuthCredentials) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  },
  signIn: async ({ email, password }: AuthCredentials) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }
}
```

## Paso 3: Crear hook que escucha cambios de sesión

**Crear `src/hooks/useAuth.ts`:**
- El corazón de la autenticación
- Escucha eventos de Supabase (login, logout, token renovado)
- Expone: `session`, `loading`, `error`, y funciones `signIn`, `signUp`, `signOut`
- Limpia listeners al desmontar

```typescript
import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { authService, AuthCredentials } from '../services/auth.service'

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 1. Recupera la sesión guardada al arrancar la app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Escucha cualquier cambio futuro (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setLoading(false)
    })

    // 3. Limpia el listener cuando el componente se desmonte
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (creds: AuthCredentials) => {
    setError(null)
    try {
      await authService.signIn(creds)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const signUp = async (creds: AuthCredentials) => {
    setError(null)
    try {
      await authService.signUp(creds)
    } catch (e: any) {
      setError(e.message)
    }
  }

  const signOut = () => authService.signOut()

  return { session, loading, error, signIn, signUp, signOut }
}
```

**Nota:** `onAuthStateChange` es clave. Cuando el usuario hace login en cualquier pantalla, Supabase dispara el evento y el estado se actualiza automáticamente en toda la app.

## Paso 4: Navegación condicional en el layout raíz

**Modificar `src/app/_layout.tsx`:**
- Usa `useAuth()` para obtener sesión y loading
- Muestra un spinner mientras loading es true (evita "flash of unauthenticated content")
- Sin sesión: muestra stack con login y register
- Con sesión: muestra stack con (tabs) y pantallas protegidas

```typescript
import { Stack } from 'expo-router'
import { ActivityIndicator, View } from 'react-native'
import { useAuth } from '../hooks/useAuth'

export default function RootLayout() {
  const { session, loading } = useAuth()

  // Mientras Supabase carga la sesión, mostramos un loader
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }

  // No hay sesión → stack de auth
  if (!session) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    )
  }

  // Hay sesión → stack de la app
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}
```

## Paso 5: Pantalla de Login

**Crear `src/app/login.tsx`:**
- Captura email y password
- Llama a `useAuth().signIn()` al presionar botón
- Muestra errores si existen
- Link a register

```typescript
import { useState } from 'react'
import { View, Alert } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { Screen } from '../components/ui/Screen'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Text } from '../components/ui/Text'

export default function LoginScreen() {
  const { signIn, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = async () => {
    await signIn({ email, password })
    // No navegamos: el Layout detecta el cambio de sesión automáticamente
  }

  return (
    <Screen>
      <Text>Iniciar sesión</Text>
      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <Button
        title={loading ? "Entrando..." : "Entrar"}
        onPress={handleLogin}
        disabled={loading}
      />
    </Screen>
  )
}
```

## Paso 6: Pantalla de Register

**Crear `src/app/register.tsx`:**
- Captura email, password y confirmación
- Valida que las contraseñas coincidan
- Llama a `useAuth().signUp()`
- Muestra mensaje de éxito o errores

```typescript
import { useState } from 'react'
import { View, Alert } from 'react-native'
import { useAuth } from '../hooks/useAuth'
import { Screen } from '../components/ui/Screen'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Text } from '../components/ui/Text'

export default function RegisterScreen() {
  const { signUp, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden')
      return
    }
    await signUp({ email, password })
    if (!error) {
      Alert.alert('Éxito', 'Revisá tu email para confirmar la cuenta')
    }
  }

  return (
    <Screen>
      <Text>Crear cuenta</Text>
      <Input
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Input
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Input
        placeholder="Confirmar contraseña"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      {error && <Text style={{ color: 'red' }}>{error}</Text>}
      <Button
        title={loading ? "Creando..." : "Crear cuenta"}
        onPress={handleRegister}
        disabled={loading}
      />
    </Screen>
  )
}
```

## Respuestas a preguntas clave

**¿Quién guarda la sesión?** Supabase + AsyncStorage.

**¿Quién navega al hacer login?** Nadie explícitamente. El `_layout` reacciona al cambio de sesión automáticamente.

**¿Dónde muestro el error?** El hook lo expone en `error`, el componente decide cómo mostrarlo.

**¿Cómo accedo al usuario en cualquier pantalla?** `const { session } = useAuth()`. El usuario está en `session.user`.

## Flujo de Navegación

```
App Start
    │
    ▼
_layout.tsx → getSession() + onAuthStateChange
    │
    ├─ Loading: muestra spinner
    │
    ├─ Sin sesión → Stack(login, register)
    │
    └─ Con sesión → Stack((tabs))
```

## Verificación

- ✓ `npx expo start --tunnel`
- ✓ Abrir en Expo Go → debe mostrar pantalla de Login
- ✓ Registrar un usuario nuevo → verificar mensaje de confirmación
- ✓ Iniciar sesión con usuario existente → debe entrar a tabs
- ✓ Matar app y reabrir → debe permanecer logueado (AsyncStorage)
- ✓ Cerrar sesión desde Perfil → debe volver a Login