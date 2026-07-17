import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { Card } from './Card';

export function CollapsibleSection({
  title,
  summary,
  defaultExpanded = false,
  children
}: PropsWithChildren<{
  title: string;
  summary?: string;
  defaultExpanded?: boolean;
}>) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
        accessibilityState={{ expanded }}
        hitSlop={8}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [styles.header, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.heading}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          {!expanded && summary ? (
            <Text numberOfLines={2} style={[styles.summary, { color: theme.textMuted }]}>
              {summary}
            </Text>
          ) : null}
        </View>
        <View style={[styles.icon, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.text}
          />
        </View>
      </Pressable>
      {expanded ? <View style={styles.content}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  heading: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontSize: 19, lineHeight: 24, fontWeight: '800' },
  summary: { fontSize: 13, lineHeight: 18 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  content: { gap: 10 }
});
