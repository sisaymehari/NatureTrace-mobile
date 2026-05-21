import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Report = {
  id: string;
  user_id: string;
  category: string;
  species_name: string;
  description: string;
  photo_url: string | null;
  location: string | null;       // PostGIS EWKB hex from Supabase
  location_name: string | null;
  severity: string;
  status: string;
  is_invasive: boolean;
  created_at: string;
  // Decoded client-side after fetching
  latitude?: number | null;
  longitude?: number | null;
};

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  eco_points: number;
  badge_ids: string[];
  reports_count: number;
  current_streak: number;
  last_login_date: string | null;
  created_at: string;
};
