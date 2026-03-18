import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, font } from '../theme';

export function HistoryScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.icon}>📋</Text>
        <Text style={styles.title}>Search History</Text>
        <Text style={styles.sub}>Your recent lookups will appear here.</Text>
        <Text style={styles.comingSoon}>Coming Soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  icon: { fontSize: 48 },
  title: {
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
    color: colors.text.primary,
  },
  sub: {
    fontSize: font.sizes.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  comingSoon: {
    marginTop: spacing.sm,
    fontSize: font.sizes.sm,
    color: colors.accent,
    fontWeight: font.weights.semibold,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 99,
  },
});
