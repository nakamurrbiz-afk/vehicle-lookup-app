import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity, Linking, ActivityIndicator,
  Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  VehicleResult, ListingLink, MileageRecord, PriceSummary,
  fetchVehicleMedia, CarImage, buildTrackUrl,
} from '../api/vehicle';
import { colors, spacing, radius, font } from '../theme';

interface Props { data: VehicleResult; postcode?: string; }

// ── Color name → approximate hex ───────────────────────────────────────────
const COLOUR_MAP: Record<string, string> = {
  'WHITE':        '#F0F0F0',
  'BLACK':        '#1A1A1A',
  'SILVER':       '#C0C0C0',
  'GREY':         '#808080',
  'GRAY':         '#808080',
  'BLUE':         '#1565C0',
  'DARK BLUE':    '#0D2B6E',
  'LIGHT BLUE':   '#64B5F6',
  'NAVY':         '#0D2B6E',
  'RED':          '#C62828',
  'DARK RED':     '#7B1818',
  'GREEN':        '#2E7D32',
  'DARK GREEN':   '#1B5E20',
  'YELLOW':       '#F9A825',
  'ORANGE':       '#E65100',
  'BROWN':        '#5D4037',
  'BEIGE':        '#D7CCC8',
  'CREAM':        '#FFF8E1',
  'GOLD':         '#FFC107',
  'BRONZE':       '#CD7F32',
  'PURPLE':       '#6A1B9A',
  'MAROON':       '#880E4F',
  'PINK':         '#F48FB1',
  'TURQUOISE':    '#00897B',
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function StarRating({ stars }: { stars: number }) {
  return (
    <Text style={styles.stars}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
    </Text>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionAccent} />
      <Text style={styles.sectionLabel}>{label}</Text>
    </View>
  );
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

const LIGHT_COLOURS = new Set(['#F0F0F0', '#FFF8E1', '#D7CCC8', '#F48FB1', '#C0C0C0']);

function ColourRow({ colour }: { colour: string }) {
  const hex = COLOUR_MAP[colour.toUpperCase()] ?? '#888888';
  const isLight = LIGHT_COLOURS.has(hex);
  return (
    <View style={styles.colourRow}>
      <View style={styles.specRow}>
        <Text style={styles.specRowLabel}>Registered Colour</Text>
        <View style={styles.specRowRight}>
          <View style={styles.colourValueRow}>
            <View style={[
              styles.colourSwatch,
              { backgroundColor: hex },
              isLight ? styles.colourSwatchLight : null,
            ]} />
            <Text style={styles.specRowValue}>{colour}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.colourNote}>ⓘ May differ if repainted or wrapped</Text>
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
              <View style={[
                styles.mileageBarFill,
                { height: `${Math.round(pct * 100)}%` as any,
                  backgroundColor: r.passed ? colors.green : colors.red },
              ]} />
            </View>
            <Text style={styles.mileageYear}>{r.date.slice(0, 4)}</Text>
            <Text style={styles.mileageMi}>{(r.mileage / 1000).toFixed(0)}k</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export function VehicleCard({ data, postcode }: Props) {
  const [images,    setImages]    = useState<CarImage[]>([]);
  const [listings,  setListings]  = useState<ListingLink[] | null>(null);
  const [prices,    setPrices]    = useState<PriceSummary | null>(null);
  const [imgIndex,  setImgIndex]  = useState(0);
  const [heroWidth, setHeroWidth] = useState(0);

  useEffect(() => {
    if (!data.make) return;
    fetchVehicleMedia(data.make, data.model, data.year, data.country, postcode)
      .then((r) => {
        if (r) { setImages(r.images ?? []); setListings(r.listings); setPrices(r.prices); }
        else   { setListings([]); }
      });
  }, [data, postcode]);

  const lastMileage = data.mileageHistory.length > 0
    ? data.mileageHistory[data.mileageHistory.length - 1].mileage
    : null;

  const hasImages = images.length > 0;

  return (
    <View style={styles.card}>

      {/* ── Hero image carousel ── */}
      <View
        style={styles.hero}
        onLayout={e => setHeroWidth(e.nativeEvent.layout.width)}
      >
        {/* Images */}
        {hasImages && heroWidth > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            snapToInterval={heroWidth}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            style={{ width: heroWidth, height: 240 }}
            scrollEventThrottle={16}
            onScroll={e => {
              const x = e.nativeEvent.contentOffset.x;
              setImgIndex(Math.round(x / heroWidth));
            }}
          >
            {images.map((img, i) => (
              <View key={i} style={{ width: heroWidth, height: 240, backgroundColor: i === 0 ? '#080C1E' : undefined }}>
                <Image
                  source={{ uri: img.url }}
                  style={{ width: heroWidth, height: 240 }}
                  resizeMode={i === 0 ? 'contain' : 'cover'}
                />
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.heroPh}>
            {hasImages && <ActivityIndicator color={colors.blue} />}
          </View>
        )}

        {/* Gradient overlay */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <LinearGradient
            colors={['transparent', 'transparent', 'rgba(7,12,26,0.55)', 'rgba(7,12,26,0.96)']}
            locations={[0, 0.45, 0.75, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Title */}
        <View style={styles.heroTitle} pointerEvents="none">
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

        {/* Dot indicators */}
        {images.length > 1 && (
          <View style={styles.dots} pointerEvents="none">
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === imgIndex && styles.dotActive]} />
            ))}
          </View>
        )}

        {/* Popularity badge */}
        {data.popularityCount > 1 && (
          <View style={styles.popularityBadge}>
            <Text style={styles.popularityTxt}>{data.popularityCount} lookups</Text>
          </View>
        )}

        {(() => {
          const hasWiki    = images.some(img => img.source === 'wikipedia');
          const hasUnsplash = images.some(img => img.source === 'unsplash');
          const credit = hasWiki && hasUnsplash ? 'Wikipedia · Unsplash'
                       : hasWiki                ? 'Wikipedia / CC BY-SA'
                       : hasUnsplash            ? 'Unsplash'
                       : null;
          return credit
            ? <Text style={styles.credit} pointerEvents="none">{credit}</Text>
            : null;
        })()}
      </View>

      {/* ── Quick specs ── */}
      <View style={styles.section}>
        <SectionLabel label="Vehicle Details" />
        {data.colour    && <ColourRow colour={data.colour} />}
        {data.fuelType  && <SpecRow label="Fuel"        value={data.fuelType} />}
        {data.engineSize != null && (
          <SpecRow label="Engine" value={`${data.engineSize} cc`} />
        )}
        {data.co2Emissions != null && (
          <SpecRow label="CO₂" value={`${data.co2Emissions} g/km`} />
        )}
        {data.country === 'GB' && lastMileage != null && (
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
          <SectionLabel label={data.country === 'GB' ? 'Estimated Annual Running Costs (UK, ~10k mi)' : 'Estimated Annual Running Costs'} />
          <SpecRow label="Fuel per year"  value={data.runningCost.fuelPerYear} />
          <SpecRow label="Total per year" value={data.runningCost.totalPerYear} />
          <SpecRow label="Per mile"       value={data.runningCost.perMile} />
          <Text style={styles.sourceNote}>Source: {data.runningCost.source}</Text>
        </View>
      )}

      {/* ── Mileage history (GB only) ── */}
      {data.country === 'GB' && data.mileageHistory.length > 1 && (
        <View style={styles.section}>
          <SectionLabel label="MOT Mileage History" />
          <MileageBar records={data.mileageHistory} />
          <Text style={styles.sourceNote}>Green = pass · Red = fail · Source: DVSA</Text>
        </View>
      )}

      {/* ── Common failures (GB only) ── */}
      {data.country === 'GB' && data.commonFailures.length > 0 && (
        <View style={styles.section}>
          <SectionLabel label="Recurring MOT Failures" />
          {data.commonFailures.map((f, i) => (
            <View key={i} style={styles.failureRow}>
              <View style={styles.failureDot} />
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
                  const dest   = l.affiliateUrl ?? l.url;
                  const target = buildTrackUrl(l.id, dest, data.plate, data.country);
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
                <View style={styles.chevron} />
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

  // Hero / carousel
  hero:   { width: '100%', height: 240, backgroundColor: '#080C1E', overflow: 'hidden' },
  heroPh: { height: 240, alignItems: 'center', justifyContent: 'center' },
  heroTitle:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, paddingBottom: spacing.md },
  heroMake:   { fontSize: font.sizes.xs, fontWeight: font.weights.bold, color: 'rgba(255,255,255,0.50)', letterSpacing: 2.5, marginBottom: 4 },
  heroModel:  { fontSize: font.sizes.xxl, fontWeight: font.weights.extrabold, color: colors.t1, letterSpacing: -0.3, lineHeight: 32 },
  heroYear:   { fontSize: font.sizes.sm, color: 'rgba(255,255,255,0.45)', marginTop: 4 },

  // Dot indicators
  dots: {
    position: 'absolute', bottom: spacing.md, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  dot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  dotActive: {
    backgroundColor: '#fff', width: 18, borderRadius: 3,
  },

  popularityBadge: {
    position: 'absolute', top: spacing.sm, right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.50)', borderRadius: radius.full,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
  popularityTxt: { color: 'rgba(255,255,255,0.55)', fontSize: 11, letterSpacing: 0.3 },
  credit: {
    position: 'absolute', bottom: spacing.sm, right: spacing.md,
    fontSize: 10, color: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },

  // Sections
  section:         { borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.md, gap: 8 },
  sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent:   { width: 2, height: 11, borderRadius: 1, backgroundColor: colors.blue },
  sectionLabel:    { fontSize: font.sizes.xs, fontWeight: font.weights.bold, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.t3 },
  sourceNote:      { fontSize: 11, color: colors.t4, marginTop: 2 },

  // Spec rows
  specRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  specRowLabel:  { fontSize: font.sizes.sm, color: colors.t3 },
  specRowRight:  { alignItems: 'flex-end' },
  specRowValue:  { fontSize: font.sizes.sm, color: colors.t1, fontWeight: font.weights.semibold },
  specRowSub:    { fontSize: 11, color: colors.t4 },

  // Colour swatch
  colourRow:      { gap: 3 },
  colourNote:     { fontSize: 10, color: colors.t4, paddingHorizontal: 2, lineHeight: 14 },
  colourValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colourSwatch: {
    width: 16, height: 16, borderRadius: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  colourSwatchLight: {
    borderColor: 'rgba(0,0,0,0.2)',
  },

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
  mileageYear:  { fontSize: 10, color: colors.t4 },
  mileageMi:    { fontSize: 10, color: colors.t3, fontWeight: font.weights.semibold },

  // Common failures
  failureRow:  { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingVertical: 4 },
  failureDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.t3, marginTop: 6 },
  failureText: { flex: 1, fontSize: font.sizes.sm, color: colors.t2, lineHeight: 20 },

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
  chevron:      { width: 7, height: 7, borderTopWidth: 1.5, borderRightWidth: 1.5, borderColor: colors.blue, transform: [{ rotate: '45deg' }], marginRight: 2 },
  skeletonRow:  { height: 52, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.06)' },
  listingsNone: { fontSize: font.sizes.sm, color: colors.t3, textAlign: 'center', paddingVertical: spacing.sm },
});
