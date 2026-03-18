import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, font } from '../theme';

interface Country { code: string; label: string; flag: string; plateFormat: string; }

const COUNTRIES: Country[] = [
  { code: 'GB', label: 'United Kingdom', flag: '🇬🇧', plateFormat: 'AB12 CDE' },
  { code: 'US', label: 'United States',  flag: '🇺🇸', plateFormat: '7ABC123'  },
  { code: 'JP', label: 'Japan',          flag: '🇯🇵', plateFormat: '品川301あ' },
];

interface Props { selected: string; onChange: (code: string) => void; }

export function CountrySelector({ selected, onChange }: Props) {
  return (
    <View style={styles.container}>
      {COUNTRIES.map((c) => {
        const active = selected === c.code;
        return (
          <TouchableOpacity
            key={c.code}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onChange(c.code)}
            activeOpacity={0.75}
          >
            <Text style={styles.flag}>{c.flag}</Text>
            <View style={styles.texts}>
              <Text style={[styles.label, active && styles.labelActive]}>{c.label}</Text>
              <Text style={styles.fmt}>{c.plateFormat}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionActive: {
    borderColor: colors.borderBlue,
    backgroundColor: colors.surfaceAct,
  },
  flag:  { fontSize: 26 },
  texts: { flex: 1 },
  label: { fontSize: font.sizes.md, fontWeight: font.weights.semibold, color: colors.t2 },
  labelActive: { color: colors.blue },
  fmt:   { fontSize: font.sizes.xs, color: colors.t4, fontFamily: 'monospace', marginTop: 2 },
});
