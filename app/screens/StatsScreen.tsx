import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { exportApiarySummaryPDF } from '../lib/exportPDF';
import type { RootStackParamList, Hive } from '../types';
import { colors, fonts, radius, shadow } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>;

const SEASON = new Date().getFullYear();

type HiveStat = Hive & {
  seasonFrames: number;
  activeDiseasesCount: number;
};

export function StatsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<HiveStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchStats = async () => {
    const [hivesRes, harvestsRes, diseasesRes] = await Promise.all([
      supabase.from('hives').select('*').order('number'),
      supabase.from('harvests').select('hive_id, frames_count, date'),
      supabase.from('diseases').select('hive_id').is('resolved_date', null),
    ]);

    if (hivesRes.error) return;

    const hives: Hive[] = hivesRes.data ?? [];
    const harvests = harvestsRes.data ?? [];
    const activeDiseases = diseasesRes.data ?? [];

    const diseaseCount: Record<string, number> = {};
    activeDiseases.forEach(d => {
      diseaseCount[d.hive_id] = (diseaseCount[d.hive_id] ?? 0) + 1;
    });

    const result: HiveStat[] = hives.map(hive => ({
      ...hive,
      seasonFrames: harvests
        .filter(h => h.hive_id === hive.id && h.date.startsWith(String(SEASON)))
        .reduce((sum, h) => sum + h.frames_count, 0),
      activeDiseasesCount: diseaseCount[hive.id] ?? 0,
    }));

    setStats(result);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchStats().finally(() => setLoading(false));
    }, [])
  );

  const totalFrames = stats.reduce((s, h) => s + h.seasonFrames, 0);
  const sickCount = stats.filter(h => h.activeDiseasesCount > 0).length;

  const handleExport = async () => {
    setExporting(true);
    try {
      const harvestsRes = await supabase.from('harvests').select('hive_id, frames_count, date');
      const diseaseCountMap: Record<string, number> = {};
      stats.forEach(h => { diseaseCountMap[h.id] = h.activeDiseasesCount; });

      await exportApiarySummaryPDF(
        stats,
        harvestsRes.data ?? [],
        diseaseCountMap,
        SEASON,
      );
    } catch (e: any) {
      Alert.alert('Greška', e.message ?? 'Izvoz nije uspio.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.honey} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary cards */}
      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={styles.cardNum}>{stats.length}</Text>
          <Text style={styles.cardLabel}>Košnica</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNum}>{totalFrames}</Text>
          <Text style={styles.cardLabel}>Ramova {SEASON}</Text>
        </View>
        <View style={[styles.card, sickCount > 0 && styles.cardSick]}>
          <Text style={[styles.cardNum, sickCount > 0 && styles.cardNumSick]}>{sickCount}</Text>
          <Text style={styles.cardLabel}>Sa bolešcu</Text>
        </View>
      </View>

      {/* Per-hive list */}
      <FlatList
        data={stats}
        keyExtractor={h => h.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Prinos po košnici — {SEASON}</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('HiveDetail', { hiveId: item.id, hiveNumber: item.number })}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.hiveNum}>{item.number}</Text>
              {item.activeDiseasesCount > 0 && <View style={styles.sickDot} />}
            </View>
            <Text style={styles.frames}>{item.seasonFrames} ram.</Text>
          </TouchableOpacity>
        )}
      />

      {/* Export button */}
      <View style={[styles.exportBar, { paddingBottom: 16 + insets.bottom }]}>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
          {exporting
            ? <ActivityIndicator color={colors.background} />
            : <Text style={styles.exportBtnText}>Izvezi PDF izvještaj</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.muted },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
  cardRow: { flexDirection: 'row', padding: 12, gap: 8 },
  card: {
    flex: 1, backgroundColor: colors.background, borderRadius: radius.lg, padding: 14,
    alignItems: 'center',
    ...shadow.card,
  },
  cardSick: { backgroundColor: colors.statusRedBg },
  cardNum: { fontSize: 28, fontFamily: fonts.heading, color: colors.honey },
  cardNumSick: { color: colors.destructive },
  cardLabel: { fontSize: 11, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.charcoalLight, marginBottom: 8, paddingHorizontal: 4 },
  list: { padding: 12, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderRadius: radius.lg, padding: 14, marginBottom: 6,
    ...shadow.card,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hiveNum: { fontSize: 18, fontFamily: fonts.bodyBold, color: colors.charcoal, width: 36 },
  sickDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.destructive },
  frames: { fontSize: 15, fontFamily: fonts.bodyBold, color: colors.honey },
  exportBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
  exportBtn: { backgroundColor: colors.honey, borderRadius: radius.lg, padding: 14, alignItems: 'center' },
  exportBtnText: { fontFamily: fonts.bodyBold, color: colors.background, fontSize: 16 },
});
