import { useState } from 'react';
import {
  Modal, View, Text, TextInput, Switch, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, fonts, radius } from '../lib/theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AddHiveModal({ visible, onClose, onSuccess }: Props) {
  const [number, setNumber] = useState('');
  const [hasScale, setHasScale] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setNumber(''); setHasScale(false); setNote(''); };
  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    const num = parseInt(number, 10);
    if (!number || isNaN(num) || num <= 0) {
      Alert.alert('Greška', 'Unesite validan broj košnice.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('hives').insert({
      number: num, has_scale: hasScale, note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('Greška', error.code === '23505' ? `Košnica br. ${num} vec postoji.` : error.message);
      return;
    }
    reset();
    onSuccess();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <Text style={styles.title}>Nova košnica</Text>

          <Text style={styles.label}>Broj košnice</Text>
          <TextInput style={styles.input} value={number} onChangeText={setNumber}
            keyboardType="number-pad" placeholder="npr. 42" maxLength={4} placeholderTextColor={colors.mutedForeground} />

          <View style={styles.row}>
            <Text style={styles.label}>Ima vagu</Text>
            <Switch value={hasScale} onValueChange={setHasScale} thumbColor={colors.background}
              trackColor={{ false: colors.border, true: colors.honey }} />
          </View>

          <Text style={styles.label}>Napomena (opciono)</Text>
          <TextInput style={[styles.input, styles.inputMultiline]} value={note} onChangeText={setNote}
            multiline numberOfLines={3} placeholder="..." placeholderTextColor={colors.mutedForeground} />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Odustani</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
              {submitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.submitText}>Dodaj</Text>}
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
  title: { fontSize: 22, fontFamily: fonts.heading, color: colors.charcoal, marginBottom: 20 },
  label: { fontSize: 14, fontFamily: fonts.bodyBold, color: colors.charcoalLight, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 12, fontSize: 16, fontFamily: fonts.body, color: colors.charcoal, backgroundColor: colors.background },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText: { fontSize: 16, fontFamily: fonts.body, color: colors.mutedForeground },
  submitBtn: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.honey, alignItems: 'center' },
  submitText: { fontSize: 16, fontFamily: fonts.bodyBold, color: colors.background },
});
