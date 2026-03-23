import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ApiError } from '../api/vehicle';
import { colors, spacing, radius, font } from '../theme';

interface Props {
  error: ApiError;
  onRetry: () => void;
}

export function ErrorCard({ error, onRetry }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <Text style={styles.title}>{error.title}</Text>
      <Text style={styles.detail}>{error.detail}</Text>
      <TouchableOpacity style={styles.button} onPress={onRetry} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(224,96,96,0.06)',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(224,96,96,0.18)',
    gap: spacing.sm,
  },
  accent: {
    width: 32, height: 2, borderRadius: 1,
    backgroundColor: colors.red, marginBottom: spacing.xs,
  },
  title: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.bold,
    color: colors.t1,
    letterSpacing: -0.3,
  },
  detail: {
    fontSize: font.sizes.sm,
    color: colors.t2,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  buttonText: {
    color: '#fff',
    fontWeight: font.weights.bold,
    fontSize: font.sizes.md,
  },
});
