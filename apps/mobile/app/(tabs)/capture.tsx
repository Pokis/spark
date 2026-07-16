import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { FormField } from '../../src/components/FormField';
import { Screen } from '../../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../../src/components/Typography';
import { friendlyTime } from '../../src/lib/date';
import { useSpark } from '../../src/state/SparkProvider';
import { useTheme } from '../../src/theme';

export default function CaptureScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const [text, setText] = useState('');
  const active = spark.captureItems.filter((item) => !item.resolvedAt);
  const resolved = spark.captureItems.filter((item) => item.resolvedAt);

  async function capture() {
    if (!text.trim()) return;
    await spark.addCapture(text);
    setText('');
  }

  return (
    <Screen testID="capture-screen">
      <View>
        <Eyebrow>External memory</Eyebrow>
        <H1>Get it out of your head.</H1>
        <Muted>No categories required. Capture first; decide later—or never.</Muted>
      </View>
      <Card style={[styles.captureCard, { borderColor: theme.purple }]}>
        <FormField
          label="Brain dump"
          placeholder="A thought, task, worry, idea…"
          multiline
          value={text}
          onChangeText={setText}
          maxLength={500}
          returnKeyType="default"
          testID="capture-input"
        />
        <Button
          label="Park it"
          disabled={!text.trim()}
          onPress={() => void capture()}
          icon={<Ionicons name="flash" size={18} color="#FFFFFF" />}
          testID="capture-submit"
        />
      </Card>

      <View style={styles.heading}>
        <SectionHeading>Parking lot</SectionHeading>
        <Text style={[styles.count, { color: theme.textMuted }]}>{active.length}</Text>
      </View>
      {active.length ? (
        active.map((item) => (
          <Card key={item.id} style={styles.item}>
            <Text style={[styles.itemText, { color: theme.text }]}>{item.text}</Text>
            <Muted>{friendlyTime(item.createdAt)}</Muted>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Turn ${item.text} into a habit`}
                onPress={() =>
                  router.push({
                    pathname: '/habit/new',
                    params: { title: item.text.slice(0, 80) }
                  })
                }
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.surfaceAlt, opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <Ionicons name="repeat-outline" size={17} color={theme.text} />
                <Text style={[styles.actionText, { color: theme.text }]}>Make habit</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Resolve ${item.text}`}
                onPress={() => void spark.resolveCapture(item)}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: `${theme.success}22`, opacity: pressed ? 0.7 : 1 }
                ]}
              >
                <Ionicons name="checkmark" size={18} color={theme.success} />
                <Text style={[styles.actionText, { color: theme.success }]}>Release</Text>
              </Pressable>
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.empty}>
          <Text style={styles.emptyEmoji}>🫧</Text>
          <SectionHeading>Your head has some breathing room.</SectionHeading>
          <Muted>Anything parked during a focus session will appear here too.</Muted>
        </Card>
      )}

      {resolved.length ? (
        <View style={styles.released}>
          <Muted>{resolved.length} thought{resolved.length === 1 ? '' : 's'} released</Muted>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  captureCard: { padding: 17 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontSize: 14, fontWeight: '800' },
  item: { gap: 8 },
  itemText: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  actionText: { fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 25 },
  emptyEmoji: { fontSize: 38 },
  released: { alignItems: 'center', paddingTop: 8 }
});
