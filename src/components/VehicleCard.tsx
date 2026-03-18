import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Linking, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  VehicleResult, ListingLink, MileageRecord, PriceSummary,
  fetchVehicleMedia, CarImage,
} from '../api/vehicle';
import { colors, spacing, radius, font } from '../theme';

interface Props { data: VehicleResult; postcode?: string; }

// ── Helpers ────────────────────────────────────────────────────────────────

function StarRating({ stars }: { stars: number }) {
  return (
    <Text style={styles.stars}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
    </Text>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function SpecRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.specRow}>
      <Text style={styles.specRowLabel}>{label}</Text>
      <View style={styles.specRowRight}>
        <Text style={styles.specRowValue}>{value}</Text>
        {sub ? <Text style={styles.specRowSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function MileageBar({ records }: { records: MileageRecord[] }) {
  if (records.length === 0) return null;
  const max = Math.max(...records.map(r => r.mileage));
  return (
    <View style={styles.mileageChart}>
      {records.slice(-6).map((r, i) => {
        const pct = max > 0 ? r.mileage / max : 0;
        return (
          <View key={i} style={styles.mileageCol}>
            <View style={styles.mileageBarBg}>
              <View style={[styles.mileageBarFill, { height: `${Math.round(pct * 100)}%` as any, backgroundColor: r.passed ? colors.green : colors.red }]} />
            </View>
            <Text style={styles.mileageYear}>{r.date.slice(0, 4)}</Text>
            <Text style={styles.mileageMi}>{(r.mileage / 1000).toFixed(0)}k</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export function VehicleCard({ data, postcode }: Props) {
  const [image, setImage]         = useState<CarImage | null>(null);
  const [listings, setListings]   = useState<ListingLink[] | null>(null);
  const [prices, setPrices]       = useState<PriceSummary | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  const name = [data.make, data.model].filter(Boolean).join(' ') || 'Unknown Vehicle';

  useEffect(() => {
    if (!data.make) return;
    fetchVehicleMedia(data.make, data.model, data.year, data.country, postcode)
      .then((r) => {
        if (r) { setImage(r.image); setListings(r.listings); setPrices(r.prices); }
        else   { setListings([]); }
      });
  }, [data, postcode]);

  const lastMileage = data.mileageHistory.length > 0
    ? data.mileageHistory[data.mileageHistory.length - 1].mileage
    : null;

  return (
    <View style={styles.card}>

      {/* ── Hero image ── */}
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
          colors={['transparent', 'transparent', 'rgba(7,12,26,0.55)', 'rgba(7,12,26,0.96)']}
          locations={[0, 0.45, 0.75, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroTitle}>
          {data.make && (
            <Text style={styles.heroMake}>{data.make.toUpperCase()}</Text>
          )}
          <Text style={styles.heroModel}>
            {data.model ?? (data.make ? 'Model Unknown' : 'Unknown Vehicle')}
          </Text>
          {data.year != null && (
            <Text style={styles.heroYear}>{data.year}</Text>
          )}
        </View>
        {/* Popularity badge */}
        {data.popularityCount > 1 && (
          <View style={styles.popularityBadge}>
            <Text style={styles.popularityTxt}>🔍 {data.popularityCount} lookups</Text>
          </View>
        )}
        {image?.source === 'unsplash' && (
          <Text style={styles.credit}>Photos by Unsplash</Text>
        )}
      </View>

      {/* ── Quick specs ── */}
      <View style={styles.section}>
        <SectionLabel label="Vehicle Details" />
        {data.colour    && <SpecRow label="Colour"      value={data.colour} />}
        {data.fuelType  && <SpecRow label="Fuel"        value={data.fuelType} />}
        {data.engineSize != null && (
          <SpecRow label="Engine" value={`${data.engineSize} cc`} />
        )}
        {data.co2Emissions != null && (
          <SpecRow label="CO₂" value={`${data.co2Emissions} g/km`} />
        )}
        {lastMileage != null && (
          <SpecRow
            label="Last MOT Mileage"
            value={`${lastMileage.toLocaleString()} mi`}
            sub="from DVSA"
          />
        )}
        {data.vin && (
          <SpecRow label="VIN" value={data.vin} />
        )}
      </View>

      {/* ── Euro NCAP ── */}
      {data.euroncapStars != null && (
        <View style={styles.section}>
          <SectionLabel label="Safety — Euro NCAP" />
          <View style={styles.ncapRow}>
            <StarRating stars={data.euroncapStars} />
            <Text style={styles.ncapLabel}>{data.euroncapStars} / 5 stars</Text>
          </View>
          <Text style={styles.sourceNote}>Source: euroncap.com (make-level estimate)</Text>
        </View>
      )}

      {/* ── Insurance group ── */}
      {data.insuranceGroup && (
        <View style={styles.section}>
          <SectionLabel label="Insurance Group (Estimate)" />
          <View style={styles.insRow}>
            <Text style={styles.insGroup}>{data.insuranceGroup.label}</Text>
            <Text style={styles.insScale}> / 50</Text>
          </View>
          <Text style={styles.sourceNote}>Source: Thatcham / comparethemarket.com 2024</Text>
        </View>
      )}

      {/* ── US: NHTSA Safety Rating ── */}
      {data.country === 'US' && data.nhtsaSafetyRating != null && (
        <View style={styles.section}>
          <SectionLabel label="Safety — NHTSA Overall Rating" />
          <View style={styles.ncapRow}>
            <StarRating stars={data.nhtsaSafetyRating} />
            <Text style={styles.ncapLabel}>{data.nhtsaSafetyRating} / 5 stars</Text>
          </View>
          <Text style={styles.sourceNote}>Source: nhtsa.gov (model-level)</Text>
        </View>
      )}

      {/* ── US: Recalls ── */}
      {data.country === 'US' && data.recallCount != null && (
        <View style={styles.section}>
          <SectionLabel label="NHTSA Recalls" />
          <View style={styles.ncapRow}>
            <Text style={[styles.insGroup, { color: data.recallCount > 0 ? colors.yellow : colors.green }]}>
              {data.recallCount}
            </Text>
            <Text style={styles.ncapLabel}> active recall{data.recallCount !== 1 ? 's' : ''}</Text>
          </View>
          <Text style={styles.sourceNote}>Source: api.nhtsa.gov/recalls</Text>
        </View>
      )}

      {/* ── US: EPA Fuel Economy ── */}
      {data.country === 'US' && (data.mpgCity != null || data.mpgHighway != null) && (
        <View style={styles.section}>
          <SectionLabel label="EPA Fuel Economy" />
          <View style={styles.priceGrid}>
            {data.mpgCity != null && (
              <View style={styles.pricePanel}>
                <Text style={styles.pricePanelLabel}>City</Text>
                <Text style={styles.pricePanelValue}>{data.mpgCity}</Text>
                <Text style={styles.pricePanelRange}>MPG</Text>
              </View>
            )}
            {data.mpgHighway != null && (
              <View style={[styles.pricePanel, styles.pricePanelUsed]}>
                <Text style={styles.pricePanelLabel}>Highway</Text>
                <Text style={[styles.pricePanelValue, styles.pricePanelValueUsed]}>{data.mpgHighway}</Text>
                <Text style={styles.pricePanelRange}>MPG</Text>
              </View>
            )}
          </View>
          <Text style={styles.sourceNote}>Source: fueleconomy.gov (EPA estimate)</Text>
        </View>
      )}

      {/* ── Price summary ── */}
      {(prices?.new || prices?.used) && (
        <View style={styles.section}>
          <SectionLabel label="Price Guide" />
          <View style={styles.priceGrid}>
            {prices.new && (
              <View style={styles.pricePanel}>
                <Text style={styles.pricePanelLabel}>New Car</Text>
                <Text style={styles.pricePanelValue}>{prices.new.from}</Text>
                <Text style={styles.pricePanelRange}>to {prices.new.to}</Text>
                {prices.new.note && (
                  <Text style={styles.pricePanelNote}>{prices.new.note}</Text>
                )}
              </View>
            )}
            {prices.used && (
              <View style={[styles.pricePanel, styles.pricePanelUsed]}>
                <Text style={styles.pricePanelLabel}>Used From</Text>
                <Text style={[styles.pricePanelValue, styles.pricePanelValueUsed]}>{prices.used.from}</Text>
                <Text style={styles.pricePanelRange}>{prices.used.source}</Text>
              </View>
            )}
          </View>
          {prices.new && (
            <Text style={styles.sourceNote}>Source: {prices.new.source}</Text>
          )}
        </View>
      )}

      {/* ── Running costs ── */}
      {data.runningCost && (
        <View style={styles.section}>
          <SectionLabel label="Estimated Annual Running Costs (UK, ~10k mi)" />
          <SpecRow label="Fuel per year"  value={data.runningCost.fuelPerYear} />
          <SpecRow label="Total per year" value={data.runningCost.totalPerYear} />
          <SpecRow label="Per mile"       value={data.runningCost.perMile} />
          <Text style={styles.sourceNote}>Source: {data.runningCost.source}</Text>
        </View>
      )}

      {/* ── Mileage history ── */}
      {data.mileageHistory.length > 1 && (
        <View style={styles.section}>
          <SectionLabel label="MOT Mileage History" />
          <MileageBar records={data.mileageHistory} />
          <Text style={styles.sourceNote}>Green = pass · Red = fail · Source: DVSA</Text>
        </View>
      )}

      {/* ── Common failures ── */}
      {data.commonFailures.length > 0 && (
        <View style={styles.section}>
          <SectionLabel label="Recurring MOT Failures" />
          {data.commonFailures.map((f, i) => (
            <View key={i} style={styles.failureRow}>
              <Text style={styles.failureDot}>⚠</Text>
              <Text style={styles.failureText}>{f}</Text>
            </View>
          ))}
          <Text style={styles.sourceNote}>Source: DVSA MOT history</Text>
        </View>
      )}

      {/* ── Meta badges ── */}
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

      {/* ── Listings ── */}
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
                onPress={() => {
                  const target = l.affiliateUrl ?? l.url;
                  if (Platform.OS === 'web') {
                    (window as any).open(target, '_blank', 'noopener,noreferrer');
                  } else {
                    Linking.openURL(target);
                  }
                }}
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

  // Hero
  hero:         { width: '100%', height: 240, backgroundColor: '#0D1530' },
  heroImg:      { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  heroPh:       { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  heroPhIcon:   { fontSize: 40, opacity: 0.15 },
  heroTitle:    { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: spacing.md },
  heroMake:     { fontSize: font.sizes.xs, fontWeight: font.weights.bold, color: 'rgba(255,255,255,0.55)', letterSpacing: 2, marginBottom: 2 },
  heroModel:    { fontSize: font.sizes.xxl, fontWeight: font.weights.extrabold, color: colors.t1, letterSpacing: -0.5, lineHeight: 30 },
  heroYear:     { fontSize: font.sizes.sm, color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  popularityBadge: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  popularityTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  credit: {
    position: 'absolute', bottom: spacing.sm, right: spacing.md,
    fontSize: 10, color: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },

  // Sections
  section:      { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, gap: 6 },
  sectionLabel: { fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1, textTransform: 'uppercase', color: colors.t3, marginBottom: 4 },
  sourceNote:   { fontSize: 10, color: colors.t4, marginTop: 4 },

  // Spec rows
  specRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  specRowLabel:  { fontSize: font.sizes.sm, color: colors.t3 },
  specRowRight:  { alignItems: 'flex-end' },
  specRowValue:  { fontSize: font.sizes.sm, color: colors.t1, fontWeight: font.weights.semibold },
  specRowSub:    { fontSize: 10, color: colors.t4 },

  // Euro NCAP
  ncapRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stars:     { fontSize: 22, color: '#FACC15', letterSpacing: 2 },
  ncapLabel: { fontSize: font.sizes.sm, color: colors.t2 },

  // Insurance
  insRow:    { flexDirection: 'row', alignItems: 'baseline' },
  insGroup:  { fontSize: 28, fontWeight: font.weights.extrabold, color: colors.t1 },
  insScale:  { fontSize: font.sizes.md, color: colors.t3 },

  // Price guide
  priceGrid:           { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  pricePanel:          { flex: 1, backgroundColor: 'rgba(79,163,255,0.08)', borderWidth: 1, borderColor: 'rgba(79,163,255,0.2)', borderRadius: radius.md, padding: spacing.md },
  pricePanelUsed:      { backgroundColor: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.2)' },
  pricePanelLabel:     { fontSize: font.sizes.xs, color: colors.t3, fontWeight: font.weights.bold, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  pricePanelValue:     { fontSize: 22, fontWeight: font.weights.extrabold, color: colors.blue },
  pricePanelValueUsed: { color: colors.green },
  pricePanelRange:     { fontSize: font.sizes.xs, color: colors.t3, marginTop: 2 },
  pricePanelNote:      { fontSize: 10, color: colors.yellow, marginTop: 4 },

  // Mileage chart
  mileageChart: { flexDirection: 'row', gap: spacing.sm, height: 80, alignItems: 'flex-end', paddingTop: spacing.sm },
  mileageCol:   { flex: 1, alignItems: 'center', gap: 3 },
  mileageBarBg: { flex: 1, width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden' },
  mileageBarFill: { width: '100%', borderRadius: 3 },
  mileageYear:  { fontSize: 9, color: colors.t4 },
  mileageMi:    { fontSize: 9, color: colors.t3, fontWeight: font.weights.semibold },

  // Common failures
  failureRow:  { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingVertical: 3 },
  failureDot:  { fontSize: 12, color: colors.yellow, marginTop: 1 },
  failureText: { flex: 1, fontSize: font.sizes.sm, color: colors.t2, lineHeight: 18 },

  // Meta
  meta:      { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, backgroundColor: 'rgba(0,0,0,0.2)', borderTopWidth: 1, borderTopColor: colors.border },
  badgeB:    { backgroundColor: colors.blueDim, borderWidth: 1, borderColor: 'rgba(79,163,255,0.28)', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeBTxt: { color: colors.blue, fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 0.7 },
  badgeY:    { backgroundColor: 'rgba(252,211,77,0.12)', borderWidth: 1, borderColor: 'rgba(252,211,77,0.22)', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeYTxt: { color: colors.yellow, fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 0.7 },

  // Listings
  listings:     { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, gap: spacing.sm },
  listingsHd:   { fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1, textTransform: 'uppercase', color: colors.t3, marginBottom: spacing.xs },
  listingBtn:   { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.05)' },
  listingFlag:  { fontSize: 20 },
  listingBody:  { flex: 1 },
  listingCta:   { fontSize: font.sizes.md, fontWeight: font.weights.semibold, color: colors.t1 },
  listingSite:  { fontSize: font.sizes.xs, color: colors.t3, marginTop: 2 },
  priceBox:     { alignItems: 'flex-end' },
  priceVal:     { fontSize: font.sizes.md, fontWeight: font.weights.extrabold, color: colors.blue },
  priceLbl:     { fontSize: 10, color: colors.t4 },
  arrow:        { color: colors.t3, fontSize: font.sizes.lg },
  skeletonRow:  { height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.06)' },
  listingsNone: { fontSize: font.sizes.sm, color: colors.t3, textAlign: 'center', paddingVertical: spacing.sm },
});
