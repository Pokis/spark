import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { AppSettings } from '../src/data/models';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { SettingRow } from '../src/components/SettingRow';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import type { TutorialId } from '../src/lib/tutorials';
import { useSpark } from '../src/state/SparkProvider';

type ToggleKey = {
  [K in keyof AppSettings]: AppSettings[K] extends boolean ? K : never
}[keyof AppSettings];

const optionalFeatures: {
  key: ToggleKey;
  title: string;
  description: string;
  tutorial: TutorialId;
}[] = [
  {
    key: 'actionSizesEnabled',
    title: 'Different action sizes',
    description: 'Show smaller, regular, and larger choices for habits that use them.',
    tutorial: 'habits-and-sizes'
  },
  {
    key: 'adaptiveSuggestionsEnabled',
    title: 'Adjust suggestions',
    description: 'Optionally sort habits using your available energy, time, and place.',
    tutorial: 'adaptive-suggestions'
  },
  {
    key: 'focusToolEnabled',
    title: 'Focus timer',
    description: 'Add Focus to the bottom navigation and enable focus shortcuts.',
    tutorial: 'focus'
  },
  {
    key: 'captureToolEnabled',
    title: 'Quick Capture',
    description: 'Add Capture to the bottom navigation for thoughts and tasks.',
    tutorial: 'capture'
  },
  {
    key: 'routinesEnabled',
    title: 'Step-by-step routines',
    description: 'Create and resume multi-step routines when you want more structure.',
    tutorial: 'routines'
  },
  {
    key: 'streaksEnabled',
    title: 'Reward streaks',
    description: 'Show optional daily or every-other-day streak celebrations.',
    tutorial: 'momentum'
  },
  {
    key: 'planningToolsEnabled',
    title: 'Planning tools',
    description: 'Enable weekly planning, leaving-on-time help, experiments, and deliberate sharing.',
    tutorial: 'planning'
  },
  {
    key: 'showRewards',
    title: 'Points and levels',
    description: 'Show optional points alongside completion records.',
    tutorial: 'rewards'
  },
  {
    key: 'insightsEnabled',
    title: 'Helpful patterns',
    description: 'Calculate local observations from your completions and focus sessions.',
    tutorial: 'insights'
  }
];

export default function FeaturesScreen() {
  const spark = useSpark();
  const enabled = optionalFeatures.filter((feature) => Boolean(spark.settings[feature.key])).length;

  return (
    <Screen testID="feature-settings-screen">
      <View>
        <Eyebrow>Optional</Eyebrow>
        <H1>Choose what you see</H1>
        <Body>The habit list and calendar always stay available. Everything below can be added only when it helps.</Body>
      </View>
      <Card>
        <SectionHeading>{enabled} of {optionalFeatures.length} extras enabled</SectionHeading>
        <Muted>Turning a feature off only hides its controls. It does not delete its saved data.</Muted>
      </Card>
      {optionalFeatures.map((feature) => (
        <Card key={feature.key} style={styles.featureCard}>
          <SettingRow
            title={feature.title}
            description={feature.description}
            value={Boolean(spark.settings[feature.key])}
            onValueChange={(value) => void spark.updateSetting(feature.key, value as never)}
          />
          <Button
            label="How this works"
            variant="ghost"
            onPress={() => router.push(`/tutorials?topic=${feature.tutorial}`)}
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  featureCard: { padding: 10, gap: 0 }
});
