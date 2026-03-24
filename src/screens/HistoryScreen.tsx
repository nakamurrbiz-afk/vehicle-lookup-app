import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, font } from '../theme';
import { HistoryEntry } from '../hooks/useHistory';
import { fetchVehicleMedia } from '../api/vehicle';

interface Props {
  entries: HistoryEntry[];
  onBack: () => void;
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function HistoryRow({ entry, onRemove }: { entry: HistoryEntry; onRemove: (id: string) => void }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!entry.make) return;
    fetchVehicleMedia(entry.make, entry.model, entry.year, entry.country)
      .then(media => setImageUrl(media?.images?.[0]?.url ?? null))
      .catch(() => {});
  }, []);

  const label   = [entry.make, entry.model].filter(Boolean).join(' ') || 'Unknown Vehicle';
  const details = [entry.year, entry.colour, entry.fuelType].filter(Boolean).join(' · ');

  return (
    <View style={styles.row}>
      {/* Wide landscape thumbnail */}
      <View style={styles.thumb}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumbImg} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Text style={styles.thumbInitial}>{entry.make?.[0] ?? '?'}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.vehicleName} numberOfLines={1}>{label}</Text>
        {details ? (
          <Text style={styles.vehicleDetail} numberOfLines={1}>{details}</Text>
        ) : null}
        <Text style={styles.time}>{timeAgo(entry.searchedAt)}</Text>
      </View>

      {/* Delete */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onRemove(entry.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        activeOpacity={0.6}
      >
        <Text style={styles.deleteTxt}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export function HistoryScreen({ entries, onBack, onRemove, onClearAll }: Props) {
  const renderItem = useCallback(
    ({ item }: { item: HistoryEntry }) => (
      <HistoryRow entry={item} onRemove={onRemove} />
    ),
    [onRemove],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Text style={styles.backTxt}>‹ Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>My Searches</Text>

        {entries.length > 0 ? (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={onClearAll}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.clearTxt}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <FlatList
        data={entries}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          entries.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyTitle}>No searches yet</Text>
            <Text style={styles.emptySub}>
              Your vehicle lookups will appear here.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const THUMB_W = 140;
const THUMB_H = 86;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn:      { width: 64 },
  backTxt:      { fontSize: font.sizes.md, color: colors.blue, fontWeight: font.weights.semibold },
  headerTitle:  { flex: 1, textAlign: 'center', fontSize: font.sizes.lg, fontWeight: font.weights.bold, color: colors.t1 },
  clearBtn:     { width: 64, alignItems: 'flex-end' },
  clearTxt:     { fontSize: font.sizes.sm, color: colors.blue },
  headerSpacer: { width: 64 },

  listContent:    { paddingTop: spacing.xs, paddingBottom: spacing.xxl },
  emptyContainer: { flexGrow: 1 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + THUMB_W + spacing.md,
  },

  thumb: {
    width: THUMB_W,
    height: THUMB_H,
    borderRadius: radius.md,
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  thumbImg:         { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbInitial:     { fontSize: 28, fontWeight: font.weights.bold, color: colors.t4 },

  info:          { flex: 1, gap: 3 },
  vehicleName:   { fontSize: font.sizes.md, fontWeight: font.weights.semibold, color: colors.t1 },
  vehicleDetail: { fontSize: font.sizes.xs, color: colors.t3, lineHeight: 16 },
  time:          { fontSize: font.sizes.xs, color: colors.t4, marginTop: 2 },

  deleteBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  deleteTxt: { fontSize: 10, color: colors.t3 },

  empty: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyIcon:  { fontSize: 56, marginBottom: spacing.sm },
  emptyTitle: { fontSize: font.sizes.xl, fontWeight: font.weights.bold, color: colors.t1 },
  emptySub:   { fontSize: font.sizes.md, color: colors.t4, textAlign: 'center', lineHeight: 22 },
});
