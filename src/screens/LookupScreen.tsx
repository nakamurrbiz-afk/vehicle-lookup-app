import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StatusBar, TextInput, Dimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { PlateInput } from '../components/PlateInput';
import { VehicleCard } from '../components/VehicleCard';
import { ErrorCard } from '../components/ErrorCard';
import { useVehicleLookup } from '../hooks/useVehicleLookup';
import { useAnalytics } from '../hooks/useAnalytics';
import { ScannerScreen } from './ScannerScreen';
import { PlateGameScreen } from './PlateGameScreen';
import { colors, spacing, radius, font } from '../theme';
import { VehicleResult, fetchVehicleMedia } from '../api/vehicle';
import { HistoryEntry } from '../hooks/useHistory';

// Ban-go is a UK-only app: DVLA/DVSA are the free, official, deep data source.
const COUNTRY = 'GB';

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

export function LookupScreen({ onOpenHistory, onResult, entries }: Props) {
  const [plate,    setPlate]    = useState('');
  const [postcode, setPostcode] = useState('');
  const [locating, setLocating] = useState(false);
  const [locMsg,   setLocMsg]   = useState<{ text: string; ok: boolean } | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showGame,    setShowGame]    = useState(false);

  const { state, lookup, reset } = useVehicleLookup();
  const { track } = useAnalytics();

  useEffect(() => {
    if (state.status === 'success') {
      onResult(state.data);
      track({ name: 'search_success', props: { country: COUNTRY, make: state.data.make ?? '', model: state.data.model ?? '' } });
    }
    if (state.status === 'error') {
      track({ name: 'search_error', props: { country: COUNTRY, error: state.error } });
    }
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-detect postcode on mount (silent) — country is always GB
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const [geo] = await Location.reverseGeocodeAsync(pos.coords);
        if (geo?.postalCode) {
          setPostcode(geo.postalCode);
          setLocMsg({ text: `Detected: ${geo.postalCode}`, ok: true });
        }
      } catch {
        // Silent fail — user can detect manually
      }
    })();
  }, []);

  function handleSearch() {
    if (plate.trim().length >= 2) {
      track({ name: 'search_initiated', props: { country: COUNTRY, plate_length: plate.trim().length, has_postcode: postcode.trim().length > 0 } });
      lookup(plate, COUNTRY);
    }
  }

  async function detectLocation() {
    track({ name: 'location_detect_tapped', props: {} });
    setLocating(true); setLocMsg(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        track({ name: 'location_detected', props: { success: false } });
        setLocMsg({ text: 'Location permission denied.', ok: false }); return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync(pos.coords);
      if (geo?.postalCode) {
        track({ name: 'location_detected', props: { success: true } });
        setPostcode(geo.postalCode);
        setLocMsg({ text: `Detected: ${geo.postalCode}`, ok: true });
      } else {
        track({ name: 'location_detected', props: { success: false } });
        setLocMsg({ text: 'Postcode not found. Enter manually.', ok: false });
      }
    } catch {
      track({ name: 'location_detected', props: { success: false } });
      setLocMsg({ text: 'Could not detect location.', ok: false });
    } finally {
      setLocating(false);
    }
  }

  const canSearch = plate.trim().length >= 2 && state.status !== 'loading';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Ban-go</Text>
            <Text style={styles.subtitle}>UK number plate & MOT check</Text>
          </View>

          {/* Form card */}
          <View style={styles.card}>

            <View>
              <View style={styles.plateHeader}>
                <Text style={styles.lbl}>Number Plate</Text>
                <TouchableOpacity
                  style={styles.scanBtn}
                  onPress={() => setShowScanner(true)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.scanBtnTxt}>📷 Scan</Text>
                </TouchableOpacity>
              </View>
              <PlateInput value={plate} onChange={setPlate} country={COUNTRY} />
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
                  placeholder="Postcode (e.g. W1K 3JP)"
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

            <TouchableOpacity
              style={[styles.searchBtn, !canSearch && styles.searchBtnOff]}
              onPress={handleSearch}
              activeOpacity={0.85}
              disabled={!canSearch}
            >
              {state.status === 'loading'
                ? <ActivityIndicator color="#fff" />
                : <Text style={[styles.searchBtnTxt, !canSearch && styles.searchBtnTxtOff]} adjustsFontSizeToFit numberOfLines={1}>
                    Search Vehicle
                  </Text>}
            </TouchableOpacity>

          </View>

          {/* Recent searches — hidden while result is showing */}
          {entries.length > 0 && state.status !== 'success' && (
            <View>
              <View style={styles.recentHeader}>
                <Text style={styles.lbl}>Recent</Text>
                <TouchableOpacity
                  onPress={() => { track({ name: 'history_opened', props: {} }); onOpenHistory(); }}
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
                      track({ name: 'recent_card_tapped', props: { country: entry.country } });
                      setPlate(entry.plate);
                      reset();
                      setTimeout(() => lookup(entry.plate, entry.country), 50);
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
                <View style={styles.resultActions}>
                  <TouchableOpacity
                    style={styles.gameBtn}
                    onPress={() => setShowGame(true)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.gameBtnTxt}>🎮 Play Game</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { reset(); setPlate(''); }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text style={styles.clearTxt}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <VehicleCard data={state.data} postcode={postcode} />
            </View>
          )}

          {state.status === 'error' && (
            <ErrorCard error={state.error} onRetry={() => lookup(plate, COUNTRY)} />
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {state.status === 'success' && (
        <PlateGameScreen
          visible={showGame}
          plate={state.data.plate}
          make={state.data.make}
          model={state.data.model}
          year={state.data.year}
          onClose={() => setShowGame(false)}
        />
      )}

      <ScannerScreen
        visible={showScanner}
        country={COUNTRY}
        onDetected={(scannedPlate) => {
          setPlate(scannedPlate);
          setShowScanner(false);
          setTimeout(() => lookup(scannedPlate, COUNTRY), 150);
        }}
        onClose={() => setShowScanner(false)}
      />
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
  searchBtn:    { height: 54, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue, shadowColor: colors.blue, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  searchBtnOff: { backgroundColor: 'rgba(255,255,255,0.09)', shadowOpacity: 0, elevation: 0 },
  searchBtnTxt:    { color: '#fff', fontSize: font.sizes.lg, fontWeight: font.weights.bold },
  searchBtnTxtOff: { color: colors.t4 },
  plateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scanBtn:     { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.blueDim, borderWidth: 1, borderColor: colors.borderBlue, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 5 },
  scanBtnTxt:  { fontSize: font.sizes.xs, fontWeight: font.weights.bold, color: colors.blue, letterSpacing: 0.5 },

  resultBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  resultActions:{ flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  gameBtn:      { backgroundColor: 'rgba(252,211,77,0.12)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.3)', borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 5 },
  gameBtnTxt:   { fontSize: font.sizes.xs, fontWeight: font.weights.bold, color: colors.yellow, letterSpacing: 0.5 },
  clearTxt:     { fontSize: font.sizes.sm, color: colors.blue },

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
