export default {
  expo: {
    name: 'turnos-app',
    slug: 'turnos-app',
    scheme: 'turnosapp',
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
    },
  },
};
