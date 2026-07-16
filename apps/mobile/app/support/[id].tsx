import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { FormField } from '../../src/components/FormField';
import { Screen } from '../../src/components/Screen';
import { H1, Muted } from '../../src/components/Typography';
import {
  listSupportMessages,
  sendSupportMessage,
  type SupportMessage
} from '../../src/services/api';
import { friendlyTime } from '../../src/lib/date';
import { useTheme } from '../../src/theme';

export default function SupportConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  async function load() {
    if (!id) return;
    try {
      setMessages(await listSupportMessages(id));
    } catch (error) {
      Alert.alert('Could not load conversation', error instanceof Error ? error.message : 'Try again.');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function send() {
    if (!id || !text.trim()) return;
    setSending(true);
    try {
      await sendSupportMessage(id, text);
      setText('');
      await load();
    } catch (error) {
      Alert.alert('Message not sent', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSending(false);
    }
  }

  if (!id) {
    return (
      <Screen>
        <H1>Conversation not found</H1>
        <Button label="Go back" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      {messages.map((message) => (
        <View
          key={message.id}
          style={[
            styles.messageWrap,
            message.author === 'user' ? styles.userWrap : styles.adminWrap
          ]}
        >
          <Card
            style={{
              ...styles.message,
              backgroundColor:
                message.author === 'user' ? `${theme.primary}20` : theme.surface
            }}
          >
            <Text style={[styles.text, { color: theme.text }]}>{message.text}</Text>
            <Muted>
              {message.author === 'user' ? 'You' : 'Spark support'} ·{' '}
              {friendlyTime(message.createdAt)}
            </Muted>
          </Card>
        </View>
      ))}
      <Card>
        <FormField
          label="Reply"
          value={text}
          onChangeText={setText}
          placeholder="Add a message…"
          maxLength={4000}
          multiline
        />
        <Button
          label="Send reply"
          loading={sending}
          disabled={!text.trim()}
          onPress={() => void send()}
        />
      </Card>
      <Button label="Refresh" variant="ghost" onPress={() => void load()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  messageWrap: { width: '100%' },
  userWrap: { alignItems: 'flex-end' },
  adminWrap: { alignItems: 'flex-start' },
  message: { maxWidth: '88%' },
  text: { fontSize: 15, lineHeight: 22 }
});
