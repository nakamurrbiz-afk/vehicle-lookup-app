import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar, TextInput, Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { CountrySelector, COUNTRIES } from '../components/CountrySelector';
import { PlateInput } from '../components/PlateInput';
import { VehicleCard } from '../components/VehicleCard';
import { ErrorCard } from '../components/ErrorCard';
import { useVehicleLookup } from '../hooks/useVehicleLookup';
import { colors, spacing, radius, font } from '../theme';
import { VehicleResult, fetchVehicleMedia } from '../api/vehicle';
import { HistoryEntry } from '../hooks/useHistory';

interface Props {
  onOpenHistory: () => void;
  onResult: (result: VehicleResult) => void;
  entries: HistoryEntry[];
}

function miniTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SCREEN_WIDTH = Platform.OS === 'web' ? 480 : Dimensions.get('window').width;
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.70);
const CARD_GAP = spacing.md;

function RecentCard({ entry, onPress }: { entry: HistoryEntry; onPress: () => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!entry.make) return;
    fetchVehicleMedia(entry.make, entry.model, entry.year, entry.country)
      .then(media => setImageUrl(media?.images?.[0]?.url ?? null))
      .catch(() => {});
  }, []);

  const label = [entry.make, entry.model].filter(Boolean).join(' ') || 'Unknown Vehicle';
  const meta  = [entry.year, miniTimeAgo(entry.searchedAt)].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity style={[styles.recentCard, { width: CARD_WIDTH }]} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.recentCardImg}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.recentImg} resizeMode="cover" />
        ) : (
          <View style={styles.recentImgPlaceholder}>
            <Text style={styles.recentImgInitial}>{entry.make?.[0] ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.recentCardBody}>
        <Text style={styles.recentVehicle} numberOfLines={1}>{label}</Text>
        <Text style={styles.recentMeta} numberOfLines={1}>{meta}</Text>
      </View>
    </TouchableOpacity>
  );
}

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC',
];

export function LookupScreen({ onOpenHistory, onResult, entries }: Props) {
  const [plate,    setPlate]    = useState('');
  const [country,  setCountry]  = useState('GB');
  const [usState,  setUsState]  = useState('CA');
  const [postcode, setPostcode] = useState('');
  const [locating, setLocating] = useState(false);
  const [locMsg,   setLocMsg]   = useState<{ text: string; ok: boolean } | null>(null);

  const { state, lookup, reset } = useVehicleLookup();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (state.status === 'success') onResult(state.data);
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to reveal search button when US state row appears
  useEffect(() => {
    if (country === 'US') {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  }, [country]);

  // Auto-detect on mount (silent)
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const [geo] = await Location.reverseGeocodeAsync(pos.coords);
        if (geo?.isoCountryCode) {
          const found = COUNTRIES.find(c => c.code === geo.isoCountryCode);
          if (found) setCountry(found.code);
        }
        if (geo?.postalCode) {
          setPostcode(geo.postalCode);
          setLocMsg({ text: `Detected: ${geo.postalCode}`, ok: true });
        }
      } catch {
        // Silent fail — user can detect manually
      }
    })();
  }, []);

  function handleCountryChange(code: string) {
    setCountry(code); setPlate(''); setPostcode(''); setLocMsg(null); reset();
  }

  function handleSearch() {
    if (plate.trim().length >= 2) lookup(plate, country, country === 'US' ? usState : undefined);
  }

  async function detectLocation() {
    setLocating(true); setLocMsg(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocMsg({ text: 'Location permission denied.', ok: false }); return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync(pos.coords);

      // Auto-set country if it's in our supported list
      if (geo?.isoCountryCode) {
        const found = COUNTRIES.find(c => c.code === geo.isoCountryCode);
        if (found && found.code !== country) {
          setCountry(found.code);
          setPlate('');
        }
      }

      if (geo?.postalCode) {
        setPostcode(geo.postalCode);
        setLocMsg({ text: `Detected: ${geo.postalCode}`, ok: true });
      } else {
        setLocMsg({ text: 'Postcode not found. Enter manually.', ok: false });
      }
    } catch {
      setLocMsg({ text: 'Could not detect location.', ok: false });
    } finally {
      setLocating(false);
    }
  }

  const currentCountry = COUNTRIES.find(c => c.code === country) ?? COUNTRIES[0];
  const isUnavailable  = !currentCountry.available;
  const canSearch      = plate.trim().length >= 2 && state.status !== 'loading' && !isUnavailable;

  const pcPlaceholders: Record<string, string> = {
    GB: 'Postcode (e.g. W1K 3JP)',
    US: 'ZIP code (e.g. 10001)',
    NL: 'Postcode (e.g. 1234 AB)',
    JP: 'Postcode (e.g. 100-0001)',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>PlateCheck</Text>
            <Text style={styles.subtitle}>Identify any vehicle from its license plate</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>

            <View>
              <Text style={styles.lbl}>Country</Text>
              <CountrySelector selected={country} onChange={handleCountryChange} />
            </View>

            {country === 'US' && (
              <View>
                <Text style={styles.lbl}>State</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stateScroll} contentContainerStyle={styles.stateRow}>
                  {US_STATES.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.stateChip, usState === s && styles.stateChipActive]}
                      onPress={() => setUsState(s)}
                    >
                      <Text style={[styles.stateChipTxt, usState === s && styles.stateChipTxtActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View>
              <Text style={styles.lbl}>License Plate</Text>
              <PlateInput value={plate} onChange={setPlate} country={country} />
            </View>

            <View>
              <Text style={styles.lbl}>
                Your Location{' '}
                <Text style={styles.lblNote}>for nearby listings</Text>
              </Text>
              <View style={styles.locRow}>
                <TextInput
                  style={styles.locInput}
                  value={postcode}
                  onChangeText={t => { setPostcode(t.toUpperCase()); setLocMsg(null); }}
                  placeholder={pcPlaceholders[country] ?? 'Postcode'}
                  placeholderTextColor={colors.t4}
                  autoCorrect={false}
                  maxLength={10}
                />
                <TouchableOpacity
                  style={styles.locBtn}
                  onPress={detectLocation}
                  disabled={locating}
                  activeOpacity={0.75}
                >
                  {locating
                    ? <ActivityIndicator size="small" color={colors.t2} />
                    : <Text style={styles.locBtnTxt}>Detect</Text>}
                </TouchableOpacity>
              </View>
              {locMsg && (
                <Text style={[styles.locStatus, locMsg.ok ? styles.locOk : styles.locErr]}>
                  {locMsg.text}
                </Text>
              )}
            </View>

            {isUnavailable && (
              <View style={styles.jpNotice}>
                <Text style={styles.jpNoticeTxt}>
                  {currentCountry.label} is currently under development and not yet available.{'\n'}
                  Please check back soon for updates.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.searchBtn, !canSearch && styles.searchBtnOff]}
              onPress={handleSearch}
              activeOpacity={0.85}
              disabled={!canSearch}
            >
              {state.status === 'loading'
                ? <ActivityIndicator color="#fff" />
                : <Text style={[styles.searchBtnTxt, !canSearch && styles.searchBtnTxtOff]} adjustsFontSizeToFit numberOfLines={1}>
                    {isUnavailable ? `${currentCountry.label} — Coming Soon` : 'Search Vehicle'}
                  </Text>}
            </TouchableOpacity>

          </View>

          {/* Recent searches — hidden while result is showing */}
          {entries.length > 0 && state.status !== 'success' && (
            <View>
              <View style={styles.recentHeader}>
                <Text style={styles.lbl}>Recent</Text>
                <TouchableOpacity
                  onPress={onOpenHistory}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.seeAllTxt}>See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.recentScroll}
                contentContainerStyle={styles.recentContent}
                keyboardShouldPersistTaps="handled"
                snapToInterval={CARD_WIDTH + CARD_GAP}
                snapToAlignment="start"
                decelerationRate="fast"
              >
                {entries.slice(0, 10).map(entry => (
                  <RecentCard
                    key={entry.id}
                    entry={entry}
                    onPress={() => {
                      setCountry(entry.country);
                      setPlate(entry.plate);
                      reset();
                      setTimeout(() => lookup(
                        entry.plate,
                        entry.country,
                        entry.country === 'US' ? usState : undefined,
                      ), 50);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Result */}
          {state.status === 'success' && (
            <View>
              <View style={styles.resultBar}>
                <Text style={styles.lbl}>Result</Text>
                <TouchableOpacity
                  onPress={() => { reset(); setPlate(''); }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.clearTxt}>Clear</Text>
                </TouchableOpacity>
              </View>
              <VehicleCard data={state.data} postcode={postcode} />
            </View>
          )}

          {state.status === 'error' && (
            <ErrorCard error={state.error} onRetry={() => lookup(plate, country, country === 'US' ? usState : undefined)} />
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: colors.bg },
  flex:     { flex: 1, backgroundColor: colors.bg },
  scroll:   { flex: 1 },
  content:  { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  header:   { paddingTop: spacing.lg, paddingBottom: spacing.sm, alignItems: 'center' },
  title:    { fontSize: font.sizes.xxxl, fontWeight: font.weights.extrabold, color: colors.t1, letterSpacing: -1 },
  subtitle: { marginTop: spacing.xs, fontSize: font.sizes.sm, color: colors.t4, textAlign: 'center', letterSpacing: 0.3 },
  card:     { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.lg },
  lbl:      { fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.t3, marginBottom: spacing.sm },
  lblNote:  { fontWeight: '400', textTransform: 'none', letterSpacing: 0, fontSize: font.sizes.xs, color: colors.t4 },
  locRow:   { flexDirection: 'row', gap: spacing.sm },
  locInput: { flex: 1, padding: spacing.md, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, fontSize: font.sizes.md, fontWeight: font.weights.semibold, color: colors.t1, letterSpacing: 0.7 },
  locBtn:   { paddingHorizontal: spacing.md, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', minWidth: 80, height: 44 },
  locBtnTxt:    { fontSize: font.sizes.sm, fontWeight: font.weights.semibold, color: colors.t2 },
  locStatus:    { fontSize: font.sizes.xs, marginTop: spacing.xs },
  locOk:        { color: colors.green },
  locErr:       { color: colors.red },
  jpNotice:     { backgroundColor: 'rgba(255,255,255,0.05)', borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.2)', borderRadius: radius.sm, padding: spacing.md },
  jpNoticeTxt:  { fontSize: font.sizes.sm, color: colors.t2, lineHeight: 20 },
  searchBtn:    { height: 54, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, shadowColor: colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  searchBtnOff: { backgroundColor: 'rgba(255,255,255,0.09)', shadowOpacity: 0, elevation: 0 },
  searchBtnTxt:    { color: '#fff', fontSize: font.sizes.lg, fontWeight: font.weights.bold },
  searchBtnTxtOff: { color: colors.t4 },
  resultBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  clearTxt:  { fontSize: font.sizes.sm, color: colors.blue },
  stateScroll:     { marginHorizontal: -spacing.xs },
  stateRow:        { flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.xs },
  stateChip:       { paddingHorizontal: spacing.sm, paddingVertical: 8, minHeight: 36, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  stateChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  stateChipTxt:    { fontSize: font.sizes.xs, fontWeight: font.weights.semibold, color: colors.t3, letterSpacing: 0.5 },
  stateChipTxtActive: { color: '#fff' },

  recentHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  seeAllTxt:     { fontSize: font.sizes.sm, color: colors.blue, fontWeight: font.weights.semibold },
  // bleed past parent padding so cards align to left edge of content
  recentScroll:  { marginHorizontal: -spacing.lg },
  recentContent: { paddingLeft: spacing.lg, paddingRight: spacing.lg, gap: CARD_GAP },

  recentCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  recentCardImg: {
    width: '100%',
    height: 86,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  recentImg: { width: '100%', height: '100%' },
  recentImgPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  recentImgInitial: {
    fontSize: 40,
    fontWeight: font.weights.bold,
    color: colors.t4,
  },
  recentCardBody: {
    padding: spacing.md,
    gap: 4,
  },
  recentVehicle: { fontSize: font.sizes.md, fontWeight: font.weights.semibold, color: colors.t1 },
  recentMeta:    { fontSize: font.sizes.xs, color: colors.t4 },
});
