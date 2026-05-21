import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '@/lib/supabase';
import { AppColors } from '@/constants/theme';

type Category = 'wildlife' | 'plant' | 'marine' | 'invasive';

const CATEGORIES: { value: Category; label: string; color: string; emoji: string }[] = [
  { value: 'wildlife', label: 'Wildlife', color: AppColors.category.wildlife, emoji: '🦁' },
  { value: 'plant',    label: 'Plant',    color: AppColors.category.plant,    emoji: '🌿' },
  { value: 'marine',   label: 'Marine',   color: AppColors.category.marine,   emoji: '🐠' },
  { value: 'invasive', label: 'Invasive', color: AppColors.category.invasive, emoji: '⚠️' },
];

// Reverse geocode via Nominatim — returns a short human-readable place name
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'BioGuard/1.0' } },
    );
    if (!res.ok) return '';
    const data = await res.json();
    const parts: string[] = (data.display_name as string)?.split(',') ?? [];
    return parts.slice(0, 2).join(',').trim();
  } catch {
    return '';
  }
}

export default function ReportScreen() {
  const [category,     setCategory]     = useState<Category>('wildlife');
  const [speciesName,  setSpeciesName]  = useState('');
  const [description,  setDescription]  = useState('');
  const [photo,        setPhoto]        = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [location,     setLocation]     = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locLoading,   setLocLoading]   = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [identifying,  setIdentifying]  = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  // ── AI identification ────────────────────────────────────────────────────────
  async function identifySpecies(uri: string) {
    setIdentifying(true);
    setAiSuggestion('');
    try {
      console.log('[AI] reading photo from:', uri);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('[AI] base64 length:', base64.length, '(~', Math.round(base64.length * 0.75 / 1024), 'KB)');

      const url = 'https://bioguard-app.netlify.app/api/identify';
      const body = JSON.stringify({ image_base64: base64, description: '', region: 'UK' });
      console.log('[AI] POST', url, '— body size:', body.length, 'bytes (~', Math.round(body.length / 1024), 'KB)');

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      console.log('[AI] response status:', res.status, res.statusText);
      // Read as text first — JSON.parse can fail silently if the API returns HTML/plain-text on error
      const text = await res.text();
      console.log('[AI] response body (first 500 chars):', text.slice(0, 500));

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);

      const data = JSON.parse(text);
      if (data.species_name) {
        setSpeciesName(data.species_name);
        setAiSuggestion(data.species_name);
      }
      if (data.category && CATEGORIES.find((c) => c.value === data.category)) {
        setCategory(data.category as Category);
      }
    } catch (err: any) {
      console.error('[AI] identify error:', err?.message ?? String(err));
      // Silent fail — user can fill species name manually
    } finally {
      setIdentifying(false);
    }
  }

  // ── Photo picking ────────────────────────────────────────────────────────────
  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to attach photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0]);
      identifySpecies(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0]);
      identifySpecies(result.assets[0].uri);
    }
  }

  function clearPhoto() {
    setPhoto(null);
    setAiSuggestion('');
  }

  // ── Location ─────────────────────────────────────────────────────────────────
  async function getLocation() {
    setLocLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required to tag your report.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = pos.coords;
      setLocation({ latitude, longitude });
      // Reverse geocode in the background — update label once resolved
      reverseGeocode(latitude, longitude).then(setLocationName);
    } catch {
      Alert.alert('Location error', 'Could not get your current location. Please try again.');
    } finally {
      setLocLoading(false);
    }
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function submitReport() {
    if (!description.trim()) {
      Alert.alert('Missing info', 'Please add a description of your sighting.');
      return;
    }
    setSubmitting(true);
    try {
      let photo_url: string | null = null;

      if (photo) {
        console.log('[Report] photo URI:', photo.uri);
        console.log('[Report] photo mimeType:', photo.mimeType, 'size:', photo.width, 'x', photo.height);

        // Use mimeType from picker — don't assume JPEG (could be HEIC/PNG)
        const mimeType = photo.mimeType ?? 'image/jpeg';
        const fileExt  = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
        const fileName = `${Date.now()}.${fileExt}`;

        const base64 = await FileSystem.readAsStringAsync(photo.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log('[Report] base64 length:', base64.length, '(~', Math.round(base64.length * 0.75 / 1024), 'KB file)');

        // Uint8Array is more compatible with Supabase RN than passing .buffer (ArrayBuffer)
        const binary = atob(base64);
        const uint8Array = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) uint8Array[i] = binary.charCodeAt(i);
        console.log('[Report] Uint8Array byteLength:', uint8Array.byteLength);

        console.log('[Report] uploading', fileName, 'contentType:', mimeType);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('reports')
          .upload(fileName, uint8Array, { contentType: mimeType, upsert: true });

        if (uploadError) {
          console.error('[Report] upload error (full):', JSON.stringify(uploadError));
          console.error('[Report] upload error message:', uploadError.message);
          throw uploadError;
        }
        console.log('[Report] upload success, path:', uploadData?.path);
        const { data: urlData } = supabase.storage.from('reports').getPublicUrl(fileName);
        photo_url = urlData.publicUrl;
        console.log('[Report] public URL:', photo_url);
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('[Report] auth user:', user?.id ?? 'null', 'error:', userError?.message ?? 'none');

      const locationValue = location
        ? `SRID=4326;POINT(${location.longitude} ${location.latitude})`
        : null;
      console.log('[Report] inserting — category:', category, 'location:', locationValue, 'location_name:', locationName || null);

      const { error: insertError } = await supabase.from('reports').insert({
        user_id:       user?.id,
        category,
        species_name:  speciesName.trim() || null,
        description:   description.trim(),
        photo_url,
        location:      locationValue,
        location_name: locationName || null,
      });

      if (insertError) {
        console.error('[Report] insert error (full):', JSON.stringify(insertError));
        throw insertError;
      }
      console.log('[Report] insert success');

      Alert.alert('Report submitted! 🌿', 'Thank you for contributing to biodiversity tracking.', [
        {
          text: 'OK',
          onPress: () => {
            setCategory('wildlife');
            setSpeciesName('');
            setDescription('');
            setPhoto(null);
            setLocation(null);
            setLocationName('');
            setAiSuggestion('');
          },
        },
      ]);
    } catch (err: any) {
      console.error('[Report] submitReport caught:', err?.message ?? String(err));
      Alert.alert('Submission failed', err.message ?? 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>New Sighting Report</Text>
            <Text style={styles.subtitle}>Help us track biodiversity in your area</Text>
          </View>

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[styles.catBtn, category === cat.value && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => setCategory(cat.value)}>
                <Text style={styles.catBtnEmoji}>{cat.emoji}</Text>
                <Text style={[styles.catBtnLabel, category === cat.value && { color: '#fff' }]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Photo */}
          <Text style={styles.label}>Photo</Text>
          {photo ? (
            <>
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
                {identifying && (
                  <View style={styles.identifyingOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.identifyingText}>Identifying species…</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.removePhoto} onPress={clearPhoto}>
                  <Ionicons name="close-circle" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              {aiSuggestion && !identifying && (
                <View style={styles.aiPill}>
                  <Ionicons name="sparkles" size={13} color={AppColors.primary} />
                  <Text style={styles.aiPillText}>AI identified: {aiSuggestion}</Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={22} color={AppColors.primary} />
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                <Ionicons name="images-outline" size={22} color={AppColors.primary} />
                <Text style={styles.photoBtnText}>Library</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Species name */}
          <Text style={styles.label}>Species Name (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Red Kite"
            placeholderTextColor={AppColors.secondaryText}
            value={speciesName}
            onChangeText={setSpeciesName}
          />

          {/* Description */}
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Describe what you observed — behaviour, habitat, any concerns…"
            placeholderTextColor={AppColors.secondaryText}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Location */}
          <Text style={styles.label}>GPS Location</Text>
          <TouchableOpacity
            style={[styles.locationBtn, location && styles.locationBtnActive]}
            onPress={getLocation}
            disabled={locLoading}>
            {locLoading ? (
              <ActivityIndicator size="small" color={location ? '#fff' : AppColors.primary} />
            ) : (
              <Ionicons
                name={location ? 'location' : 'location-outline'}
                size={20}
                color={location ? '#fff' : AppColors.primary}
              />
            )}
            <Text style={[styles.locationBtnText, location && { color: '#fff' }]} numberOfLines={1}>
              {locLoading
                ? 'Detecting location…'
                : location
                  ? (locationName || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`)
                  : 'Get Current Location'}
            </Text>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={submitReport}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Report</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: AppColors.background },
  flex:          { flex: 1 },
  scroll:        { flex: 1 },
  header:        { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 4 },
  title:         { fontSize: 22, fontWeight: '700', color: AppColors.text },
  subtitle:      { fontSize: 14, color: AppColors.secondaryText, marginTop: 4 },
  label:         { fontSize: 14, fontWeight: '600', color: AppColors.text, marginHorizontal: 20, marginTop: 20, marginBottom: 8 },
  categoryRow:   { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8 },
  catBtn:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 50, borderWidth: 1.5, borderColor: AppColors.border, backgroundColor: AppColors.cardBg, gap: 5 },
  catBtnEmoji:   { fontSize: 15 },
  catBtnLabel:   { fontSize: 13, fontWeight: '500', color: AppColors.text },
  input:         { marginHorizontal: 20, borderWidth: 1, borderColor: AppColors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: AppColors.text, backgroundColor: AppColors.cardBg },
  textarea:      { minHeight: 100, paddingTop: 12 },
  // Photo
  photoRow:              { flexDirection: 'row', marginHorizontal: 20, gap: 12 },
  photoBtn:              { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: AppColors.primary, borderRadius: 12, paddingVertical: 14, gap: 8, backgroundColor: AppColors.primary + '0D' },
  photoBtnText:          { fontSize: 14, fontWeight: '500', color: AppColors.primary },
  photoPreviewContainer: { marginHorizontal: 20, position: 'relative' },
  photoPreview:          { width: '100%', height: 200, borderRadius: 12 },
  identifyingOverlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  identifyingText:       { color: '#fff', fontSize: 13, fontWeight: '600' },
  removePhoto:           { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
  aiPill:                { flexDirection: 'row', alignItems: 'center', gap: 5, marginHorizontal: 20, marginTop: 8, backgroundColor: AppColors.primary + '12', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  aiPillText:            { fontSize: 12, fontWeight: '600', color: AppColors.primary },
  // Location
  locationBtn:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, borderWidth: 1.5, borderColor: AppColors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, gap: 10, backgroundColor: AppColors.primary + '0D' },
  locationBtnActive: { backgroundColor: AppColors.primary, borderColor: AppColors.primary },
  locationBtnText:   { fontSize: 14, fontWeight: '500', color: AppColors.primary, flex: 1 },
  // Submit
  submitBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: AppColors.primary, marginHorizontal: 20, marginTop: 24, borderRadius: 14, paddingVertical: 16, gap: 8 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText:     { fontSize: 17, fontWeight: '600', color: '#fff' },
  bottomPad:         { height: 32 },
});
