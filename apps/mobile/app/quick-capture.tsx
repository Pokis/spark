import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { Eyebrow, H1, Muted } from '../src/components/Typography';
import { useLocalDraft } from '../src/hooks/useLocalDraft';
import { useSpark } from '../src/state/SparkProvider';

export default function QuickCaptureScreen() {
  const spark = useSpark();
  const [text, setText] = useState('');
  const clearDraft = useLocalDraft('quick-capture', { text }, (draft) => setText(draft.text));

  return (
    <Screen contentStyle={{ justifyContent: 'center' }}>
      <Card>
        <Eyebrow>External memory</Eyebrow>
        <H1>Park it quickly.</H1>
        <Muted>No category or decision required.</Muted>
        <FormField
          label="Thought"
          placeholder="Remember to…"
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          maxLength={500}
        />
        <Button
          label="Park it"
          disabled={!text.trim()}
          icon={<Ionicons name="flash" size={18} color="#FFFFFF" />}
          onPress={() => {
            void spark.addCapture(text).then(async () => {
              await clearDraft();
              router.replace('/(tabs)/capture');
            });
          }}
        />
        <Button label="Cancel" variant="ghost" onPress={() => router.back()} />
      </Card>
    </Screen>
  );
}
