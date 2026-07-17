import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import { tutorialById, tutorialTopics, type TutorialTopic } from '../src/lib/tutorials';
import { useSpark } from '../src/state/SparkProvider';
import { useTheme } from '../src/theme';

export default function TutorialsScreen() {
  const params = useLocalSearchParams<{ topic?: string }>();
  const initial = tutorialById(Array.isArray(params.topic) ? params.topic[0] : params.topic);
  const spark = useSpark();
  const theme = useTheme();
  const [active, setActive] = useState<TutorialTopic | undefined>(initial);
  const [page, setPage] = useState(0);

  function open(topic: TutorialTopic) {
    setActive(topic);
    setPage(0);
  }

  async function finish(dismiss: boolean) {
    if (dismiss && active && !spark.settings.dismissedTutorialIds.includes(active.id)) {
      await spark.updateSetting('dismissedTutorialIds', [
        ...spark.settings.dismissedTutorialIds,
        active.id
      ]);
    }
    setActive(undefined);
    setPage(0);
  }

  async function openFeature() {
    if (!active?.destination) return;
    const destination = active.destination as Href;
    if (!spark.settings.dismissedTutorialIds.includes(active.id)) {
      await spark.updateSetting('dismissedTutorialIds', [
        ...spark.settings.dismissedTutorialIds,
        active.id
      ]);
    }
    router.push(destination);
  }

  if (active) {
    const current = active.pages[page]!;
    const isLast = page === active.pages.length - 1;
    return (
      <Screen testID="tutorial-detail-screen">
        <View>
          <Eyebrow>{active.icon} {active.title}</Eyebrow>
          <H1>{current.title}</H1>
          <Muted>Step {page + 1} of {active.pages.length}</Muted>
        </View>
        <View style={styles.progress} accessibilityLabel={`Step ${page + 1} of ${active.pages.length}`}>
          {active.pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.progressPart,
                { backgroundColor: index <= page ? theme.primary : theme.border }
              ]}
            />
          ))}
        </View>
        <Card style={styles.lesson}>
          <Text style={styles.lessonIcon}>{active.icon}</Text>
          <Body>{current.body}</Body>
        </Card>
        <View style={styles.navigation}>
          {page > 0 ? (
            <Button label="Previous" variant="secondary" onPress={() => setPage(page - 1)} />
          ) : null}
          {isLast && active.destination ? (
            <Button label={active.actionLabel ?? 'Open this feature'} onPress={() => void openFeature()} />
          ) : (
            <Button label="Next" onPress={() => setPage(page + 1)} />
          )}
        </View>
        {isLast ? <Button label="Done" variant="secondary" onPress={() => void finish(true)} /> : null}
        <Button label="Skip for now" variant="ghost" onPress={() => void finish(false)} />
        <Button label="Dismiss this tip" variant="ghost" onPress={() => void finish(true)} />
      </Screen>
    );
  }

  return (
    <Screen testID="tutorial-hub-screen">
      <View>
        <Eyebrow>Learn at your pace</Eyebrow>
        <H1>Feature tutorials</H1>
        <Body>
          Open only what is useful now. Every tutorial can be skipped or dismissed here and
          replayed at any time.
        </Body>
      </View>
      {tutorialTopics.map((topic) => {
        const dismissed = spark.settings.dismissedTutorialIds.includes(topic.id);
        return (
          <Pressable
            key={topic.id}
            accessibilityRole="button"
            accessibilityLabel={`${dismissed ? 'Replay' : 'Open'} tutorial: ${topic.title}`}
            onPress={() => open(topic)}
          >
            <Card style={styles.topic}>
              <Text style={styles.topicIcon}>{topic.icon}</Text>
              <View style={styles.topicText}>
                <SectionHeading>{topic.title}</SectionHeading>
                <Muted>{topic.summary}</Muted>
                <Text style={[styles.openLabel, { color: theme.primary }]}>
                  {dismissed ? 'Replay tutorial →' : 'Open tutorial →'}
                </Text>
              </View>
            </Card>
          </Pressable>
        );
      })}
      {spark.settings.dismissedTutorialIds.length ? (
        <Button
          label="Restore all contextual tips"
          variant="secondary"
          onPress={() => void spark.updateSetting('dismissedTutorialIds', [])}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 5 },
  progressPart: { height: 5, borderRadius: 999, flex: 1 },
  lesson: { minHeight: 220, justifyContent: 'center' },
  lessonIcon: { fontSize: 48 },
  navigation: { gap: 8 },
  topic: { flexDirection: 'row', alignItems: 'center' },
  topicIcon: { fontSize: 27, width: 42, flexShrink: 0 },
  topicText: { flex: 1, minWidth: 0, gap: 3 },
  openLabel: { fontSize: 13, fontWeight: '800' }
});
