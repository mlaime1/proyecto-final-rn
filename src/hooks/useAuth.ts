import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'
import { authService, AuthCredentials } from '@/services/auth.service'
import { createEmprendedor } from '@/services/emprendedor.service'

type AuthResult = { error: string | null }

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        // Limpia claves de Supabase antiguas si existen (para desarrollo)
        const keys = await AsyncStorage.getAllKeys()
        const supabaseKeys = keys.filter(k => k.includes('supabase') && !k.includes('auth-token'))
        if (supabaseKeys.length > 1) {
          await AsyncStorage.multiRemove(supabaseKeys)
        }

        // 1. Recupera la sesión guardada al arrancar la app
        const { data: { session } } = await supabase.auth.getSession()
        if (mounted) {
          log('[useAuth] getSession:', session ? 'Session found' : 'No session')
          setSession(session)
          setLoading(false)
        }
      } catch (error) {
        if (mounted) {
          log('[useAuth] init error:', error)
          setLoading(false)
        }
      }
    }

    initAuth()

    // 2. Escucha cualquier cambio futuro (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        log('[useAuth] onAuthStateChange event:', event, 'session:', session ? 'exists' : 'null')
        setSession(session)
        setLoading(false)
      }
    })

    // 3. Limpia el listener cuando el componente se desmonte
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (creds: AuthCredentials): Promise<AuthResult> => {
    setError(null)
    try {
      await authService.signIn(creds)
      return { error: null }
    } catch (e: any) {
      const message = e.message ?? 'Error al iniciar sesión'
      setError(message)
      return { error: message }
    }
  }

  const signUp = async (creds: AuthCredentials): Promise<AuthResult> => {
    setError(null)
    try {
      const { data, error: signUpError } = await authService.signUp(creds)

      if (signUpError) {
        throw signUpError
      }

      // Crear automáticamente el perfil de emprendedor básico
      const userId = data.user?.id
      if (userId) {
        try {
          await createEmprendedor(userId, data.user?.email)
        } catch (profileError: any) {
          // Si falla la creación del perfil, informamos pero no bloqueamos el registro
          log('[useAuth] Error creating emprendedor profile:', profileError)
        }
      }

      return { error: null }
    } catch (e: any) {
      const message = e.message ?? 'Error al registrarse'
      setError(message)
      return { error: message }
    }
  }

  const signOut = async (): Promise<AuthResult> => {
    try {
      log('[useAuth] signOut called')
      await authService.signOut()
      log('[useAuth] signOut successful')
      return { error: null }
    } catch (e: any) {
      const message = e.message ?? 'Error al cerrar sesión'
      log('[useAuth] signOut error:', e)
      setError(message)
      return { error: message }
    }
  }

  return { session, loading, error, signIn, signUp, signOut }
}
