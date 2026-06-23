import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Image, Pressable,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { pickImages, uploadAll } from '../lib/storage';
import { todayDisplay, displayToISO } from '../lib/dateUtils';
import { colors, fonts, radius } from '../lib/theme';
import type { Treatment } from '../types';

type Props = { visible: boolean; hiveId: string; editItem?: Treatment; onClose: () => void; onSuccess: () => void; };

function isoToDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

export function AddTreatmentModal({ visible, hiveId, editItem, onClose, onSuccess }: Props) {
  const isEdit = !!editItem;
  const [dateInput, setDateInput] = useState(todayDisplay());
  const [treatmentTypes, setTreatmentTypes] = useState<string[]>([]);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [saveCustom, setSaveCustom] = useState(false);
  const [note, setNote] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) fetchTypes();
  }, [visible]);

  const fetchTypes = async () => {
    const { data } = await supabase.from('treatment_types').select('name').order('name');
    const types = data?.map(t => t.name) ?? [];
    setTreatmentTypes(types);

    if (editItem) {
      setDateInput(isoToDisplay(editItem.date));
      setNote(editItem.note ?? '');
      setPhotoUris([]);
      if (types.includes(editItem.reason)) {
        setSelectedReason(editItem.reason);
        setCustomReason('');
      } else {
        setSelectedReason('drugo');
        setCustomReason(editItem.reason);
      }
    } else {
      setDateInput(todayDisplay());
      setSelectedReason(null);
      setCustomReason('');
      setSaveCustom(false);
      setNote('');
      setPhotoUris([]);
    }
  };

  const reset = () => {
    setDateInput(todayDisplay()); setSelectedReason(null); setCustomReason('');
    setSaveCustom(false); setNote(''); setPhotoUris([]);
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    const isoDate = displayToISO(dateInput);
    if (!isoDate) { Alert.alert('Greška', 'Unesite datum u formatu DD.MM.YYYY.'); return; }
    const reason = selectedReason === 'drugo' ? customReason.trim() : selectedReason;
    if (!reason) { Alert.alert('Greška', 'Odaberite ili unesite razlog tretmana.'); return; }

    setSubmitting(true);
    try {
      if (isEdit && editItem) {
        const { error } = await supabase.from('treatments').update({ date: isoDate, reason, note: note.trim() || null }).eq('id', editItem.id);
        if (error) throw error;
      } else {
        if (selectedReason === 'drugo' && saveCustom && customReason.trim()) {
          await supabase.from('treatment_types').insert({ name: customReason.trim() });
        }
        const photoUrls = photoUris.length > 0 ? await uploadAll(photoUris, hiveId) : [];
        const { error } = await supabase.from('treatments').insert({
          hive_id: hiveId, date: isoDate, reason, note: note.trim() || null, photo_urls: photoUrls,
        });
        if (error) throw error;
      }
      reset(); onSuccess();
    } catch (err: any) {
      Alert.alert('Greška', err.message ?? 'Nepoznata greška.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{isEdit ? 'Uredi tretman' : 'Novi tretman'}</Text>

            <Text style={styles.label}>Datum (DD.MM.YYYY)</Text>
            <TextInput style={styles.input} value={dateInput} onChangeText={setDateInput}
              placeholder="npr. 08.06.2026" keyboardType="numbers-and-punctuation" placeholderTextColor={colors.mutedForeground} />

            <Text style={styles.label}>Razlog</Text>
            <View style={styles.chipGrid}>
              {[...treatmentTypes, 'drugo'].map(opt => (
                <TouchableOpacity key={opt}
                  style={[styles.chip, selectedReason === opt && styles.chipActive]}
                  onPress={() => setSelectedReason(opt)}
                >
                  <Text style={[styles.chipText, selectedReason === opt && styles.chipTextActive]}>
                    {opt === 'drugo' ? 'Drugo...' : opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedReason === 'drugo' && (
              <>
                <TextInput style={[styles.input, { marginTop: 8 }]} value={customReason}
                  onChangeText={setCustomReason} placeholder="Unesite razlog..." placeholderTextColor={colors.mutedForeground} />
                {!isEdit && (
                  <TouchableOpacity style={styles.saveRow} onPress={() => setSaveCustom(!saveCustom)}>
                    <View style={[styles.checkbox, saveCustom && styles.checkboxActive]} />
                    <Text style={styles.saveLabel}>Spremi u listu razloga</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <Text style={styles.label}>Napomena (opciono)</Text>
            <TextInput style={[styles.input, styles.inputMultiline]} value={note} onChangeText={setNote}
              multiline numberOfLines={3} placeholder="..." placeholderTextColor={colors.mutedForeground} />

            {!isEdit && (
              <>
                <Text style={styles.label}>Fotografije (opciono)</Text>
                <TouchableOpacity style={styles.photoBtn} onPress={async () => {
                  const uris = await pickImages(); setPhotoUris(p => [...p, ...uris]);
                }}>
                  <Text style={styles.photoBtnText}>+ Dodaj foto</Text>
                </TouchableOpacity>
                {photoUris.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {photoUris.map((uri, i) => <Image key={i} source={{ uri }} style={styles.thumb} />)}
                  </ScrollView>
                )}
              </>
            )}

            {isEdit && editItem && editItem.photo_urls.length > 0 && (
              <Text style={styles.photoNote}>{editItem.photo_urls.length} priloženih fotografija</Text>
            )}

            <View style={styles.buttons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelText}>Odustani</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.submitText}>Spremi</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(46,38,31,0.45)' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 80, maxHeight: '90%' },
  title: { fontSize: 22, fontFamily: fonts.heading, color: colors.charcoal, marginBottom: 16 },
  label: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.charcoalLight, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, fontSize: 16, fontFamily: fonts.body, color: colors.charcoal, backgroundColor: colors.background },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  chipActive: { backgroundColor: colors.honey, borderColor: colors.honey },
  chipText: { fontSize: 14, fontFamily: fonts.body, color: colors.charcoalLight },
  chipTextActive: { color: colors.background, fontFamily: fonts.bodyBold },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  checkbox: { width: 18, height: 18, borderRadius: radius.sm, borderWidth: 2, borderColor: colors.border },
  checkboxActive: { backgroundColor: colors.honey, borderColor: colors.honey },
  saveLabel: { fontSize: 14, fontFamily: fonts.body, color: colors.charcoalLight },
  photoBtn: { borderWidth: 1, borderColor: colors.honey, borderRadius: radius.lg, padding: 12, alignItems: 'center', marginTop: 4 },
  photoBtnText: { color: colors.honey, fontFamily: fonts.bodyBold },
  thumb: { width: 64, height: 64, borderRadius: radius.md, marginRight: 8 },
  photoNote: { fontSize: 13, fontFamily: fonts.body, color: colors.mutedForeground, marginTop: 12 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { fontSize: 16, fontFamily: fonts.body, color: colors.mutedForeground },
  submitBtn: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.honey, alignItems: 'center' },
  submitText: { fontSize: 16, fontFamily: fonts.bodyBold, color: colors.background },
});
