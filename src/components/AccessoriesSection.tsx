import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Linking, Platform,
} from 'react-native';
import { colors, spacing, radius, font } from '../theme';
import { VehicleResult } from '../api/vehicle';
import {
  buildAmazonUrl, buildEbayUrl, buildRakutenUrl,
  getAvailablePlatforms, Platform as AffiliatePlatform,
} from '../config/affiliates';
import {
  ACCESSORY_CATEGORIES, buildSearchQuery, AccessoryCategory,
} from '../data/accessoryCategories';

// ── Platform config ────────────────────────────────────────────────────────

const PLATFORM_META: Record<AffiliatePlatform, {
  label: string; color: string; bg: string; border: string; flag: string;
}> = {
  amazon: {
    label: 'Amazon',
    flag: '🛒',
    color: '#FF9900',
    bg: 'rgba(255,153,0,0.10)',
    border: 'rgba(255,153,0,0.30)',
  },
  ebay: {
    label: 'eBay',
    flag: '🏷️',
    color: '#86B817',
    bg: 'rgba(134,184,23,0.08)',
    border: 'rgba(134,184,23,0.28)',
  },
  rakuten: {
    label: '楽天市場',
    flag: '🔴',
    color: '#BF0000',
    bg: 'rgba(191,0,0,0.08)',
    border: 'rgba(191,0,0,0.28)',
  },
};

// ── Component ──────────────────────────────────────────────────────────────

interface Props { data: VehicleResult; }

export function AccessoriesSection({ data }: Props) {
  const [activeCat, setActiveCat] = useState<AccessoryCategory>(ACCESSORY_CATEGORIES[0]);

  const platforms  = getAvailablePlatforms(data.country);
  const vehicle    = { make: data.make, model: data.model, year: data.year };
  const queries    = buildSearchQuery(activeCat, vehicle, data.country);
  const isJP       = data.country === 'JP';
  const queryLabel = isJP ? queries.ja : queries.en;

  function openUrl(url: string) {
    if (Platform.OS === 'web') {
      (window as any).open(url, '_blank', 'noopener,noreferrer');
    } else {
      Linking.openURL(url);
    }
  }

  function getUrl(platform: AffiliatePlatform): string {
    if (platform === 'amazon')  return buildAmazonUrl(isJP ? queries.ja : queries.en, data.country);
    if (platform === 'ebay')    return buildEbayUrl(queries.en, data.country);
    if (platform === 'rakuten') return buildRakutenUrl(queries.ja);
    return '';
  }

  return (
    <View style={styles.section}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.accent} />
        <Text style={styles.title}>Accessories & Parts</Text>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipContent}
      >
        {ACCESSORY_CATEGORIES.map(cat => {
          const active = cat.id === activeCat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setActiveCat(cat)}
              activeOpacity={0.75}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {isJP ? cat.labelJa : cat.labelEn}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Search query preview */}
      <View style={styles.queryRow}>
        <Text style={styles.queryIcon}>🔍</Text>
        <Text style={styles.queryTxt} numberOfLines={1}>{queryLabel}</Text>
      </View>

      {/* Platform buttons */}
      <View style={styles.platformRow}>
        {platforms.map(platform => {
          const meta = PLATFORM_META[platform];
          return (
            <TouchableOpacity
              key={platform}
              style={[styles.platformBtn, { backgroundColor: meta.bg, borderColor: meta.border }]}
              onPress={() => openUrl(getUrl(platform))}
              activeOpacity={0.78}
            >
              <Text style={styles.platformFlag}>{meta.flag}</Text>
              <View style={styles.platformBody}>
                <Text style={[styles.platformName, { color: meta.color }]}>{meta.label}</Text>
                <Text style={styles.platformCta}>
                  {isJP ? `${activeCat.labelJa}を探す →` : `Shop ${activeCat.labelEn} →`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.disclaimer}>
        Links may earn a commission. Prices shown are indicative.
      </Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  accent: { width: 2, height: 11, borderRadius: 1, backgroundColor: colors.blue },
  title:  {
    fontSize: font.sizes.xs, fontWeight: font.weights.bold,
    letterSpacing: 1.2, textTransform: 'uppercase', color: colors.t3,
  },

  // Chips
  chipScroll:  { marginHorizontal: -spacing.md },
  chipContent: { paddingHorizontal: spacing.md, gap: spacing.sm, flexDirection: 'row' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.sm, paddingVertical: 7,
    borderRadius: radius.full, borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  chipActive:      { backgroundColor: colors.blueDim, borderColor: colors.borderBlue },
  chipEmoji:       { fontSize: 13 },
  chipLabel:       { fontSize: font.sizes.xs, fontWeight: font.weights.semibold, color: colors.t3 },
  chipLabelActive: { color: colors.blue },

  // Query preview
  queryRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6,
  },
  queryIcon: { fontSize: 12 },
  queryTxt:  { flex: 1, fontSize: font.sizes.xs, color: colors.t3, fontStyle: 'italic' },

  // Platforms
  platformRow: { gap: spacing.sm },
  platformBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md, borderWidth: 1,
  },
  platformFlag: { fontSize: 22 },
  platformBody: { flex: 1 },
  platformName: { fontSize: font.sizes.md, fontWeight: font.weights.bold },
  platformCta:  { fontSize: font.sizes.xs, color: colors.t3, marginTop: 2 },

  disclaimer: {
    fontSize: 10, color: colors.t4, textAlign: 'center',
  },
});
