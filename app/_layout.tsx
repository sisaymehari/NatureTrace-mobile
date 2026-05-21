import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

const GREEN = '#1D9E75';

const BioGuardTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: GREEN,
    background: '#FFFFFF',
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

function SplashScreen() {
  return (
    <View style={styles.splash}>
      <View style={styles.logoBox}>
        <Text style={styles.logoEmoji}>🛡️</Text>
      </View>
      <Text style={styles.brand}>BioGuard</Text>
      <Text style={styles.tagline}>Biodiversity Reporting Platform</Text>
    </View>
  );
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[Auth] Initial session check:', s ? `logged in as ${s.user.email}` : 'no session');
      setSession(s ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      console.log('[Auth] State change:', event, s ? `user=${s.user.email}` : 'signed out');
      setSession(s ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    console.log('[Auth] Redirecting →', session ? '/(tabs)' : '/login');
    if (session) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  }, [session]);

  return (
    <ThemeProvider value={BioGuardTheme}>
      <Stack>
        <Stack.Screen name="(tabs)"  options={{ headerShown: false }} />
        <Stack.Screen name="login"   options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="signup"  options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="modal"   options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>

      {/* Overlay the splash on top until session is resolved */}
      {session === undefined && (
        <View style={StyleSheet.absoluteFill}>
          <SplashScreen />
        </View>
      )}

      <StatusBar style="light" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash:    { flex: 1, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', gap: 12 },
  logoBox:   { width: 88, height: 88, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  logoEmoji: { fontSize: 44 },
  brand:     { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  tagline:   { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
});
