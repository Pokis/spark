import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CaptureItem } from '@spark/domain';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { FormField } from '../../src/components/FormField';
import { Screen } from '../../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../../src/components/Typography';
import { useLocalDraft } from '../../src/hooks/useLocalDraft';
import { friendlyTime } from '../../src/lib/date';
import { useSpark } from '../../src/state/SparkProvider';
import { useTheme } from '../../src/theme';

export default function CaptureScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [lastDeleted, setLastDeleted] = useState<CaptureItem | null>(null);
  const clearDraft = useLocalDraft('capture-main', { text }, (draft) => setText(draft.text));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = useMemo(
    () =>
      spark.captureItems.filter(
        (item) =>
          !normalizedQuery || item.text.toLocaleLowerCase().includes(normalizedQuery)
      ),
    [normalizedQuery, spark.captureItems]
  );
  const active = filtered.filter((item) => !item.resolvedAt);
  const resolved = filtered.filter((item) => item.resolvedAt);

  async function capture() {
    if (!text.trim()) return;
    await spark.addCapture(text);
    setText('');
    await clearDraft();
  }

  function toggleSelected(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function releaseSelected() {
    const items = active.filter((item) => selected.includes(item.id));
    for (const item of items) await spark.resolveCapture(item);
    setSelected([]);
  }

  function confirmDelete(item: CaptureItem) {
    Alert.alert(
      'Delete this captured thought?',
      'This removes it from local storage. You can undo immediately afterward.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void spark.deleteCapture(item).then(() => {
              setLastDeleted(item);
              setSelected((current) => current.filter((id) => id !== item.id));
            })
        }
      ]
    );
  }

  return (
    <Screen testID="capture-screen">
      <View>
        <Eyebrow>External memory</Eyebrow>
        <H1>Get it out of your head.</H1>
        <Muted>
          Capture a thought now and organize it later if useful. Text shared from other Android
          apps lands here locally.
        </Muted>
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

      {spark.captureItems.length >= 8 || query ? (
        <FormField
          label="Search parked thoughts"
          placeholder="Search locally…"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      ) : null}

      <View style={styles.heading}>
        <SectionHeading>Parking lot</SectionHeading>
        <Text style={[styles.count, { color: theme.textMuted }]}>{active.length}</Text>
      </View>
      {selected.length ? (
        <Card style={styles.selectionBar}>
          <Muted>{selected.length} selected</Muted>
          <View style={styles.actions}>
            <Button
              label="Release selected"
              variant="secondary"
              onPress={() => void releaseSelected()}
            />
            <Button label="Cancel" variant="ghost" onPress={() => setSelected([])} />
          </View>
        </Card>
      ) : null}

      {active.length ? (
        active.map((item) => (
          <Card
            key={item.id}
            style={[
              styles.item,
              selected.includes(item.id) ? { borderColor: theme.primary } : undefined
            ]}
          >
            {editingId === item.id ? (
              <>
                <FormField
                  label="Edit thought"
                  value={editingText}
                  onChangeText={setEditingText}
                  multiline
                  autoFocus
                  maxLength={500}
                />
                <View style={styles.actions}>
                  <Button
                    label="Save edit"
                    variant="secondary"
                    disabled={!editingText.trim()}
                    onPress={() =>
                      void spark.updateCapture(item, editingText).then(() => {
                        setEditingId(null);
                        setEditingText('');
                      })
                    }
                  />
                  <Button label="Cancel" variant="ghost" onPress={() => setEditingId(null)} />
                </View>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected.includes(item.id) }}
                  accessibilityLabel={`Select ${item.text} for cleanup`}
                  onLongPress={() => toggleSelected(item.id)}
                  onPress={() => toggleSelected(item.id)}
                >
                  <Text style={[styles.itemText, { color: theme.text }]}>
                    {selected.includes(item.id) ? '✓ ' : ''}{item.text}
                  </Text>
                  <Muted>{friendlyTime(item.createdAt)} · tap to select for cleanup</Muted>
                </Pressable>
                <View style={styles.actions}>
                  <SmallAction
                    icon="create-outline"
                    label="Edit"
                    onPress={() => {
                      setEditingId(item.id);
                      setEditingText(item.text);
                    }}
                  />
                  <SmallAction
                    icon="timer-outline"
                    label="Focus"
                    onPress={() =>
                      router.push({
                        pathname: '/(tabs)/focus',
                        params: { title: item.text.slice(0, 120), minutes: '2' }
                      })
                    }
                  />
                  <SmallAction
                    icon="list-outline"
                    label="Routine"
                    onPress={() =>
                      router.push({
                        pathname: '/routine/new',
                        params: { step: item.text.slice(0, 100) }
                      })
                    }
                  />
                  <SmallAction
                    icon="repeat-outline"
                    label="Habit"
                    onPress={() =>
                      router.push({
                        pathname: '/habit/new',
                        params: { title: item.text.slice(0, 80) }
                      })
                    }
                  />
                </View>
                <View style={styles.actions}>
                  <SmallAction
                    icon="checkmark"
                    label="Release"
                    success
                    onPress={() => void spark.resolveCapture(item)}
                  />
                  <SmallAction
                    icon="trash-outline"
                    label="Delete"
                    danger
                    onPress={() => confirmDelete(item)}
                  />
                </View>
              </>
            )}
          </Card>
        ))
      ) : (
        <Card style={styles.empty}>
          <Text style={styles.emptyEmoji}>🫧</Text>
          <SectionHeading>
            {query ? 'Try another search.' : 'Your capture list is clear.'}
          </SectionHeading>
          <Muted>Anything parked during a focus session will appear here too.</Muted>
        </Card>
      )}

      {resolved.length ? (
        <View style={styles.released}>
          <SectionHeading>Released</SectionHeading>
          <Muted>Items you moved out of the active list.</Muted>
          {resolved.slice(0, 8).map((item) => (
            <Card key={item.id} style={styles.releasedItem}>
              <Text style={[styles.releasedText, { color: theme.textMuted }]}>{item.text}</Text>
              <View style={styles.actions}>
                <SmallAction
                  icon="arrow-undo-outline"
                  label="Put back"
                  onPress={() => void spark.updateCapture({ ...item, resolvedAt: undefined }, item.text)}
                />
                <SmallAction
                  icon="trash-outline"
                  label="Delete"
                  danger
                  onPress={() => confirmDelete(item)}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      {lastDeleted ? (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.undo, { backgroundColor: '#0B1020' }]}
        >
          <Text style={styles.undoText}>Captured thought deleted.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Undo deleting the captured thought"
            onPress={() =>
              void spark.updateCapture(lastDeleted, lastDeleted.text).then(() => setLastDeleted(null))
            }
          >
            <Text style={styles.undoAction}>Undo</Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );

  function SmallAction({
    icon,
    label,
    onPress,
    success,
    danger
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress(): void;
    success?: boolean;
    danger?: boolean;
  }) {
    const color = danger ? '#D92D20' : success ? theme.success : theme.text;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: theme.surfaceAlt, opacity: pressed ? 0.7 : 1 }
        ]}
      >
        <Ionicons name={icon} size={17} color={color} />
        <Text style={[styles.actionText, { color }]}>{label}</Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  captureCard: { padding: 17 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontSize: 14, fontWeight: '800' },
  item: { gap: 10 },
  itemText: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: {
    minHeight: 40,
    paddingHorizontal: 11,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  actionText: { fontSize: 12, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 25 },
  emptyEmoji: { fontSize: 38 },
  released: { gap: 9, paddingTop: 8 },
  releasedItem: { gap: 8, padding: 12 },
  releasedText: { fontSize: 14, lineHeight: 20 },
  selectionBar: { gap: 8 },
  undo: {
    borderRadius: 15,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  undoText: { color: '#FFFFFF', fontSize: 14 },
  undoAction: { color: '#FFC857', fontSize: 14, fontWeight: '800' }
});
