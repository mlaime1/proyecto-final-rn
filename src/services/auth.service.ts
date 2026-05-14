import { supabase } from '@/lib/supabase'

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
