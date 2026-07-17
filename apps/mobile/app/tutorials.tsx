import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent
} from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { CollapsibleSection } from '../src/components/CollapsibleSection';
import { Screen } from '../src/components/Screen';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import {
  tutorialById,
  tutorialCategories,
  tutorialTopics,
  type TutorialTopic
} from '../src/lib/tutorials';
import { useSpark } from '../src/state/SparkProvider';
import { useTheme } from '../src/theme';

export default function TutorialsScreen() {
  const params = useLocalSearchParams<{ topic?: string }>();
  const initial = tutorialById(Array.isArray(params.topic) ? params.topic[0] : params.topic);
  const spark = useSpark();
  const theme = useTheme();
  const [active, setActive] = useState<TutorialTopic | undefined>(initial);
  const [page, setPage] = useState(0);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(
    () => new Set(tutorialCategories[0] ? [tutorialCategories[0].id] : [])
  );
  const scrollViewRef = useRef<ScrollView>(null);
  const hubScrollY = useRef(0);
  const activeId = active?.id;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: activeId ? 0 : hubScrollY.current, animated: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeId]);

  function rememberHubPosition(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!active) hubScrollY.current = event.nativeEvent.contentOffset.y;
  }

  function setCategoryExpanded(categoryId: string, expanded: boolean) {
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      if (expanded) next.add(categoryId);
      else next.delete(categoryId);
      return next;
    });
  }

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
      <Screen
        testID="tutorial-detail-screen"
        scrollViewRef={scrollViewRef}
        onScroll={rememberHubPosition}
        scrollEventThrottle={16}
      >
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
            <Button label="Back" variant="secondary" onPress={() => setPage(page - 1)} />
          ) : null}
          {isLast ? (
            active.destination ? (
              <Button
                label={active.actionLabel ?? 'Open this feature'}
                onPress={() => void openFeature()}
              />
            ) : (
              <Button label="Done" onPress={() => void finish(true)} />
            )
          ) : (
            <Button label="Next" onPress={() => setPage(page + 1)} />
          )}
        </View>
        {isLast && active.destination ? (
          <Button label="Done" variant="secondary" onPress={() => void finish(true)} />
        ) : null}
        <Button label="Close this guide" variant="ghost" onPress={() => void finish(false)} />
        <Button label="Don’t show this tip again" variant="ghost" onPress={() => void finish(true)} />
      </Screen>
    );
  }

  return (
    <Screen
      testID="tutorial-hub-screen"
      scrollViewRef={scrollViewRef}
      onScroll={rememberHubPosition}
      scrollEventThrottle={16}
    >
      <View>
        <Eyebrow>Learn at your pace</Eyebrow>
        <H1>Learn how features work</H1>
        <Body>
          Open only what is useful now. Every tutorial can be skipped or dismissed here and
          replayed at any time.
        </Body>
      </View>
      {tutorialCategories.map((category) => (
        <CollapsibleSection
          key={category.id}
          title={category.title}
          summary={category.summary}
          expanded={expandedCategoryIds.has(category.id)}
          onExpandedChange={(expanded) => setCategoryExpanded(category.id, expanded)}
        >
          {tutorialTopics
            .filter((topic) => topic.category === category.id)
            .map((topic) => {
              const dismissed = spark.settings.dismissedTutorialIds.includes(topic.id);
              return (
                <Pressable
                  key={topic.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${dismissed ? 'Replay' : 'Open'} guide: ${topic.title}`}
                  onPress={() => open(topic)}
                >
                  <View style={[styles.topic, { borderColor: theme.border }]}>
                    <Text style={styles.topicIcon}>{topic.icon}</Text>
                    <View style={styles.topicText}>
                      <SectionHeading>{topic.title}</SectionHeading>
                      <Muted>{topic.summary}</Muted>
                      <Text style={[styles.openLabel, { color: theme.primary }]}>
                        {dismissed ? 'Replay guide →' : 'Open guide →'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
        </CollapsibleSection>
      ))}
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
  topic: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12
  },
  topicIcon: { fontSize: 27, width: 42, flexShrink: 0 },
  topicText: { flex: 1, minWidth: 0, gap: 3 },
  openLabel: { fontSize: 13, fontWeight: '800' }
});
