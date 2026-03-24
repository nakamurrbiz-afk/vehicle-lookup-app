import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LookupScreen } from './src/screens/LookupScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { useHistory } from './src/hooks/useHistory';
import { colors } from './src/theme';

export default function App() {
  const [showHistory, setShowHistory] = React.useState(false);
  const { entries, addEntry, removeEntry, clearAll } = useHistory();

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        {showHistory ? (
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
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
