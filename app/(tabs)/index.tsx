import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase, Report } from '@/lib/supabase';
import { AppColors } from '@/constants/theme';

const CATEGORY_COLORS: Record<string, string> = {
  wildlife: AppColors.category.wildlife,
  plant: AppColors.category.plant,
  marine: AppColors.category.marine,
  invasive: AppColors.category.invasive,
};

const CATEGORY_ICONS: Record<string, string> = {
  wildlife: '🦁',
  plant: '🌿',
  marine: '🐠',
  invasive: '⚠️',
};

export default function HomeScreen() {
  const [totalReports, setTotalReports] = useState<number>(0);
  const [speciesCount, setSpeciesCount] = useState<number>(0);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [countRes, speciesRes, recentRes] = await Promise.all([
        supabase.from('reports').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('species_name').limit(1000),
        supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      setTotalReports(countRes.count ?? 0);
      const unique = new Set((speciesRes.data ?? []).map((r: any) => r.species_name).filter(Boolean));
      setSpeciesCount(unique.size);
      setRecentReports((recentRes.data as Report[]) ?? []);
    } catch {
      // no-op — show zeros on error
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>🌿 BioGuard</Text>
          <Text style={styles.tagline}>Protecting biodiversity, one report at a time</Text>
        </View>

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color={AppColors.primary} style={styles.loader} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{totalReports}</Text>
              <Text style={styles.statLabel}>Total Reports</Text>
            </View>
            <View style={[styles.statCard, styles.statCardAccent]}>
              <Text style={[styles.statNumber, { color: AppColors.primary }]}>{speciesCount}</Text>
              <Text style={styles.statLabel}>Species Found</Text>
            </View>
          </View>
        )}

        {/* Report Now CTA */}
        <TouchableOpacity style={styles.reportBtn} onPress={() => router.push('/(tabs)/report')}>
          <Ionicons name="add-circle-outline" size={22} color="#fff" />
          <Text style={styles.reportBtnText}>Report Now</Text>
        </TouchableOpacity>

        {/* Category quick-access */}
        <Text style={styles.sectionTitle}>Categories</Text>
        <View style={styles.categoriesGrid}>
          {(['wildlife', 'plant', 'marine', 'invasive'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, { borderColor: CATEGORY_COLORS[cat] }]}
              onPress={() => router.push('/(tabs)/report')}>
              <Text style={styles.catEmoji}>{CATEGORY_ICONS[cat]}</Text>
              <Text style={[styles.catLabel, { color: CATEGORY_COLORS[cat] }]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            {recentReports.map((r) => (
              <View key={r.id} style={styles.reportCard}>
                <View style={[styles.catDot, { backgroundColor: CATEGORY_COLORS[r.category] }]} />
                <View style={styles.reportInfo}>
                  <Text style={styles.reportSpecies}>{r.species_name || 'Unknown species'}</Text>
                  <Text style={styles.reportDesc} numberOfLines={2}>{r.description}</Text>
                </View>
                <Text style={[styles.reportCat, { color: CATEGORY_COLORS[r.category] }]}>
                  {r.category}
                </Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  scroll: { flex: 1 },
  loader: { marginVertical: 24 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: AppColors.secondaryText,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: AppColors.cardBg,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  statCardAccent: {
    borderColor: AppColors.primary + '33',
    backgroundColor: AppColors.primary + '0D',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: AppColors.text,
  },
  statLabel: {
    fontSize: 12,
    color: AppColors.secondaryText,
    marginTop: 4,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
  },
  reportBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.text,
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 10,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 50,
    borderWidth: 1.5,
    backgroundColor: '#fff',
    gap: 6,
  },
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: 14, fontWeight: '500' },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: AppColors.border,
    gap: 12,
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  reportInfo: { flex: 1 },
  reportSpecies: { fontSize: 15, fontWeight: '600', color: AppColors.text },
  reportDesc: { fontSize: 13, color: AppColors.secondaryText, marginTop: 2 },
  reportCat: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  bottomPad: { height: 20 },
});
