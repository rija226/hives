import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { todayDisplay, displayToISO } from '../lib/dateUtils';
import { colors, fonts, radius } from '../lib/theme';
import type { DiaryEntry } from '../types';

function displayToDate(s: string): Date {
  const [d, m, y] = s.split('.');
  return new Date(+y, +m - 1, +d);
}

function dateToDisplay(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

function isoToDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return dateToDisplay(d);
}

type Props = { visible: boolean; editItem?: DiaryEntry; onClose: () => void; onSuccess: () => void; };

export function AddDiaryModal({ visible, editItem, onClose, onSuccess }: Props) {
  const isEdit = !!editItem;
  const [dateInput, setDateInput] = useState(todayDisplay());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editItem) {
      setDateInput(isoToDisplay(editItem.date));
      setNote(editItem.note);
    } else {
      setDateInput(todayDisplay());
      setNote('');
    }
  }, [visible]);

  const reset = () => { setDateInput(todayDisplay()); setNote(''); };
  const handleClose = () => { Keyboard.dismiss(); reset(); onClose(); };

  const handleSubmit = async () => {
    const isoDate = displayToISO(dateInput);
    if (!isoDate) { Alert.alert('Greška', 'Unesite datum u formatu DD.MM.YYYY.'); return; }
    if (!note.trim()) { Alert.alert('Greška', 'Unesite bilješku.'); return; }

    setSubmitting(true);
    try {
      let error;
      if (isEdit && editItem) {
        ({ error } = await supabase.from('diary_entries').update({ date: isoDate, note: note.trim() }).eq('id', editItem.id));
      } else {
        ({ error } = await supabase.from('diary_entries').insert({ date: isoDate, note: note.trim() }));
      }
      if (error) throw error;
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
          <Text style={styles.title}>{isEdit ? 'Uredi bilješku' : 'Nova bilješka'}</Text>

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

          <Text style={styles.label}>Bilješka</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={5}
            placeholder="npr. počelo cvjetanje lipe, visoka temperatura..."
            placeholderTextColor={colors.mutedForeground}
          />

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
  inputMultiline: { height: 120, textAlignVertical: 'top' },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { fontSize: 16, fontFamily: fonts.body, color: colors.mutedForeground },
  submitBtn: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.honey, alignItems: 'center' },
  submitText: { fontSize: 16, fontFamily: fonts.bodyBold, color: colors.background },
});
