import { useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius } from '../lib/theme';
import { HiveCard } from '../components/HiveCard';
import { AddHiveModal } from '../components/AddHiveModal';
import type { HiveWithStatus, HiveStatus, SortOption, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'HiveList'>;

const STALE_DAYS = 14;

function computeStatus(lastDate: string | null, hasActiveDisease: boolean): HiveStatus {
  if (hasActiveDisease) return 'red';
  if (!lastDate) return 'yellow';
  const staleThreshold = new Date();
  staleThreshold.setDate(staleThreshold.getDate() - STALE_DAYS);
  return new Date(lastDate + 'T00:00:00') < staleThreshold ? 'yellow' : 'green';
}

export function HiveListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [hives, setHives] = useState<HiveWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterSick, setFilterSick] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('number');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchHives = async () => {
    const [hivesRes, inspectionsRes, diseasesRes] = await Promise.all([
      supabase.from('hives').select('*').order('number'),
      supabase.from('inspections').select('hive_id, date').order('date', { ascending: false }),
      supabase.from('diseases').select('hive_id, name').is('resolved_date', null),
    ]);

    if (hivesRes.error) return;

    const lastInspectionMap: Record<string, string> = {};
    inspectionsRes.data?.forEach(i => {
      if (!lastInspectionMap[i.hive_id]) lastInspectionMap[i.hive_id] = i.date;
    });

    const diseaseMap: Record<string, string[]> = {};
    diseasesRes.data?.forEach(d => {
      if (!diseaseMap[d.hive_id]) diseaseMap[d.hive_id] = [];
      diseaseMap[d.hive_id].push(d.name);
    });

    const result: HiveWithStatus[] = (hivesRes.data ?? []).map(hive => {
      const lastDate = lastInspectionMap[hive.id] ?? null;
      const diseaseNames = diseaseMap[hive.id] ?? [];
      return {
        ...hive,
        lastInspectionDate: lastDate,
        hasActiveDisease: diseaseNames.length > 0,
        activeDiseaseNames: diseaseNames,
        status: computeStatus(lastDate, diseaseNames.length > 0),
      };
    });

    setHives(result);
  };

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await fetchHives();
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const displayed = useMemo(() => {
    let list = filterSick ? hives.filter(h => h.hasActiveDisease) : hives;
    if (sortBy === 'date') {
      list = [...list].sort((a, b) => {
        if (!a.lastInspectionDate) return 1;
        if (!b.lastInspectionDate) return -1;
        return b.lastInspectionDate.localeCompare(a.lastInspectionDate);
      });
    }
    return list;
  }, [hives, filterSick, sortBy]);

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.honey} /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.chip, !filterSick && styles.chipActive]}
            onPress={() => setFilterSick(false)}
          >
            <Text style={[styles.chipText, !filterSick && styles.chipTextActive]}>Sve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, filterSick && styles.chipActiveSick]}
            onPress={() => setFilterSick(true)}
          >
            <Text style={[styles.chipText, filterSick && styles.chipTextActive]}>Samo bolesne</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sortiraj:</Text>
          <TouchableOpacity
            style={[styles.chip, sortBy === 'number' && styles.chipActive]}
            onPress={() => setSortBy('number')}
          >
            <Text style={[styles.chipText, sortBy === 'number' && styles.chipTextActive]}>Broj</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, sortBy === 'date' && styles.chipActive]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[styles.chipText, sortBy === 'date' && styles.chipTextActive]}>Pregled</Text>
          </TouchableOpacity>
        </View>
      </View>

      {displayed.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            {filterSick ? 'Nema bolesnih košnica.' : 'Nema košnica. Dodajte prvu.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={h => h.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <HiveCard
              hive={item}
              onPress={() => navigation.navigate('HiveDetail', { hiveId: item.id, hiveNumber: item.number })}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.honey} />}
        />
      )}

      <TouchableOpacity style={[styles.fab, { bottom: 24 + insets.bottom }]} onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddHiveModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => { setShowAddModal(false); load(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, fontFamily: fonts.body, color: colors.mutedForeground },

  toolbar: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  filterRow: { flexDirection: 'row', gap: 8 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortLabel: { fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cream,
  },
  chipActive: { backgroundColor: colors.honey, borderColor: colors.honey },
  chipActiveSick: { backgroundColor: colors.destructive, borderColor: colors.destructive },
  chipText: { fontSize: 13, fontFamily: fonts.body, color: colors.charcoalLight },
  chipTextActive: { color: colors.background, fontFamily: fonts.bodyBold },

  list: { padding: 6, paddingBottom: 80 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.honey,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: { fontSize: 28, color: colors.background, lineHeight: 32, fontFamily: fonts.bodyLight },
});
