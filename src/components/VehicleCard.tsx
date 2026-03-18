import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Linking, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VehicleResult, ListingLink, fetchVehicleMedia, CarImage } from '../api/vehicle';
import { colors, spacing, radius, font } from '../theme';

interface Props { data: VehicleResult; postcode?: string; }

const SPECS = [
  { key: 'make',     label: 'Make',   icon: '🏭' },
  { key: 'model',    label: 'Model',  icon: '🚗' },
  { key: 'colour',   label: 'Colour', icon: '🎨' },
  { key: 'fuelType', label: 'Fuel',   icon: '⛽' },
  { key: '_engine',  label: 'Engine', icon: '🔧' },
  { key: 'vin',      label: 'VIN',    icon: '🔑', mono: true },
] as const;

export function VehicleCard({ data, postcode }: Props) {
  const [image, setImage]         = useState<CarImage | null>(null);
  const [listings, setListings]   = useState<ListingLink[] | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const name = [data.make, data.model].filter(Boolean).join(' ') || 'Unknown Vehicle';
  const specData: Record<string, string | null> = {
    make: data.make, model: data.model, colour: data.colour,
    fuelType: data.fuelType, vin: data.vin,
    _engine: data.engineSize ? data.engineSize + ' cc' : null,
  };

  useEffect(() => {
    if (!data.make && !data.model) return;
    fetchVehicleMedia(data.make ?? '', data.model ?? '', data.year, data.country, postcode)
      .then((r) => { if (r) { setImage(r.image); setListings(r.listings); } });
  }, [data, postcode]);

  return (
    <View style={styles.card}>

      {/* Hero image */}
      <View style={styles.hero}>
        {image?.url ? (
          <Image
            source={{ uri: image.url }}
            style={styles.heroImg}
            resizeMode="cover"
            onLoad={() => setImgLoaded(true)}
          />
        ) : null}
        {!imgLoaded && (
          <View style={styles.heroPh}>
            {image?.url
              ? <ActivityIndicator color={colors.blue} />
              : <Text style={styles.heroPhIcon}>🚗</Text>}
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(7,12,26,0.6)', 'rgba(7,12,26,0.97)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroTitle}>
          <Text style={styles.heroName}>{name}</Text>
          {data.year != null && (
            <View style={styles.yearChip}>
              <Text style={styles.yearChipTxt}>{data.year}</Text>
            </View>
          )}
        </View>
        {image?.source === 'wikipedia' && (
          <Text style={styles.credit}>© Wikipedia</Text>
        )}
      </View>

      {/* Spec grid */}
      <View style={styles.specGrid}>
        {SPECS.filter(s => specData[s.key] != null).map((s, i, arr) => {
          const full = arr.length % 2 !== 0 && i === arr.length - 1;
          return (
            <View key={s.key} style={[styles.specCell, full && styles.specFull]}>
              <Text style={styles.specLbl}>{s.icon}  {s.label}</Text>
              <Text style={[styles.specVal, 'mono' in s && (s as any).mono && styles.mono]}>
                {String(specData[s.key])}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Meta badges */}
      <View style={styles.meta}>
        <View style={styles.badgeB}>
          <Text style={styles.badgeBTxt}>{data.source.toUpperCase()}</Text>
        </View>
        {data.cachedAt && (
          <View style={styles.badgeY}>
            <Text style={styles.badgeYTxt}>CACHED</Text>
          </View>
        )}
      </View>

      {/* Listings */}
      {(data.make || data.model) && (
        <View style={styles.listings}>
          <Text style={styles.listingsHd}>Buy Used — Listings Near You</Text>
          {listings === null ? (
            <View style={{ gap: spacing.sm }}>
              {[0, 1, 2].map(i => <View key={i} style={styles.skeletonRow} />)}
            </View>
          ) : listings.length === 0 ? (
            <Text style={styles.listingsNone}>No listing sources available.</Text>
          ) : (
            listings.map(l => (
              <TouchableOpacity
                key={l.id}
                style={styles.listingBtn}
                onPress={() => Linking.openURL(l.url)}
                activeOpacity={0.75}
              >
                <Text style={styles.listingFlag}>{l.flag}</Text>
                <View style={styles.listingBody}>
                  <Text style={styles.listingCta}>{l.cta}</Text>
                  <Text style={styles.listingSite}>{l.site}</Text>
                </View>
                {l.minPrice && (
                  <View style={styles.priceBox}>
                    <Text style={styles.priceVal}>{l.minPrice}</Text>
                    <Text style={styles.priceLbl}>from</Text>
                  </View>
                )}
                <Text style={styles.arrow}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  hero:        { width: '100%', height: 200, backgroundColor: '#0D1530' },
  heroImg:     { ...StyleSheet.absoluteFillObject },
  heroPh:      { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  heroPhIcon:  { fontSize: 40, opacity: 0.15 },
  heroTitle:   { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: spacing.md },
  heroName:    { fontSize: font.sizes.xxl, fontWeight: font.weights.extrabold, color: colors.t1, letterSpacing: -0.3 },
  yearChip:    {
    alignSelf: 'flex-start', marginTop: spacing.xs,
    backgroundColor: colors.blueDim, borderWidth: 1, borderColor: 'rgba(79,163,255,0.3)',
    borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2,
  },
  yearChipTxt: { color: colors.blue, fontSize: font.sizes.xs, fontWeight: font.weights.bold },
  credit: {
    position: 'absolute', bottom: spacing.sm, right: spacing.md,
    fontSize: 10, color: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: colors.border },
  specCell: {
    width: '50%', padding: spacing.md,
    borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  specFull:    { width: '100%' },
  specLbl:     { fontSize: font.sizes.xs, color: colors.t3, fontWeight: font.weights.semibold, marginBottom: 3 },
  specVal:     { fontSize: font.sizes.md, color: colors.t1, fontWeight: font.weights.semibold },
  mono:        { fontFamily: 'monospace', fontSize: font.sizes.xs, color: colors.t2 },
  meta:        { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.2)', borderTopWidth: 1, borderTopColor: colors.border },
  badgeB:      { backgroundColor: colors.blueDim, borderWidth: 1, borderColor: 'rgba(79,163,255,0.28)', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeBTxt:   { color: colors.blue, fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 0.7 },
  badgeY:      { backgroundColor: 'rgba(252,211,77,0.12)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.22)', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeYTxt:   { color: colors.yellow, fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 0.7 },
  listings:    { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, gap: spacing.sm },
  listingsHd:  { fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1, textTransform: 'uppercase', color: colors.t3, marginBottom: spacing.xs },
  listingBtn:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.05)' },
  listingFlag: { fontSize: 20 },
  listingBody: { flex: 1 },
  listingCta:  { fontSize: font.sizes.md, fontWeight: font.weights.semibold, color: colors.t1 },
  listingSite: { fontSize: font.sizes.xs, color: colors.t3, marginTop: 2 },
  priceBox:    { alignItems: 'flex-end' },
  priceVal:    { fontSize: font.sizes.md, fontWeight: font.weights.extrabold, color: colors.blue },
  priceLbl:    { fontSize: 10, color: colors.t4 },
  arrow:       { color: colors.t3, fontSize: font.sizes.lg },
  skeletonRow: { height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.06)' },
  listingsNone:{ fontSize: font.sizes.sm, color: colors.t3, textAlign: 'center', paddingVertical: spacing.sm },
});
