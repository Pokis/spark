import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import {
  createSupportThread,
  listSupportThreads,
  type SupportThreadSummary
} from '../src/services/api';
import { cloudConfigured } from '../src/services/cloudConfig';
import { useSpark } from '../src/state/SparkProvider';
import { useTheme } from '../src/theme';
import { goBackOr } from '../src/lib/navigation';

export default function SupportScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const [threads, setThreads] = useState<SupportThreadSummary[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const configured = cloudConfigured();
  const available = configured && spark.remoteConfig.defaults.supportEnabled;

  async function load() {
    if (!available) return;
    try {
      setThreads(await listSupportThreads());
    } catch (error) {
      Alert.alert('Support is unavailable', error instanceof Error ? error.message : 'Try later.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function send() {
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    try {
      const result = await createSupportThread({
        subject,
        message,
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        platform: Platform.OS === 'ios' ? 'ios' : 'android'
      });
      setSubject('');
      setMessage('');
      router.push(`/support/${result.id}`);
    } catch (error) {
      Alert.alert('Message not sent', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!available) {
    return (
      <Screen>
        <H1>Support is not available right now.</H1>
        <Muted>
          The app remains fully functional offline. The owner can enable the optional,
          scale-to-zero support service later without changing local habits.
        </Muted>
        <Button label="Go back" onPress={() => goBackOr('/settings')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View>
        <Eyebrow>Async, private, human</Eyebrow>
        <H1>How can we help?</H1>
        <Muted>
          This sends only the text below plus app/platform version. Habit and brain-dump data are
          never attached.
        </Muted>
      </View>
      <Card>
        <FormField
          label="Subject"
          placeholder="What is this about?"
          value={subject}
          onChangeText={setSubject}
          maxLength={120}
        />
        <FormField
          label="Message"
          placeholder="Tell us what happened…"
          value={message}
          onChangeText={setMessage}
          maxLength={4000}
          multiline
        />
        <Button
          label="Start conversation"
          loading={loading}
          disabled={!subject.trim() || !message.trim()}
          onPress={() => void send()}
        />
      </Card>

      <SectionHeading>Conversations</SectionHeading>
      {threads.length ? (
        threads.map((thread) => (
          <Card key={thread.id}>
            <Text style={[styles.subject, { color: theme.text }]}>{thread.subject}</Text>
            <Muted>
              {thread.status.replaceAll('_', ' ')}
              {thread.unreadByUser ? ` · ${thread.unreadByUser} new` : ''}
            </Muted>
            <Button
              label="Open"
              variant="secondary"
              onPress={() => router.push(`/support/${thread.id}`)}
            />
          </Card>
        ))
      ) : (
        <Muted>No previous conversations.</Muted>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subject: { fontSize: 17, fontWeight: '700' }
});
