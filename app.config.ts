import 'dotenv/config';

export default {
  expo: {
    name: 'movies-app',
    slug: 'movies-app',
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
    },
  },
};