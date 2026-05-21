import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase, Report } from '@/lib/supabase';
import { AppColors } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

// Lazy-require react-native-maps only on native
const RNMaps         = isWeb ? null : require('react-native-maps');
const NativeMapView_ : any = RNMaps?.default ?? null;
const NativeMarker_  : any = RNMaps?.Marker   ?? null;

// Decodes PostGIS EWKB hex → lat/lng using DataView (no Buffer needed)
function decodeEWKB(hex: string | null): { latitude: number; longitude: number } | null {
  if (!hex || !/^[0-9a-fA-F]+$/.test(hex)) return null;
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    const view   = new DataView(bytes.buffer);
    const isLE   = bytes[0] === 1;
    const type   = isLE ? view.getUint32(1, true)  : view.getUint32(1, false);
    const hasSrid = !!(type & 0x20000000);
    const offset  = 5 + (hasSrid ? 4 : 0);
    const longitude = view.getFloat64(offset,     isLE);
    const latitude  = view.getFloat64(offset + 8, isLE);
    if (!isFinite(latitude) || !isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  wildlife: AppColors.category.wildlife,
  plant:    AppColors.category.plant,
  marine:   AppColors.category.marine,
  invasive: AppColors.category.invasive,
};

// Default region shown before reports load (UK-centred)
const DEFAULT_REGION = {
  latitude: 54.5,
  longitude: -3.5,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

// ── Web fallback: simple report list ─────────────────────────────────────────
function WebReportList({ reports, loading }: { reports: Report[]; loading: boolean }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sightings</Text>
        <Text style={styles.subtitle}>{reports.length} reports</Text>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={AppColors.primary} />
          <Text style={styles.loadingText}>Loading sightings…</Text>
        </View>
      ) : reports.length === 0 ? (
        <View style={styles.loaderContainer}>
          <Text style={styles.emptyEmoji}>🌿</Text>
          <Text style={styles.emptyText}>No sightings yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {reports.map((r) => {
            const color = CATEGORY_COLORS[r.category] ?? AppColors.primary;
            return (
              <View key={r.id} style={styles.card}>
                <View style={[styles.cardAccent, { backgroundColor: color }]} />
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardSpecies} numberOfLines={1}>
                      {r.species_name || 'Unknown species'}
                    </Text>
                    <View style={[styles.catBadge, { backgroundColor: color + '22' }]}>
                      <Text style={[styles.catBadgeText, { color }]}>{r.category}</Text>
                    </View>
                  </View>
                  {!!r.description && (
                    <Text style={styles.cardDesc} numberOfLines={2}>{r.description}</Text>
                  )}
                  {r.latitude != null && r.longitude != null && (
                    <Text style={styles.cardCoords}>
                      📍 {r.latitude.toFixed(4)}, {r.longitude.toFixed(4)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── Native map view ───────────────────────────────────────────────────────────
function NativeMap({ reports, loading }: { reports: Report[]; loading: boolean }) {
  const mapRef   = useRef<any>(null);
  const MapView  = NativeMapView_;
  const Marker   = NativeMarker_;

  const [mapReady,  setMapReady]  = useState(false);
  const [selected,  setSelected]  = useState<Report | null>(null);
  const [locating,  setLocating]  = useState(false);

  // Auto-fly to most recent report once map is ready and data is loaded
  useEffect(() => {
    if (!mapReady || loading || reports.length === 0) return;
    const first = reports[0];
    mapRef.current?.animateToRegion(
      { latitude: first.latitude!, longitude: first.longitude!, latitudeDelta: 0.05, longitudeDelta: 0.05 },
      1200,
    );
  }, [mapReady, loading, reports]);

  async function goToMyLocation() {
    setLocating(true);
    try {
      // Check existing status before requesting — on iOS, once denied, the dialog never shows again
      const { status: existing, canAskAgain } = await Location.getForegroundPermissionsAsync();

      let finalStatus = existing;

      if (existing !== 'granted') {
        if (!canAskAgain) {
          // Permanently denied — must go to Settings
          Alert.alert(
            'Location Access Disabled',
            'Please enable location access in your iPhone Settings → Privacy & Security → Location Services → Expo Go',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
        // First ask — shows the iOS permission dialog
        const { status } = await Location.requestForegroundPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location access in your iPhone Settings → Privacy & Security → Location Services → Expo Go',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      mapRef.current?.animateToRegion(
        { latitude: pos.coords.latitude, longitude: pos.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        800,
      );
    } catch {
      Alert.alert('Location error', 'Could not determine your current location. Please try again.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.container}>

      {/* Map fills the whole screen */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={DEFAULT_REGION}
        showsUserLocation
        onMapReady={() => setMapReady(true)}
        onPress={() => setSelected(null)}
      >
        {reports.map((r) => {
          const color = CATEGORY_COLORS[r.category] ?? AppColors.primary;
          return (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.latitude!, longitude: r.longitude! }}
              tracksViewChanges={false}
              onPress={(e: any) => { e.stopPropagation?.(); setSelected(r); }}
            >
              {/* Custom coloured teardrop pin */}
              <View style={[styles.pin, { borderColor: color }]}>
                <View style={[styles.pinDot, { backgroundColor: color }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Header overlay */}
      <SafeAreaView pointerEvents="none" style={styles.headerSafe}>
        <View style={styles.headerOverlay}>
          <Text style={styles.title}>Sighting Map</Text>
          <Text style={styles.subtitle}>
            {loading ? 'Loading…' : `${reports.length} reports plotted`}
          </Text>
        </View>
      </SafeAreaView>

      {/* Loading spinner overlay while fetching */}
      {loading && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color={AppColors.primary} />
        </View>
      )}

      {/* Go to my location FAB */}
      <TouchableOpacity style={styles.locateFab} onPress={goToMyLocation} disabled={locating}>
        {locating
          ? <ActivityIndicator size="small" color={AppColors.primary} />
          : <Ionicons name="locate" size={22} color={AppColors.primary} />
        }
      </TouchableOpacity>

      {/* Category legend */}
      <View style={styles.legend}>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <View key={cat} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{cat}</Text>
          </View>
        ))}
      </View>

      {/* ── Selected report card (bottom sheet) ── */}
      {selected && (
        <View style={styles.reportCard}>
          {selected.photo_url ? (
            <Image source={{ uri: selected.photo_url }} style={styles.reportPhoto} resizeMode="cover" />
          ) : (
            <View style={styles.reportPhotoPlaceholder}>
              <Text style={styles.reportPhotoEmoji}>🌿</Text>
            </View>
          )}

          <View style={styles.reportCardBody}>
            <View style={styles.reportCardTop}>
              <Text style={styles.reportSpecies} numberOfLines={1}>
                {selected.species_name || 'Unknown species'}
              </Text>
              <View style={[styles.reportCatBadge, { backgroundColor: (CATEGORY_COLORS[selected.category] ?? AppColors.primary) + '22' }]}>
                <Text style={[styles.reportCatText, { color: CATEGORY_COLORS[selected.category] ?? AppColors.primary }]}>
                  {selected.category}
                </Text>
              </View>
            </View>

            {!!selected.location_name && (
              <Text style={styles.reportLocation} numberOfLines={1}>
                📍 {selected.location_name}
              </Text>
            )}

            <Text style={styles.reportDate}>
              {new Date(selected.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </Text>
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={() => setSelected(null)} hitSlop={12}>
            <Ionicons name="close" size={18} color={AppColors.secondaryText} />
          </TouchableOpacity>
        </View>
      )}

    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function MapScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('id, user_id, category, species_name, description, photo_url, location, location_name, created_at')
          .not('location', 'is', null)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) { console.error('[Map] fetch error:', error.message); return; }

        console.log('[Map] raw rows fetched:', data?.length ?? 0);
        if (data?.[0]) console.log('[Map] sample location hex:', String(data[0].location).slice(0, 30));

        const decoded: Report[] = (data ?? [])
          .map((r: any) => {
            const coords = decodeEWKB(r.location);
            return { ...r, latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null };
          })
          .filter((r) => r.latitude != null && r.longitude != null);

        console.log('[Map] decoded with coords:', decoded.length);
        setReports(decoded);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  if (isWeb) return <WebReportList reports={reports} loading={loading} />;
  return <NativeMap reports={reports} loading={loading} />;
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: AppColors.background },
  // Header overlay (native)
  headerSafe:      { position: 'absolute', top: 0, left: 0, right: 0 },
  headerOverlay:   { marginHorizontal: 16, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  // Web header (non-overlay)
  header:          { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title:           { fontSize: 18, fontWeight: '700', color: AppColors.text },
  subtitle:        { fontSize: 12, color: AppColors.secondaryText, marginTop: 1 },
  // Loading
  loaderContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingOverlay:  { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.55)' },
  loadingText:     { color: AppColors.secondaryText, fontSize: 14 },
  emptyEmoji:      { fontSize: 40, marginBottom: 8 },
  emptyText:       { fontSize: 15, color: AppColors.secondaryText },
  // Custom pin marker
  pin:             { width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  pinDot:          { width: 12, height: 12, borderRadius: 6 },
  // Go to my location FAB
  locateFab:       { position: 'absolute', right: 16, bottom: 120, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  // Legend
  legend:          { position: 'absolute', bottom: 70, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', backgroundColor: 'rgba(255,255,255,0.92)', paddingVertical: 8, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: AppColors.border },
  legendItem:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:       { width: 9, height: 9, borderRadius: 5 },
  legendLabel:     { fontSize: 11, color: AppColors.secondaryText, textTransform: 'capitalize' },
  // Selected report bottom card
  reportCard:      { position: 'absolute', bottom: 70, left: 12, right: 12, backgroundColor: '#fff', borderRadius: 16, flexDirection: 'row', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: -2 }, elevation: 8 },
  reportPhoto:     { width: 90, height: 90 },
  reportPhotoPlaceholder: { width: 90, height: 90, backgroundColor: AppColors.cardBg, alignItems: 'center', justifyContent: 'center' },
  reportPhotoEmoji: { fontSize: 30 },
  reportCardBody:  { flex: 1, padding: 12, justifyContent: 'center', gap: 4 },
  reportCardTop:   { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  reportSpecies:   { fontSize: 15, fontWeight: '700', color: AppColors.text, flex: 1 },
  reportCatBadge:  { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  reportCatText:   { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  reportLocation:  { fontSize: 12, color: AppColors.secondaryText },
  reportDate:      { fontSize: 11, color: AppColors.secondaryText },
  closeBtn:        { padding: 12, alignSelf: 'flex-start' },
  // Web list
  listContent:     { padding: 16, gap: 12 },
  card:            { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: AppColors.border },
  cardAccent:      { width: 5 },
  cardBody:        { flex: 1, padding: 14, gap: 4 },
  cardTop:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardSpecies:     { fontSize: 15, fontWeight: '600', color: AppColors.text, flex: 1 },
  cardDesc:        { fontSize: 13, color: AppColors.secondaryText, lineHeight: 18 },
  cardCoords:      { fontSize: 11, color: AppColors.secondaryText, marginTop: 2 },
  catBadge:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  catBadgeText:    { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
