// src/lib/env.ts
import Constants from 'expo-constants';

export const ENV = {
  API_URL: Constants.expoConfig?.extra?.apiUrl,
  SUPABASE_URL: Constants.expoConfig?.extra?.supabaseUrl,
  SUPABASE_ANON_KEY: Constants.expoConfig?.extra?.supabaseAnonKey,
};