import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import { authService, AuthCredentials } from '@/services/auth.service'

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
          console.log('[useAuth] getSession:', session ? 'Session found' : 'No session')
          setSession(session)
          setLoading(false)
        }
      } catch (error) {
        if (mounted) {
          console.error('[useAuth] init error:', error)
          setLoading(false)
        }
      }
    }

    initAuth()

    // 2. Escucha cualquier cambio futuro (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        console.log('[useAuth] onAuthStateChange event:', event, 'session:', session ? 'exists' : 'null')
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

  const signOut = async () => {
    try {
      console.log('[useAuth] signOut called')
      await authService.signOut()
      console.log('[useAuth] signOut successful')
    } catch (e: any) {
      console.error('[useAuth] signOut error:', e)
      setError(e.message)
    }
  }

  return { session, loading, error, signIn, signUp, signOut }
}
