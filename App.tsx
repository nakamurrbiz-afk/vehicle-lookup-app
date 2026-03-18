import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LookupScreen } from './src/screens/LookupScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { colors, font, spacing } from './src/theme';

type Tab = 'lookup' | 'history';

export default function App() {
  const [activeTab, setActiveTab] = React.useState<Tab>('lookup');
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <View style={styles.screen}>
          {activeTab === 'lookup' ? <LookupScreen /> : <HistoryScreen />}
        </View>
        <View style={styles.tabBar}>
          <TabButton label="Lookup"  icon="search" active={activeTab === 'lookup'}  onPress={() => setActiveTab('lookup')} />
          <TabButton label="History" icon="list"   active={activeTab === 'history'} onPress={() => setActiveTab('history')} />
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const ICONS: Record<string, string> = { search: '🔍', list: '📋' };

function TabButton({ label, icon, active, onPress }: { label: string; icon: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tab} onPress={onPress} activeOpacity={0.7}>
      {active && <View style={styles.indicator} />}
      <Text style={styles.tabIcon}>{ICONS[icon]}</Text>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(7,12,26,0.95)',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingBottom: 20,
  },
  tab:            { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, position: 'relative' },
  indicator:      { position: 'absolute', top: 0, width: 32, height: 3, borderRadius: 2, backgroundColor: colors.blue },
  tabIcon:        { fontSize: 20 },
  tabLabel:       { fontSize: font.sizes.xs, color: colors.t4, fontWeight: font.weights.medium, marginTop: 2 },
  tabLabelActive: { color: colors.blue, fontWeight: font.weights.bold },
});
