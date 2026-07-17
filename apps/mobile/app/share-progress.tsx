import { useRef, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import {
  progressShareText,
  progressWinLabel,
  toggleSharedWin
} from '../src/lib/progressSharing';
import { useSpark } from '../src/state/SparkProvider';
import { useTheme } from '../src/theme';

export default function ShareProgressScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const cardRef = useRef<View>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const recent = spark.completions.slice(0, 30);
  const selectedCompletions = recent.filter((completion) =>
    selected.includes(completion.id)
  );

  function labelFor(completionId: string): string {
    const completion = spark.completions.find((item) => item.id === completionId);
    return progressWinLabel(completion, spark.habits);
  }

  function toggle(id: string) {
    setSelected((current) => {
      const result = toggleSharedWin(current, id);
      if (result.atLimit) {
        Alert.alert('Choose up to five', 'Select up to five wins so the card stays clear and readable.');
      }
      return result.selected;
    });
  }

  function shareText() {
    const message = progressShareText(selected, spark.completions, spark.habits);
    void Share.share({ title: 'Selected Spark wins', message });
  }

  async function shareImage() {
    if (!cardRef.current) return;
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile'
      });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share selected Spark wins'
      });
    } catch (error) {
      Alert.alert(
        'Could not create the image',
        error instanceof Error ? error.message : 'Try sharing as text.'
      );
    }
  }

  return (
    <Screen>
      <View>
        <Eyebrow>Share only what you choose</Eyebrow>
        <H1>You choose every win.</H1>
        <Muted>
          Select up to five completed actions, preview the card, then open your device share
          sheet for an image or plain text.
        </Muted>
      </View>

      <Card>
        <SectionHeading>Recent wins</SectionHeading>
        {recent.length ? (
          recent.map((completion) => {
            const checked = selected.includes(completion.id);
            return (
              <Pressable
                key={completion.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggle(completion.id)}
                style={[
                  styles.winRow,
                  {
                    borderColor: checked ? theme.primary : theme.border,
                    backgroundColor: checked ? `${theme.primary}12` : theme.surface
                  }
                ]}
              >
                <Text style={[styles.check, { color: checked ? theme.primary : theme.textMuted }]}>
                  {checked ? '✓' : '○'}
                </Text>
                <View style={styles.winText}>
                  <Text style={[styles.winTitle, { color: theme.text }]}>
                    {labelFor(completion.id)}
                  </Text>
                  <Muted>{completion.localDate}</Muted>
                </View>
              </Pressable>
            );
          })
        ) : (
          <Muted>Mark an action Done first, then come back when you deliberately want to share it.</Muted>
        )}
      </Card>

      <View
        ref={cardRef}
        collapsable={false}
        style={[styles.progressCard, { backgroundColor: '#0B1020' }]}
      >
        <Text style={styles.brand}>✦ SPARK</Text>
        <Text style={styles.cardTitle}>A few things that moved forward</Text>
        {selectedCompletions.length ? (
          selectedCompletions.map((completion) => (
            <View key={completion.id} style={styles.cardWin}>
              <Text style={styles.cardCheck}>✓</Text>
              <View style={styles.winText}>
                <Text style={styles.cardWinText}>{labelFor(completion.id)}</Text>
                <Text style={styles.cardDate}>{completion.localDate}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.cardEmpty}>Choose a few wins above.</Text>
        )}
        <Text style={styles.cardFooter}>Selected wins · shared by you</Text>
      </View>

      <Button
        label="Share image"
        disabled={!selected.length}
        onPress={() => void shareImage()}
      />
      <Button
        label="Share as text"
        variant="secondary"
        disabled={!selected.length}
        onPress={shareText}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  winRow: {
    minHeight: 58,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  check: { fontSize: 22, width: 26, textAlign: 'center' },
  winText: { flex: 1, gap: 2 },
  winTitle: { fontSize: 15, fontWeight: '700' },
  progressCard: { borderRadius: 24, padding: 22, gap: 14 },
  brand: { color: '#FF8A7F', fontSize: 13, fontWeight: '800', letterSpacing: 1.4 },
  cardTitle: { color: '#FFFFFF', fontSize: 24, lineHeight: 30, fontWeight: '800' },
  cardWin: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  cardCheck: { color: '#65D6A6', fontSize: 20, fontWeight: '800' },
  cardWinText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  cardDate: { color: '#A8B0C4', fontSize: 12 },
  cardEmpty: { color: '#A8B0C4', fontSize: 15 },
  cardFooter: { color: '#A8B0C4', fontSize: 12, marginTop: 4 }
});
