import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleResult } from '../api/vehicle';

export interface HistoryEntry {
  id: string;
  plate: string;
  country: string;
  make: string | null;
  model: string | null;
  year: number | null;
  colour: string | null;
  fuelType: string | null;
  searchedAt: string;
}

const STORAGE_KEY = '@platecheck_history';
const MAX_ENTRIES = 50;

export function useHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try { setEntries(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const persist = useCallback((updated: HistoryEntry[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const addEntry = useCallback((result: VehicleResult) => {
    setEntries(prev => {
      const entry: HistoryEntry = {
        id: `${result.country}-${result.plate}-${Date.now()}`,
        plate: result.plate,
        country: result.country,
        make: result.make,
        model: result.model,
        year: result.year,
        colour: result.colour,
        fuelType: result.fuelType,
        searchedAt: new Date().toISOString(),
      };
      const deduped = prev.filter(
        e => !(e.plate === result.plate && e.country === result.country),
      );
      const updated = [entry, ...deduped].slice(0, MAX_ENTRIES);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => {
      const updated = prev.filter(e => e.id !== id);
      persist(updated);
      return updated;
    });
  }, [persist]);

  const clearAll = useCallback(() => {
    setEntries([]);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return { entries, addEntry, removeEntry, clearAll };
}
