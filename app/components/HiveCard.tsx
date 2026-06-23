import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, fonts, radius, shadow } from '../lib/theme';
import { HiveWithStatus } from '../types';

const STATUS_COLOR: Record<string, string> = {
  green: colors.statusGreen,
  yellow: colors.statusYellow,
  red: colors.statusRed,
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

type Props = {
  hive: HiveWithStatus;
  onPress: () => void;
};

export function HiveCard({ hive, onPress }: Props) {
  const color = STATUS_COLOR[hive.status];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.statusBar, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.icons}>
          {hive.hasActiveDisease && <Image source={require('../assets/virus.png')} style={styles.iconDisease} />}
          {hive.has_scale && <Image source={require('../assets/weight-scale.png')} style={styles.iconScale} />}
          {hive.note && <Image source={require('../assets/message.png')} style={styles.iconNote} />}
        </View>
        <Text style={styles.number}>{hive.number}</Text>
        <Text style={styles.dateLabel}>Zadnji pregled</Text>
        <Text style={styles.date}>
          {hive.lastInspectionDate ? formatDate(hive.lastInspectionDate) : 'Nije pregledana'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: radius.lg,
    backgroundColor: colors.muted,
    overflow: 'hidden',
    ...shadow.card,
  },
  statusBar: {
    height: 5,
    width: '100%',
  },
  body: {
    padding: 12,
    alignItems: 'center',
  },
  number: {
    fontSize: 44,
    fontWeight: '700',
    color: colors.charcoal,
    lineHeight: 54,
  },
  icons: { position: 'absolute', top: 8, right: 8, flexDirection: 'column', gap: 2, alignItems: 'flex-end' },
  iconDisease: { width: 18, height: 18 },
  iconScale: { width: 18, height: 18 },
  iconNote: { width: 18, height: 18 },
  dateLabel: {
    fontSize: 10,
    fontFamily: fonts.body,
    color: colors.mutedForeground,
    marginTop: 6,
  },
  date: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    color: colors.charcoalLight,
  },
});
