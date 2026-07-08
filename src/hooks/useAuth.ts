import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { log } from '@/lib/logger'
import { authService, AuthCredentials } from '@/services/auth.service'

type AuthResult = { error: string | null }

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        log('[useAuth] onAuthStateChange event:', event, 'session:', session ? 'exists' : 'null')
        setSession(session)
        setLoading(false)
      }
    })

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
      const message = mapAuthError(e.message ?? 'Error al iniciar sesión')
      setError(message)
      return { error: message }
    }
  }

  const signUp = async (creds: AuthCredentials): Promise<AuthResult> => {
    setError(null)
    try {
      await authService.signUp(creds)
      return { error: null }
    } catch (e: any) {
      const message = mapAuthError(e.message ?? 'Error al registrarse')
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
      const message = mapAuthError(e.message ?? 'Error al cerrar sesión')
      log('[useAuth] signOut error:', e)
      setError(message)
      return { error: message }
    }
  }

  return { session, loading, error, signIn, signUp, signOut }
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login credentials')) {
    return 'Email o contraseña incorrectos.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Tu email aún no fue confirmado.'
  }
  if (lower.includes('user already registered')) {
    return 'Ese email ya está registrado.'
  }
  if (lower.includes('rate limit')) {
    return 'Demasiados intentos. Probá más tarde.'
  }
  return message
}
