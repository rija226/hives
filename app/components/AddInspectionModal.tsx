import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, Switch, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Image, Pressable, Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { pickImages, uploadAll } from '../lib/storage';
import { todayDisplay, displayToISO } from '../lib/dateUtils';
import { colors, fonts, radius } from '../lib/theme';
import type { Inspection } from '../types';

type Props = {
  visible: boolean;
  hiveId: string;
  editItem?: Inspection;
  onClose: () => void;
  onSuccess: () => void;
};

const STRENGTH_OPTIONS = [
  { value: 'strong', label: 'Jako',    color: colors.statusGreen },
  { value: 'medium', label: 'Srednje', color: colors.statusYellow },
  { value: 'weak',   label: 'Slabo',   color: colors.statusRed },
] as const;

function isoToDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

function displayToDate(s: string): Date {
  const [d, m, y] = s.split('.');
  return new Date(+y, +m - 1, +d);
}

function dateToDisplay(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

export function AddInspectionModal({ visible, hiveId, editItem, onClose, onSuccess }: Props) {
  const isEdit = !!editItem;
  const [dateInput, setDateInput] = useState(todayDisplay());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [strength, setStrength] = useState<'strong' | 'medium' | 'weak'>('strong');
  const [note, setNote] = useState('');
  const [markDisease, setMarkDisease] = useState(false);
  const [diseaseName, setDiseaseName] = useState('');
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editItem) {
      setDateInput(isoToDisplay(editItem.date));
      setStrength(editItem.colony_strength);
      setNote(editItem.note ?? '');
      setMarkDisease(false);
      setDiseaseName('');
      setPhotoUris([]);
    } else {
      setDateInput(todayDisplay()); setStrength('strong'); setNote('');
      setMarkDisease(false); setDiseaseName(''); setPhotoUris([]);
    }
  }, [visible]);

  const reset = () => {
    setDateInput(todayDisplay()); setStrength('strong'); setNote('');
    setMarkDisease(false); setDiseaseName(''); setPhotoUris([]);
  };
  const handleClose = () => { Keyboard.dismiss(); reset(); onClose(); };

  const handleSubmit = async () => {
    const isoDate = displayToISO(dateInput);
    if (!isoDate) { Alert.alert('Greška', 'Unesite datum u formatu DD.MM.YYYY.'); return; }
    if (!isEdit && markDisease && !diseaseName.trim()) { Alert.alert('Greška', 'Unesite naziv bolesti.'); return; }

    setSubmitting(true);
    try {
      if (isEdit && editItem) {
        const { error } = await supabase.from('inspections').update({
          date: isoDate, colony_strength: strength, note: note.trim() || null,
        }).eq('id', editItem.id);
        if (error) throw error;
      } else {
        const photoUrls = photoUris.length > 0 ? await uploadAll(photoUris, hiveId) : [];
        const { error } = await supabase.from('inspections').insert({
          hive_id: hiveId, date: isoDate, colony_strength: strength,
          note: note.trim() || null, photo_urls: photoUrls,
        });
        if (error) throw error;
        if (markDisease) {
          await supabase.from('diseases').insert({ hive_id: hiveId, name: diseaseName.trim(), detected_date: isoDate });
        }
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{isEdit ? 'Uredi pregled' : 'Novi pregled'}</Text>

            <Text style={styles.label}>Datum</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ fontSize: 16, fontFamily: fonts.body, color: colors.charcoal }}>{dateInput}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={displayToDate(dateInput)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setDateInput(dateToDisplay(date));
                }}
              />
            )}

            <Text style={styles.label}>Stanje drustva</Text>
            <View style={styles.strengthRow}>
              {STRENGTH_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.strengthBtn, strength === opt.value && { backgroundColor: opt.color, borderColor: opt.color }]}
                  onPress={() => setStrength(opt.value)}
                >
                  <Text style={[styles.strengthBtnText, strength === opt.value && { color: colors.background }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Napomena (opciono)</Text>
            <TextInput style={[styles.input, styles.inputMultiline]} value={note} onChangeText={setNote}
              multiline numberOfLines={3} placeholder="..." placeholderTextColor={colors.mutedForeground} />

            {!isEdit && (
              <>
                <View style={styles.row}>
                  <Text style={styles.label}>Oznaci bolest</Text>
                  <Switch value={markDisease} onValueChange={setMarkDisease}
                    thumbColor={colors.background} trackColor={{ false: colors.border, true: colors.honey }} />
                </View>
                {markDisease && (
                  <TextInput style={styles.input} value={diseaseName} onChangeText={setDiseaseName}
                    placeholder="npr. krečno leglo" placeholderTextColor={colors.mutedForeground} />
                )}

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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  strengthRow: { flexDirection: 'row', gap: 8 },
  strengthBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', backgroundColor: colors.background },
  strengthBtnText: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.charcoalLight },
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
