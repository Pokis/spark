import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { Screen } from '../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import { endOfToday } from '../src/lib/sensory';
import { useSpark } from '../src/state/SparkProvider';
import { useTheme } from '../src/theme';

type Need = 'start' | 'overwhelmed' | 'focus' | 'remember' | 'leave' | 'sensory';

const needs: { value: Need; label: string }[] = [
  { value: 'start', label: 'I cannot start' },
  { value: 'overwhelmed', label: 'Everything feels too much' },
  { value: 'focus', label: 'I keep drifting' },
  { value: 'remember', label: 'I need to remember something' },
  { value: 'leave', label: 'I need to leave on time' },
  { value: 'sensory', label: 'Spark feels too loud' }
];

export default function HelpScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const [need, setNeed] = useState<Need>('start');

  return (
    <Screen>
      <View>
        <Eyebrow>Contextual help</Eyebrow>
        <H1>What is hard right now?</H1>
        <Muted>Pick the closest answer. You do not need to explain or create an account.</Muted>
      </View>

      <View style={styles.choices}>
        {needs.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={need === item.value}
            onPress={() => setNeed(item.value)}
          />
        ))}
      </View>

      {need === 'start' ? (
        <Card style={{ borderColor: theme.success }}>
          <SectionHeading>Make contact with the first object.</SectionHeading>
          <Muted>
            Open the file, touch the shoes, place the cup by the sink, or read one sentence.
            Stopping after that still counts as starting.
          </Muted>
          <Button
            label="Show one tiny action"
            onPress={() =>
              void spark
                .updateSetting('minimumViableDay', true)
                .then(() => router.replace('/(tabs)'))
            }
          />
          <Button
            label="Use a 2-minute launch"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/(tabs)/focus', params: { minutes: '2' } })
            }
          />
        </Card>
      ) : null}

      {need === 'overwhelmed' ? (
        <Card style={{ borderColor: theme.purple }}>
          <SectionHeading>Reduce the number of doors.</SectionHeading>
          <Muted>
            Simple mode keeps one Today action plus Capture, Focus, and any routine already in
            progress. You can turn it off whenever you want.
          </Muted>
          <Button
            label="Turn on Simple mode"
            onPress={() =>
              void spark.updateSetting('simpleMode', true).then(() => router.replace('/(tabs)'))
            }
          />
          <Button
            label="Park the whole list in Capture"
            variant="secondary"
            onPress={() => router.push('/quick-capture')}
          />
        </Card>
      ) : null}

      {need === 'focus' ? (
        <Card>
          <SectionHeading>Borrow a body double for two minutes.</SectionHeading>
          <Muted>
            The timer is restart-safe, and interruptions can be parked without leaving the
            session.
          </Muted>
          <Button
            label="Start a 2-minute focus"
            onPress={() =>
              router.push({ pathname: '/(tabs)/focus', params: { minutes: '2' } })
            }
          />
        </Card>
      ) : null}

      {need === 'remember' ? (
        <Card>
          <SectionHeading>Get it out of working memory.</SectionHeading>
          <Muted>No category, due date, or project is required.</Muted>
          <Button
            label="Open quick capture"
            icon={<Ionicons name="flash-outline" size={18} color={theme.primaryText} />}
            onPress={() => router.push('/quick-capture')}
          />
        </Card>
      ) : null}

      {need === 'leave' ? (
        <Card>
          <SectionHeading>Work backward from the real departure time.</SectionHeading>
          <Muted>Add a buffer and, if useful, pair the plan with a leave-the-house routine.</Muted>
          <Button label="Open Departure mode" onPress={() => router.push('/departure')} />
        </Card>
      ) : null}

      {need === 'sensory' ? (
        <Card>
          <SectionHeading>Make Spark quiet for the rest of today.</SectionHeading>
          <Muted>This mutes haptics, soundscapes, motion, and reward celebrations in one action.</Muted>
          <Button
            label="Quiet Spark until tomorrow"
            onPress={() => void spark.updateSetting('quietUntil', endOfToday())}
          />
        </Card>
      ) : null}

      <Muted>
        Spark is a self-organization tool, not medical care. If you are in immediate danger or
        crisis, contact local emergency or crisis support.
      </Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
});

