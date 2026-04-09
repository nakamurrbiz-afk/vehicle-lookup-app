import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PostHogProvider } from 'posthog-react-native';
import { LookupScreen } from './src/screens/LookupScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { useHistory } from './src/hooks/useHistory';
import { colors } from './src/theme';

const POSTHOG_API_KEY = 'phc_nxzG3t6tSirrD2MSEMRvYm3xWCbjSESyrLbTfxR7hPsb'; // PostHog のプロジェクト API キーに置き換える
const POSTHOG_HOST = 'https://us.i.posthog.com'; // EU の場合は https://eu.i.posthog.com

export default function App() {
  const [showHistory, setShowHistory] = React.useState(false);
  const { entries, addEntry, removeEntry, clearAll } = useHistory();

  const screen = showHistory ? (
    <HistoryScreen
      entries={entries}
      onBack={() => setShowHistory(false)}
      onRemove={removeEntry}
      onClearAll={clearAll}
    />
  ) : (
    <LookupScreen
      onOpenHistory={() => setShowHistory(true)}
      onResult={addEntry}
      entries={entries}
    />
  );

  return (
    <PostHogProvider apiKey={POSTHOG_API_KEY} options={{ host: POSTHOG_HOST }}>
      <SafeAreaProvider>
        <View style={styles.root}>
          {Platform.OS === 'web' ? (
            <View style={styles.webCenter}>
              <View style={styles.webFrame}>{screen}</View>
            </View>
          ) : screen}
        </View>
      </SafeAreaProvider>
    </PostHogProvider>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: colors.bg },
  webCenter: {
    flex: 1,
    backgroundColor: '#020509',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  webFrame: {
    width: '100%',
    maxWidth: 480,
    flex: 1,
    backgroundColor: colors.bg,
    // subtle side shadow to separate from background on wide screens
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 60px rgba(0,0,0,0.6)',
    } as any : {}),
  },
});
