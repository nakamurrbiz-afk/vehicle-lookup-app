import React from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';
import { colors, spacing, radius, font } from '../theme';

interface Props { value: string; onChange: (v: string) => void; country: string; }

const PLACEHOLDER: Record<string, string> = {
  GB: 'AB12 CDE', US: '7ABC123', NL: 'AB-123-C', JP: '品川301あ1234',
};
const STRIP_COLOR: Record<string, string> = {
  GB: '#012169', US: '#B22234', NL: '#AE1C28', JP: '#1a1a1a',
};

export function PlateInput({ value, onChange, country }: Props) {
  const isJP = country === 'JP';
  return (
    <View style={styles.wrapper}>
      <View style={styles.plate}>
        <View style={[styles.strip, { backgroundColor: STRIP_COLOR[country] ?? colors.primary }]}>
          <Text style={styles.stripText}>{country}</Text>
        </View>
        <TextInput
          style={[styles.input, isJP && styles.inputJP]}
          value={value}
          onChangeText={(t) => onChange(t.toUpperCase())}
          placeholder={PLACEHOLDER[country] ?? 'PLATE'}
          placeholderTextColor="rgba(17,24,39,0.28)"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          returnKeyType="search"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  plate: {
    flexDirection: 'row', width: '100%', maxWidth: 320, height: 68,
    borderRadius: radius.md, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    overflow: 'hidden', backgroundColor: colors.plateBg,
  },
  strip: {
    width: 42, alignItems: 'center', justifyContent: 'center',
  },
  stripText: {
    color: '#fff', fontSize: font.sizes.xs,
    fontWeight: font.weights.bold, letterSpacing: 0.8,
  },
  input: {
    flex: 1, textAlign: 'center',
    fontSize: font.sizes.xxl, fontWeight: font.weights.bold,
    color: '#111827', letterSpacing: 6, paddingHorizontal: spacing.sm,
  },
  inputJP: { fontSize: font.sizes.lg, letterSpacing: 2 },
});
