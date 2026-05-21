import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase, Report, Profile } from '@/lib/supabase';
import { AppColors } from '@/constants/theme';

const BADGES = [
  { id: 'first_report', emoji: '🌱', label: 'First Report', desc: 'Submit your first sighting' },
  { id: 'ten_reports', emoji: '🔟', label: '10 Reports', desc: '10 sightings submitted' },
  { id: 'explorer', emoji: '🗺️', label: 'Explorer', desc: 'Report from 5 different locations' },
  { id: 'photographer', emoji: '📸', label: 'Photographer', desc: 'Attach a photo to 5 reports' },
  { id: 'naturalist', emoji: '🦋', label: 'Naturalist', desc: 'Report 10 different species' },
  { id: 'guardian', emoji: '🛡️', label: 'Guardian', desc: 'Report an invasive species' },
];

const CATEGORY_COLORS: Record<string, string> = {
  wildlife: AppColors.category.wildlife,
  plant: AppColors.category.plant,
  marine: AppColors.category.marine,
  invasive: AppColors.category.invasive,
};

const ECO_POINTS_MAX = 1000;

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('[Profile] getUser:', user?.email ?? 'null', 'error:', userError?.message ?? 'none');

      if (!user) {
        console.log('[Profile] no authenticated user — showing not signed in');
        setLoading(false);
        return;
      }

      const [profileRes, reportsRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('reports').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      console.log('[Profile] users row:', JSON.stringify(profileRes.data), 'error:', profileRes.error?.message ?? 'none');
      console.log('[Profile] reports count:', reportsRes.data?.length ?? 0, 'error:', reportsRes.error?.message ?? 'none');

      setProfile(profileRes.data as Profile);
      setReports((reportsRes.data as Report[]) ?? []);
    } finally {
      setLoading(false);
    }
  }

  const ecoPoints = profile?.eco_points ?? 0;

  // badge_ids is a Postgres text[] — JS client normally returns string[],
  // but defensively handle the case where it arrives as a raw "{id1,id2}" string
  const rawBadgeIds = profile?.badge_ids;
  const badgeIdArray: string[] = Array.isArray(rawBadgeIds)
    ? rawBadgeIds
    : typeof rawBadgeIds === 'string' && rawBadgeIds.startsWith('{')
      ? rawBadgeIds.slice(1, -1).split(',').filter(Boolean)
      : [];
  console.log('[Profile] badge_ids raw:', JSON.stringify(rawBadgeIds), '→ parsed:', badgeIdArray);
  const earnedBadges = new Set(badgeIdArray);

  const progressPct = Math.min((ecoPoints / ECO_POINTS_MAX) * 100, 100);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🌿</Text>
          <Text style={styles.emptyTitle}>Not signed in</Text>
          <Text style={styles.emptySubtitle}>Sign in to track your reports and earn eco-points</Text>
        </View>
        <TouchableOpacity
          style={styles.signOutBtnFixed}
          onPress={() => supabase.auth.signOut()}
        >
          <Ionicons name="log-out-outline" size={18} color="#E24B4A" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* Avatar + username */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {(profile.username ?? 'U').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.username}>{profile.username ?? 'BioGuard User'}</Text>
          <Text style={styles.reportCount}>{reports.length} reports submitted</Text>
        </View>

        {/* Eco-points progress */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Eco-Points</Text>
            <Text style={styles.pointsBadge}>{ecoPoints} / {ECO_POINTS_MAX}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` as any }]} />
          </View>
          <Text style={styles.progressHint}>
            {ECO_POINTS_MAX - ecoPoints} points to next milestone
          </Text>
        </View>

        {/* Badges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgesGrid}>
            {BADGES.map((badge) => {
              const earned = earnedBadges.has(badge.id);
              return (
                <View key={badge.id} style={[styles.badgeCard, !earned && styles.badgeCardLocked]}>
                  <Text style={[styles.badgeEmoji, !earned && styles.badgeEmojiLocked]}>
                    {badge.emoji}
                  </Text>
                  <Text style={[styles.badgeLabel, !earned && styles.badgeLabelLocked]}>
                    {badge.label}
                  </Text>
                  <Text style={styles.badgeDesc}>{badge.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Reports list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Reports</Text>
          {reports.length === 0 ? (
            <View style={styles.noReports}>
              <Text style={styles.noReportsText}>No reports yet. Start exploring!</Text>
            </View>
          ) : (
            reports.map((r) => (
              <View key={r.id} style={styles.reportRow}>
                <View style={[styles.reportDot, { backgroundColor: CATEGORY_COLORS[r.category] }]} />
                <View style={styles.reportInfo}>
                  <Text style={styles.reportSpecies}>{r.species_name || 'Unknown species'}</Text>
                  <Text style={styles.reportDate}>
                    {new Date(r.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={[styles.reportCatBadge, { backgroundColor: CATEGORY_COLORS[r.category] + '22' }]}>
                  <Text style={[styles.reportCatText, { color: CATEGORY_COLORS[r.category] }]}>
                    {r.category}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Fixed sign-out button — always visible */}
      <TouchableOpacity
        style={styles.signOutBtnFixed}
        onPress={() => supabase.auth.signOut()}
      >
        <Ionicons name="log-out-outline" size={18} color="#E24B4A" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppColors.background },
  scroll: { flex: 1 },
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: AppColors.text },
  avatarSection: { alignItems: 'center', paddingVertical: 24 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitial: { fontSize: 34, fontWeight: '700', color: '#fff' },
  username: { fontSize: 20, fontWeight: '700', color: AppColors.text },
  reportCount: { fontSize: 13, color: AppColors.secondaryText, marginTop: 4 },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: AppColors.text,
    marginBottom: 10,
  },
  pointsBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: AppColors.primary,
    backgroundColor: AppColors.primary + '1A',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 50,
  },
  progressTrack: {
    height: 12,
    backgroundColor: AppColors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 6,
  },
  progressHint: { fontSize: 12, color: AppColors.secondaryText, marginTop: 6 },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badgeCard: {
    width: '47%',
    backgroundColor: AppColors.primary + '0D',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: AppColors.primary + '33',
    alignItems: 'center',
    gap: 4,
  },
  badgeCardLocked: {
    backgroundColor: AppColors.cardBg,
    borderColor: AppColors.border,
    opacity: 0.5,
  },
  badgeEmoji: { fontSize: 28 },
  badgeEmojiLocked: { opacity: 0.4 },
  badgeLabel: { fontSize: 13, fontWeight: '600', color: AppColors.text, textAlign: 'center' },
  badgeLabelLocked: { color: AppColors.secondaryText },
  badgeDesc: { fontSize: 11, color: AppColors.secondaryText, textAlign: 'center', lineHeight: 15 },
  noReports: {
    backgroundColor: AppColors.cardBg,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  noReportsText: { color: AppColors.secondaryText, fontSize: 14 },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
    gap: 12,
  },
  reportDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  reportInfo: { flex: 1 },
  reportSpecies: { fontSize: 14, fontWeight: '600', color: AppColors.text },
  reportDate: { fontSize: 12, color: AppColors.secondaryText, marginTop: 2 },
  reportCatBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  reportCatText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: AppColors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: AppColors.secondaryText, textAlign: 'center', lineHeight: 20 },
  signOutBtnFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E24B4A44',
    backgroundColor: '#E24B4A0D',
    gap: 8,
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#E24B4A' },
});
