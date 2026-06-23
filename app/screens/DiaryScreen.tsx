import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { AddDiaryModal } from '../components/AddDiaryModal';
import { colors, fonts, radius, shadow } from '../lib/theme';
import type { DiaryEntry } from '../types';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub'];
  return `${days[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

export function DiaryScreen() {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | undefined>(undefined);

  const fetchEntries = async () => {
    const { data } = await supabase.from('diary_entries').select('*').order('date', { ascending: false });
    setEntries(data ?? []);
  };

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await fetchEntries();
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const handleDelete = (entry: DiaryEntry) => {
    Alert.alert(
      'Obriši bilješku',
      'Ova radnja je nepovratna.',
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('diary_entries').delete().eq('id', entry.id);
            load();
          },
        },
      ]
    );
  };

  const openAdd = () => { setEditingEntry(undefined); setModalVisible(true); };
  const openEdit = (entry: DiaryEntry) => { setEditingEntry(entry); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setEditingEntry(undefined); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.honey} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={e => e.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.honey} />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>Nema bilješki.</Text>
            <Text style={styles.emptyHint}>Dodajte prvu bilješku pritiskom na +</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openEdit(item)} activeOpacity={0.75}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
              <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.deleteBtn}>Obriši</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardNote}>{item.note}</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={[styles.fab, { bottom: 24 + insets.bottom }]} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddDiaryModal
        visible={modalVisible}
        editItem={editingEntry}
        onClose={closeModal}
        onSuccess={() => { closeModal(); load(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.muted },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },
  list: { padding: 12, paddingBottom: 80, gap: 10 },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontFamily: fonts.bodyBold, color: colors.charcoalLight },
  emptyHint: { fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground },
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: 14,
    ...shadow.card,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardDate: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.honey },
  deleteBtn: { fontSize: 12, fontFamily: fonts.body, color: colors.destructive },
  cardNote: { fontSize: 15, fontFamily: fonts.body, color: colors.charcoal, lineHeight: 22 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.honey,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.charcoal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  fabText: { fontSize: 28, fontFamily: fonts.bodyLight, color: colors.background, lineHeight: 32 },
});
