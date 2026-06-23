import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { todayDisplay, displayToISO } from '../lib/dateUtils';
import { colors, fonts, radius } from '../lib/theme';
import type { Harvest } from '../types';

type Props = { visible: boolean; hiveId: string; editItem?: Harvest; onClose: () => void; onSuccess: () => void; };

function isoToDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

export function AddHarvestModal({ visible, hiveId, editItem, onClose, onSuccess }: Props) {
  const isEdit = !!editItem;
  const [dateInput, setDateInput] = useState(todayDisplay());
  const [framesCount, setFramesCount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editItem) {
      setDateInput(isoToDisplay(editItem.date));
      setFramesCount(String(editItem.frames_count));
      setNote(editItem.note ?? '');
    } else {
      setDateInput(todayDisplay()); setFramesCount(''); setNote('');
    }
  }, [visible]);

  const reset = () => { setDateInput(todayDisplay()); setFramesCount(''); setNote(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    const isoDate = displayToISO(dateInput);
    if (!isoDate) { Alert.alert('Greška', 'Unesite datum u formatu DD.MM.YYYY.'); return; }
    const count = parseInt(framesCount, 10);
    if (!framesCount || isNaN(count) || count <= 0) { Alert.alert('Greška', 'Unesite validan broj ramova.'); return; }
    setSubmitting(true);
    let error;
    if (isEdit && editItem) {
      ({ error } = await supabase.from('harvests').update({ date: isoDate, frames_count: count, note: note.trim() || null }).eq('id', editItem.id));
    } else {
      ({ error } = await supabase.from('harvests').insert({ hive_id: hiveId, date: isoDate, frames_count: count, note: note.trim() || null }));
    }
    setSubmitting(false);
    if (error) { Alert.alert('Greška', error.message); return; }
    reset(); onSuccess();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>{isEdit ? 'Uredi vrcanje' : 'Novo vrcanje'}</Text>

          <Text style={styles.label}>Datum (DD.MM.YYYY)</Text>
          <TextInput style={styles.input} value={dateInput} onChangeText={setDateInput}
            placeholder="npr. 08.06.2026" keyboardType="numbers-and-punctuation" placeholderTextColor={colors.mutedForeground} />

          <Text style={styles.label}>Broj izvadenih ramova</Text>
          <TextInput style={styles.input} value={framesCount} onChangeText={setFramesCount}
            keyboardType="number-pad" placeholder="npr. 8" maxLength={3} placeholderTextColor={colors.mutedForeground} />

          <Text style={styles.label}>Napomena (opciono)</Text>
          <TextInput style={[styles.input, styles.inputMultiline]} value={note} onChangeText={setNote}
            multiline numberOfLines={3} placeholder="..." placeholderTextColor={colors.mutedForeground} />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Odustani</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.submitText}>Spremi</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(46,38,31,0.45)' },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 24, paddingBottom: 80 },
  title: { fontSize: 22, fontFamily: fonts.heading, color: colors.charcoal, marginBottom: 16 },
  label: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.charcoalLight, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, fontSize: 16, fontFamily: fonts.body, color: colors.charcoal, backgroundColor: colors.background },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { fontSize: 16, fontFamily: fonts.body, color: colors.mutedForeground },
  submitBtn: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.honey, alignItems: 'center' },
  submitText: { fontSize: 16, fontFamily: fonts.bodyBold, color: colors.background },
});
