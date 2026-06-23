import { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Pressable,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { todayDisplay, displayToISO } from '../lib/dateUtils';
import { colors, fonts, radius } from '../lib/theme';
import type { Feeding } from '../types';

type Props = { visible: boolean; hiveId: string; editItem?: Feeding; onClose: () => void; onSuccess: () => void; };

const FEEDING_TYPES = ['Šećerni sirup', 'Pogača', 'Invertirani šećer', 'Kandirana hrana', 'Pogača s lijekom', 'Drugo'];

function isoToDisplay(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

export function AddFeedingModal({ visible, hiveId, editItem, onClose, onSuccess }: Props) {
  const isEdit = !!editItem;
  const [dateInput, setDateInput] = useState(todayDisplay());
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customType, setCustomType] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editItem) {
      setDateInput(isoToDisplay(editItem.date));
      setNote(editItem.note ?? '');
      setAmountInput(editItem.amount_kg != null ? String(editItem.amount_kg) : '');
      if (FEEDING_TYPES.includes(editItem.type)) {
        setSelectedType(editItem.type);
        setCustomType('');
      } else {
        setSelectedType('Drugo');
        setCustomType(editItem.type);
      }
    } else {
      setDateInput(todayDisplay());
      setSelectedType(null);
      setCustomType('');
      setAmountInput('');
      setNote('');
    }
  }, [visible]);

  const reset = () => {
    setDateInput(todayDisplay()); setSelectedType(null); setCustomType('');
    setAmountInput(''); setNote('');
  };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    const isoDate = displayToISO(dateInput);
    if (!isoDate) { Alert.alert('Greška', 'Unesite datum u formatu DD.MM.YYYY.'); return; }
    const type = selectedType === 'Drugo' ? customType.trim() : selectedType;
    if (!type) { Alert.alert('Greška', 'Odaberite tip prihrane.'); return; }
    const amount = amountInput ? parseFloat(amountInput.replace(',', '.')) : null;
    if (amountInput && (isNaN(amount!) || amount! <= 0)) {
      Alert.alert('Greška', 'Unesite validnu količinu (npr. 1.5).'); return;
    }

    setSubmitting(true);
    try {
      const payload = { date: isoDate, type, amount_kg: amount, note: note.trim() || null };
      let error;
      if (isEdit && editItem) {
        ({ error } = await supabase.from('feedings').update(payload).eq('id', editItem.id));
      } else {
        ({ error } = await supabase.from('feedings').insert({ hive_id: hiveId, ...payload }));
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{isEdit ? 'Uredi prehranu' : 'Nova prihrana'}</Text>

            <Text style={styles.label}>Datum (DD.MM.YYYY)</Text>
            <TextInput style={styles.input} value={dateInput} onChangeText={setDateInput}
              placeholder="npr. 08.06.2026" keyboardType="numbers-and-punctuation" placeholderTextColor={colors.mutedForeground} />

            <Text style={styles.label}>Tip prihrane</Text>
            <View style={styles.chipGrid}>
              {FEEDING_TYPES.map(opt => (
                <TouchableOpacity key={opt}
                  style={[styles.chip, selectedType === opt && styles.chipActive]}
                  onPress={() => setSelectedType(opt)}
                >
                  <Text style={[styles.chipText, selectedType === opt && styles.chipTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedType === 'Drugo' && (
              <TextInput style={[styles.input, { marginTop: 8 }]} value={customType}
                onChangeText={setCustomType} placeholder="Unesite tip prihrane..." placeholderTextColor={colors.mutedForeground} />
            )}

            <Text style={styles.label}>Količina u kg (opciono)</Text>
            <TextInput style={styles.input} value={amountInput} onChangeText={setAmountInput}
              keyboardType="decimal-pad" placeholder="npr. 1.5" placeholderTextColor={colors.mutedForeground} />

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
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { fontSize: 16, fontFamily: fonts.body, color: colors.mutedForeground },
  submitBtn: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.honey, alignItems: 'center' },
  submitText: { fontSize: 16, fontFamily: fonts.bodyBold, color: colors.background },
});
