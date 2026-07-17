import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type { TutorialId } from '../lib/tutorials';
import { useSpark } from '../state/SparkProvider';
import { useTheme } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { Body, Eyebrow, SectionHeading } from './Typography';

export function TutorialPrompt({
  id,
  eyebrow = 'Want a quick tour?',
  title,
  body
}: {
  id: TutorialId;
  eyebrow?: string;
  title: string;
  body: string;
}) {
  const spark = useSpark();
  const theme = useTheme();
  if (spark.settings.dismissedTutorialIds.includes(id)) return null;

  return (
    <Card style={{ borderColor: theme.primary }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <SectionHeading>{title}</SectionHeading>
      <Body>{body}</Body>
      <View style={styles.actions}>
        <Button
          label="Show tutorial"
          variant="secondary"
          onPress={() => router.push({ pathname: '/tutorials', params: { topic: id } })}
        />
        <Button
          label="Dismiss"
          variant="ghost"
          onPress={() =>
            void spark.updateSetting('dismissedTutorialIds', [
              ...spark.settings.dismissedTutorialIds,
              id
            ])
          }
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 4 }
});
