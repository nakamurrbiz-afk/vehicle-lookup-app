import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ApiError } from '../api/vehicle';
import { colors, spacing, radius, font } from '../theme';

interface Props {
  error: ApiError;
  onRetry: () => void;
}

const ERROR_ICONS: Record<number, string> = {
  0: '📡',
  400: '⚠️',
  404: '🔍',
  429: '⏱️',
  502: '🔌',
};

export function ErrorCard({ error, onRetry }: Props) {
  const icon = ERROR_ICONS[error.status] ?? '❌';

  return (
    <View style={styles.card}>
      <Text style={styles.icon}>{icon}</Text>
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
    backgroundColor: 'rgba(248,113,113,0.07)',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.2)',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.bold,
    color: colors.red,
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
