import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Pressable,
} from 'react-native';

function webConfirm(title: string, msg: string, onOk: () => void, okLabel = 'OK') {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${msg}`)) onOk();
  } else {
    Alert.alert(title, msg, [
      { text: 'Odustani', style: 'cancel' },
      { text: okLabel, onPress: onOk },
    ]);
  }
}
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { exportHivePDF } from '../lib/exportPDF';
import { AddInspectionModal } from '../components/AddInspectionModal';
import { AddTreatmentModal } from '../components/AddTreatmentModal';
import { AddHarvestModal } from '../components/AddHarvestModal';
import { AddWeightModal } from '../components/AddWeightModal';
import { AddFeedingModal } from '../components/AddFeedingModal';
import { ImageViewer } from '../components/ImageViewer';
import { colors, fonts, radius, shadow } from '../lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  RootStackParamList,
  Hive,
  Inspection,
  Treatment,
  Harvest,
  Disease,
  Weight,
  Feeding,
} from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SEASON = new Date().getFullYear();

type Props = NativeStackScreenProps<RootStackParamList, 'HiveDetail'>;
type TabName = 'Pregledi' | 'Tretmani' | 'Prihrana' | 'Vrcanja' | 'Vaga';

const STRENGTH_LABEL: Record<string, string> = { strong: 'Jako', medium: 'Srednje', weak: 'Slabo' };
const STRENGTH_COLOR: Record<string, string> = {
  strong: colors.statusGreen,
  medium: colors.statusYellow,
  weak: colors.statusRed,
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export function HiveDetailScreen({ route, navigation }: Props) {
  const { hiveId, hiveNumber } = route.params;
  const insets = useSafeAreaInsets();

  const [hive, setHive] = useState<Hive | null>(null);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [weights, setWeights] = useState<Weight[]>([]);
  const [feedings, setFeedings] = useState<Feeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabName>('Pregledi');

  const [activeModal, setActiveModal] = useState<'inspection' | 'treatment' | 'harvest' | 'weight' | 'feeding' | null>(null);
  const [editNoteVisible, setEditNoteVisible] = useState(false);
  const [editNoteText, setEditNoteText] = useState('');
  const [viewerUrls, setViewerUrls] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [editingInspection, setEditingInspection] = useState<Inspection | undefined>(undefined);
  const [editingTreatment, setEditingTreatment] = useState<Treatment | undefined>(undefined);
  const [editingHarvest, setEditingHarvest] = useState<Harvest | undefined>(undefined);
  const [editingWeight, setEditingWeight] = useState<Weight | undefined>(undefined);
  const [editingFeeding, setEditingFeeding] = useState<Feeding | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    const [hiveRes, inspRes, treatRes, harvRes, diseaseRes, weightRes, feedRes] = await Promise.all([
      supabase.from('hives').select('*').eq('id', hiveId).single(),
      supabase.from('inspections').select('*').eq('hive_id', hiveId).order('date', { ascending: false }),
      supabase.from('treatments').select('*').eq('hive_id', hiveId).order('date', { ascending: false }),
      supabase.from('harvests').select('*').eq('hive_id', hiveId).order('date', { ascending: false }),
      supabase.from('diseases').select('*').eq('hive_id', hiveId).order('detected_date', { ascending: false }),
      supabase.from('weights').select('*').eq('hive_id', hiveId).order('date', { ascending: false }),
      supabase.from('feedings').select('*').eq('hive_id', hiveId).order('date', { ascending: false }),
    ]);
    if (hiveRes.data) setHive(hiveRes.data);
    setInspections(inspRes.data ?? []);
    setTreatments(treatRes.data ?? []);
    setHarvests(harvRes.data ?? []);
    setDiseases(diseaseRes.data ?? []);
    setWeights(weightRes.data ?? []);
    setFeedings(feedRes.data ?? []);
  };

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    await fetchData();
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, [hiveId]));

  const activeDiseases = diseases.filter(d => !d.resolved_date);
  const seasonFrames = harvests
    .filter(h => h.date.startsWith(String(SEASON)))
    .reduce((sum, h) => sum + h.frames_count, 0);

  const handleExport = async () => {
    if (!hive) return;
    setExporting(true);
    try {
      await exportHivePDF(hive, inspections, treatments, harvests, diseases, weights, SEASON);
    } catch (e: any) {
      Alert.alert('Greška', e.message ?? 'Izvoz nije uspio.');
    } finally {
      setExporting(false);
    }
  };

  const handleToggleScale = () => {
    if (!hive) return;
    if (hive.has_scale) {
      webConfirm('Vaga', `Ukloniti vagu sa košnice br. ${hiveNumber}?`, async () => {
        const { error } = await supabase.from('hives').update({ has_scale: false }).eq('id', hiveId);
        if (error) { Alert.alert('Greška', error.message); return; }
        setHive(prev => prev ? { ...prev, has_scale: false } : prev);
        load(true);
      }, 'Ukloni');
      return;
    }
    webConfirm('Vaga', `Dodjeliti vagu košnici br. ${hiveNumber}?`, async () => {
      const { data: existing } = await supabase.from('hives').select('id, number').eq('has_scale', true).neq('id', hiveId).limit(1);
      const other = existing?.[0];
      if (other) {
        const { error: e1 } = await supabase.from('hives').update({ has_scale: false }).eq('id', other.id);
        if (e1) { Alert.alert('Greška', e1.message); return; }
      }
      const { error: e2 } = await supabase.from('hives').update({ has_scale: true }).eq('id', hiveId);
      if (e2) { Alert.alert('Greška', e2.message); return; }
      setHive(prev => prev ? { ...prev, has_scale: true } : prev);
      load(true);
    }, 'Dodijeli');
  };

  const handleDeleteHive = () => {
    Alert.alert(
      'Obriši košnicu',
      `Košnica br. ${hiveNumber} i svi njeni podaci (pregledi, tretmani, vrcanja, prihrana, kilaža) bit će trajno obrisani.`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Obriši',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('hives').delete().eq('id', hiveId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleSaveNote = async () => {
    const note = editNoteText.trim() || null;
    const { error } = await supabase.from('hives').update({ note }).eq('id', hiveId);
    if (error) { Alert.alert('Greška', error.message); return; }
    setHive(prev => prev ? { ...prev, note } : prev);
    setEditNoteVisible(false);
  };

  const handleDeleteNote = () => {
    webConfirm('Napomena', 'Obrisati napomenu?', async () => {
      const { error } = await supabase.from('hives').update({ note: null }).eq('id', hiveId);
      if (error) { Alert.alert('Greška', error.message); return; }
      setHive(prev => prev ? { ...prev, note: null } : prev);
    }, 'Obriši');
  };

  const handleResolveDisease = (diseaseId: string, diseaseName: string) => {
    Alert.alert(
      'Oznaci kao izlijeceno',
      `Bolest "${diseaseName}" ce biti oznacena kao izlijecena danas.`,
      [
        { text: 'Odustani', style: 'cancel' },
        {
          text: 'Izlijeceno',
          onPress: async () => {
            const today = new Date().toISOString().split('T')[0];
            await supabase.from('diseases').update({ resolved_date: today }).eq('id', diseaseId);
            load();
          },
        },
      ]
    );
  };

  const openAdd = () => {
    if (activeTab === 'Pregledi') { setEditingInspection(undefined); setActiveModal('inspection'); }
    else if (activeTab === 'Tretmani') { setEditingTreatment(undefined); setActiveModal('treatment'); }
    else if (activeTab === 'Prihrana') { setEditingFeeding(undefined); setActiveModal('feeding'); }
    else if (activeTab === 'Vrcanja') { setEditingHarvest(undefined); setActiveModal('harvest'); }
    else if (activeTab === 'Vaga') { setEditingWeight(undefined); setActiveModal('weight'); }
  };

  const closeModal = () => {
    setActiveModal(null);
    setEditingInspection(undefined);
    setEditingTreatment(undefined);
    setEditingHarvest(undefined);
    setEditingWeight(undefined);
    setEditingFeeding(undefined);
  };

  const lastInspection = inspections[0] ?? null;
  const tabs: TabName[] = ['Pregledi', 'Tretmani', 'Prihrana', 'Vrcanja', ...(hive?.has_scale ? ['Vaga' as TabName] : [])];

  const renderPhotoStrip = (urls: string[]) => {
    if (urls.length === 0) return null;
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
        {urls.map((url, i) => (
          <TouchableOpacity key={i} onPress={() => { setViewerUrls(urls); setViewerIndex(i); }}>
            <Image source={{ uri: url }} style={styles.thumb} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderInspection = ({ item }: { item: Inspection }) => (
    <TouchableOpacity style={styles.item} onPress={() => { setEditingInspection(item); setActiveModal('inspection'); }} activeOpacity={0.7}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
        <View style={[styles.strengthBadge, { backgroundColor: STRENGTH_COLOR[item.colony_strength] }]}>
          <Text style={styles.strengthText}>{STRENGTH_LABEL[item.colony_strength]}</Text>
        </View>
      </View>
      {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
      {renderPhotoStrip(item.photo_urls)}
    </TouchableOpacity>
  );

  const renderTreatment = ({ item }: { item: Treatment }) => (
    <TouchableOpacity style={styles.item} onPress={() => { setEditingTreatment(item); setActiveModal('treatment'); }} activeOpacity={0.7}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
        <Text style={styles.reasonBadge}>{item.reason}</Text>
      </View>
      {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
      {renderPhotoStrip(item.photo_urls)}
    </TouchableOpacity>
  );

  const renderFeeding = ({ item }: { item: Feeding }) => (
    <TouchableOpacity style={styles.item} onPress={() => { setEditingFeeding(item); setActiveModal('feeding'); }} activeOpacity={0.7}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
        <Text style={styles.feedingBadge}>{item.type}</Text>
      </View>
      {item.amount_kg != null && (
        <Text style={styles.itemNote}>{item.amount_kg} kg</Text>
      )}
      {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
    </TouchableOpacity>
  );

  const renderHarvest = ({ item }: { item: Harvest }) => (
    <TouchableOpacity style={styles.item} onPress={() => { setEditingHarvest(item); setActiveModal('harvest'); }} activeOpacity={0.7}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
        <Text style={styles.framesBadge}>{item.frames_count} ramova</Text>
      </View>
      {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
    </TouchableOpacity>
  );

  const renderWeight = ({ item }: { item: Weight }) => (
    <TouchableOpacity style={styles.item} onPress={() => { setEditingWeight(item); setActiveModal('weight'); }} activeOpacity={0.7}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
        <Text style={styles.weightBadge}>{Number(item.weight_kg).toFixed(1)} kg</Text>
      </View>
    </TouchableOpacity>
  );

  const tabContent = () => {
    const refreshProps = {
      refreshControl: <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.honey} />,
    };
    switch (activeTab) {
      case 'Pregledi':
        return <FlatList data={inspections} keyExtractor={i => i.id} renderItem={renderInspection} contentContainerStyle={styles.listContent} ListEmptyComponent={<Text style={styles.emptyText}>Nema pregleda.</Text>} {...refreshProps} />;
      case 'Tretmani':
        return <FlatList data={treatments} keyExtractor={i => i.id} renderItem={renderTreatment} contentContainerStyle={styles.listContent} ListEmptyComponent={<Text style={styles.emptyText}>Nema tretmana.</Text>} {...refreshProps} />;
      case 'Prihrana':
        return <FlatList data={feedings} keyExtractor={i => i.id} renderItem={renderFeeding} contentContainerStyle={styles.listContent} ListEmptyComponent={<Text style={styles.emptyText}>Nema unosa prihrane.</Text>} {...refreshProps} />;
      case 'Vrcanja':
        return <FlatList data={harvests} keyExtractor={i => i.id} renderItem={renderHarvest} contentContainerStyle={styles.listContent} ListEmptyComponent={<Text style={styles.emptyText}>Nema vrcanja.</Text>} {...refreshProps} />;
      case 'Vaga': {
        const chartWeights = [...weights].reverse();
        const hasChart = chartWeights.length >= 2;
        return (
          <FlatList
            data={weights}
            keyExtractor={i => i.id}
            renderItem={renderWeight}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<Text style={styles.emptyText}>Nema unosa kilaže.</Text>}
            ListHeaderComponent={hasChart ? (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Kilaza kroz vrijeme</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <LineChart
                    data={{
                      labels: chartWeights.map(w => {
                        const d = new Date(w.date + 'T00:00:00');
                        return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`;
                      }),
                      datasets: [{ data: chartWeights.map(w => Number(w.weight_kg)) }],
                    }}
                    width={Math.max(SCREEN_WIDTH - 32, chartWeights.length * 60)}
                    height={180}
                    chartConfig={{
                      backgroundGradientFrom: colors.background,
                      backgroundGradientTo: colors.background,
                      color: (opacity = 1) => `rgba(215, 160, 66, ${opacity})`,
                      labelColor: () => colors.mutedForeground,
                      strokeWidth: 2,
                      propsForDots: { r: '4', strokeWidth: '2', stroke: colors.honeyDark },
                    }}
                    bezier
                    style={{ borderRadius: radius.lg }}
                  />
                </ScrollView>
              </View>
            ) : null}
            {...refreshProps}
          />
        );
      }
    }
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={colors.honey} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Info header */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Zadnji pregled</Text>
          <Text style={styles.infoValue}>{lastInspection ? formatDate(lastInspection.date) : 'Nije pregledana'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ramova {SEASON}</Text>
          <Text style={styles.infoValue}>{seasonFrames}</Text>
        </View>

        {activeDiseases.length > 0 ? (
          <View style={styles.diseasesSection}>
            <Text style={styles.infoLabel}>Aktivne bolesti</Text>
            {activeDiseases.map(d => (
              <View key={d.id} style={styles.diseaseRow}>
                <View style={styles.diseaseDot} />
                <Text style={styles.diseaseName}>{d.name}</Text>
                <Text style={styles.diseaseDate}>od {formatDate(d.detected_date)}</Text>
                <TouchableOpacity style={styles.resolveBtn} onPress={() => handleResolveDisease(d.id, d.name)}>
                  <Text style={styles.resolveBtnText}>Izlijeceno</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Bolesti</Text>
            <Text style={[styles.infoValue, { color: colors.statusGreen }]}>Nema aktivnih</Text>
          </View>
        )}

        {hive?.note ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Napomena</Text>
            <Text style={[styles.infoValue, styles.noteValue]}>{hive.note}</Text>
            <TouchableOpacity onPress={() => { setEditNoteText(hive.note ?? ''); setEditNoteVisible(true); }} style={styles.noteIcon}>
              <Image source={require('../assets/edit-text.png')} style={styles.noteIconImg} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeleteNote} style={styles.noteIcon}>
              <Image source={require('../assets/delete.png')} style={styles.noteIconImg} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.exportInlineBtn} onPress={handleExport} disabled={exporting}>
            {exporting
              ? <ActivityIndicator size="small" color={colors.honey} />
              : <Text style={styles.exportInlineBtnText}>Izvezi PDF</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={[styles.scaleBtn, hive?.has_scale && styles.scaleBtnActive]} onPress={handleToggleScale}>
            <Text style={[styles.scaleBtnText, hive?.has_scale && styles.scaleBtnTextActive]}>
              {hive?.has_scale ? '⚖ Vaga ✓' : '⚖ Dodijeli vagu'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteHiveBtn} onPress={handleDeleteHive}>
            <Text style={styles.deleteHiveBtnText}>Obriši košnicu</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll} contentContainerStyle={styles.tabBar}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      <View style={styles.tabContent}>{tabContent()}</View>

      {/* FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: 24 + insets.bottom }]} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddInspectionModal visible={activeModal === 'inspection'} hiveId={hiveId} editItem={editingInspection} onClose={closeModal} onSuccess={() => { closeModal(); load(); }} />
      <AddTreatmentModal visible={activeModal === 'treatment'} hiveId={hiveId} editItem={editingTreatment} onClose={closeModal} onSuccess={() => { closeModal(); load(); }} />
      <AddFeedingModal visible={activeModal === 'feeding'} hiveId={hiveId} editItem={editingFeeding} onClose={closeModal} onSuccess={() => { closeModal(); load(); }} />
      <AddHarvestModal visible={activeModal === 'harvest'} hiveId={hiveId} editItem={editingHarvest} onClose={closeModal} onSuccess={() => { closeModal(); load(); }} />
      <AddWeightModal visible={activeModal === 'weight'} hiveId={hiveId} editItem={editingWeight} onClose={closeModal} onSuccess={() => { closeModal(); load(); }} />

      {viewerUrls.length > 0 && (
        <ImageViewer urls={viewerUrls} startIndex={viewerIndex} onClose={() => setViewerUrls([])} />
      )}

      <Modal visible={editNoteVisible} animationType="slide" transparent onRequestClose={() => setEditNoteVisible(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.noteOverlay} onPress={() => setEditNoteVisible(false)}>
            <Pressable style={styles.noteSheet} onPress={() => {}}>
              <Text style={styles.noteSheetTitle}>Uredi napomenu</Text>
              <TextInput
                style={styles.noteInput}
                value={editNoteText}
                onChangeText={setEditNoteText}
                multiline
                numberOfLines={4}
                placeholder="Napomena..."
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />
              <View style={styles.noteButtons}>
                <TouchableOpacity style={styles.noteCancelBtn} onPress={() => setEditNoteVisible(false)}>
                  <Text style={styles.noteCancelText}>Odustani</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.noteSaveBtn} onPress={handleSaveNote}>
                  <Text style={styles.noteSaveText}>Spremi</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.muted },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.muted },

  infoCard: { backgroundColor: colors.background, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground },
  infoValue: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.charcoal },
  noteValue: { flex: 1, textAlign: 'right', fontFamily: fonts.body, flexWrap: 'wrap', marginHorizontal: 6 },
  noteIcon: { padding: 2 },
  noteIconImg: { width: 18, height: 18 },

  noteOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(46,38,31,0.45)' },
  noteSheet: { backgroundColor: colors.cream, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 80 },
  noteSheetTitle: { fontSize: 18, fontFamily: fonts.heading, color: colors.charcoal, marginBottom: 16 },
  noteInput: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, fontSize: 15, fontFamily: fonts.body, color: colors.charcoal, backgroundColor: colors.background, height: 100, textAlignVertical: 'top' },
  noteButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  noteCancelBtn: { flex: 1, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  noteCancelText: { fontSize: 15, fontFamily: fonts.body, color: colors.mutedForeground },
  noteSaveBtn: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.honey, alignItems: 'center' },
  noteSaveText: { fontSize: 15, fontFamily: fonts.bodyBold, color: colors.background },

  diseasesSection: { gap: 4 },
  diseaseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 2 },
  diseaseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.destructive },
  diseaseName: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.destructive, flex: 1 },
  diseaseDate: { fontSize: 12, fontFamily: fonts.body, color: colors.mutedForeground },
  resolveBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.statusGreenBg, borderWidth: 1, borderColor: colors.statusGreen },
  resolveBtnText: { fontSize: 11, fontFamily: fonts.bodyBold, color: colors.statusGreen },

  scaleBtn: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  scaleBtnActive: { borderColor: colors.honey, backgroundColor: colors.honeyLight },
  scaleBtnText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.mutedForeground },
  scaleBtnTextActive: { color: colors.honeyDark },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  exportInlineBtn: { flex: 1, borderWidth: 1, borderColor: colors.honey, borderRadius: radius.lg, padding: 10, alignItems: 'center' },
  exportInlineBtnText: { fontFamily: fonts.bodyBold, color: colors.honey, fontSize: 13 },
  deleteHiveBtn: { flex: 1, borderWidth: 1, borderColor: colors.destructive, borderRadius: radius.lg, padding: 10, alignItems: 'center' },
  deleteHiveBtnText: { fontFamily: fonts.bodyBold, color: colors.destructive, fontSize: 13 },

  chartCard: { backgroundColor: colors.background, borderRadius: radius.lg, padding: 12, marginBottom: 8, ...shadow.card },
  chartTitle: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.charcoalLight, marginBottom: 8 },

  tabBarScroll: { backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border, flexGrow: 0 },
  tabBar: { flexDirection: 'row' },
  tab: { paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.honey },
  tabText: { fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground },
  tabTextActive: { fontFamily: fonts.bodyBold, color: colors.honey },

  tabContent: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 80, gap: 8 },
  emptyText: { textAlign: 'center', fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 40, fontSize: 15 },

  item: { backgroundColor: colors.background, borderRadius: radius.lg, padding: 14, ...shadow.card, gap: 6 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemDate: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.charcoal },
  itemNote: { fontSize: 13, fontFamily: fonts.body, color: colors.charcoalLight, lineHeight: 18 },
  photoStrip: { marginTop: 6 },
  thumb: { width: 72, height: 72, borderRadius: radius.md, marginRight: 8 },

  strengthBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  strengthText: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.background },

  reasonBadge: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.honeyDark, backgroundColor: colors.honeyLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  feedingBadge: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.statusGreen, backgroundColor: colors.statusGreenBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  framesBadge: { fontSize: 12, fontFamily: fonts.bodyBold, color: colors.honeyDark, backgroundColor: colors.statusYellowBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  weightBadge: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.charcoal },

  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.honey, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.charcoal, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  fabText: { fontSize: 28, fontFamily: fonts.bodyLight, color: colors.background, lineHeight: 32 },
});
