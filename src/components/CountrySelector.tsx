import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList,
  TextInput, StyleSheet, SafeAreaView,
} from 'react-native';
import { colors, spacing, radius, font } from '../theme';

export interface Country { code: string; label: string; flag: string; plateFormat: string; available: boolean; }

export const COUNTRIES: Country[] = [
  { code: 'GB', label: 'United Kingdom', flag: '🇬🇧', plateFormat: 'AA·00·AAA',    available: true  },
  { code: 'US', label: 'United States',  flag: '🇺🇸', plateFormat: 'ABC·1234',     available: true  },
  { code: 'FR', label: 'France',         flag: '🇫🇷', plateFormat: 'AB·123·CD',    available: false },
  { code: 'NL', label: 'Netherlands',    flag: '🇳🇱', plateFormat: 'AB·00·CD',     available: false },
  { code: 'JP', label: 'Japan',          flag: '🇯🇵', plateFormat: '地名 あ 0000', available: false },
];

interface Props { selected: string; onChange: (code: string) => void; }

export function CountrySelector({ selected, onChange }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');

  const current = COUNTRIES.find(c => c.code === selected) ?? COUNTRIES[0];
  const filtered = COUNTRIES.filter(c =>
    c.label.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()),
  );

  function handleSelect(code: string) {
    onChange(code);
    setModalVisible(false);
    setSearch('');
  }

  return (
    <>
      {/* Compact pill */}
      <TouchableOpacity
        style={styles.pill}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.75}
      >
        <Text style={styles.pillFlag}>{current.flag}</Text>
        <View style={styles.pillTexts}>
          <Text style={styles.pillLabel}>{current.label}</Text>
          <Text style={styles.pillFmt}>{current.plateFormat}</Text>
        </View>
        <View style={styles.changeBtn}>
          <Text style={styles.changeBtnTxt}>Change</Text>
        </View>
      </TouchableOpacity>

      {/* Country picker modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setModalVisible(false); setSearch(''); }}
      >
        <View style={styles.overlay}>
          <SafeAreaView style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Country</Text>
              <TouchableOpacity
                onPress={() => { setModalVisible(false); setSearch(''); }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.doneBtn}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search country..."
                placeholderTextColor={colors.t4}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>

            {/* Country list */}
            <FlatList
              data={filtered}
              keyExtractor={c => c.code}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = item.code === selected;
                return (
                  <TouchableOpacity
                    style={[styles.item, active && styles.itemActive]}
                    onPress={() => handleSelect(item.code)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.itemFlag, !item.available && styles.itemFlagDim]}>{item.flag}</Text>
                    <View style={styles.itemTexts}>
                      <Text style={[styles.itemLabel, active && styles.itemLabelActive, !item.available && styles.itemLabelDim]}>
                        {item.label}
                      </Text>
                      <Text style={styles.itemFmt}>{item.plateFormat}</Text>
                    </View>
                    {!item.available && (
                      <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonTxt}>Coming Soon</Text>
                      </View>
                    )}
                    {active && item.available && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyTxt}>No countries found</Text>
              }
            />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Compact pill
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.borderBlue,
    backgroundColor: colors.surfaceAct,
    overflow: 'hidden',
  },
  pillFlag:  { fontSize: 26 },
  pillTexts: { flex: 1 },
  pillLabel: { fontSize: font.sizes.md, fontWeight: font.weights.semibold, color: colors.blue },
  pillFmt:   { fontSize: font.sizes.xs, color: colors.t4, fontFamily: 'monospace', marginTop: 2 },
  changeBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.borderBlue,
    backgroundColor: colors.blueDim,
  },
  changeBtnTxt: { fontSize: font.sizes.xs, fontWeight: font.weights.semibold, color: colors.blue },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#080C1C', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    maxHeight: '80%',
  },
  handle: {
    width: 32, height: 3, borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'center', marginTop: spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sheetTitle: { fontSize: font.sizes.lg, fontWeight: font.weights.bold, color: colors.t1 },
  doneBtn:   { fontSize: font.sizes.md, fontWeight: font.weights.semibold, color: colors.blue },

  // Search
  searchRow:   { padding: spacing.md, paddingBottom: spacing.sm },
  searchInput: {
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.07)',
    fontSize: font.sizes.md, color: colors.t1,
  },

  // List
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: 'transparent', marginBottom: spacing.xs,
  },
  itemActive:      { borderColor: colors.borderBlue, backgroundColor: colors.surfaceAct },
  itemFlag:        { fontSize: 26 },
  itemTexts:       { flex: 1 },
  itemLabel:       { fontSize: font.sizes.md, fontWeight: font.weights.semibold, color: colors.t2 },
  itemLabelActive: { color: colors.blue },
  itemFmt:         { fontSize: font.sizes.xs, color: colors.t4, fontFamily: 'monospace', marginTop: 2 },
  checkmark:       { fontSize: font.sizes.md, color: colors.blue, fontWeight: font.weights.bold },
  emptyTxt:        { textAlign: 'center', color: colors.t3, padding: spacing.xl },
  itemFlagDim:     { opacity: 0.45 },
  itemLabelDim:    { color: colors.t4 },
  comingSoonBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, backgroundColor: 'rgba(255,165,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,165,0,0.35)' },
  comingSoonTxt:   { fontSize: 10, fontWeight: font.weights.semibold, color: '#FFA500', letterSpacing: 0.4 },
});
