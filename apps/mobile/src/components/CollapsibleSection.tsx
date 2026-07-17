import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import { Card } from './Card';

export function CollapsibleSection({
  title,
  summary,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandedChange,
  children
}: PropsWithChildren<{
  title: string;
  summary?: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?(expanded: boolean): void;
}>) {
  const theme = useTheme();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = controlledExpanded ?? internalExpanded;

  function toggleExpanded() {
    const nextExpanded = !expanded;
    if (controlledExpanded === undefined) {
      setInternalExpanded(nextExpanded);
    }
    onExpandedChange?.(nextExpanded);
  }

  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
        accessibilityState={{ expanded }}
        hitSlop={8}
        onPress={toggleExpanded}
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
        <View style={[styles.toggle, { backgroundColor: theme.surfaceAlt }]}>
          <Text style={[styles.toggleLabel, { color: theme.textMuted }]}>
            {expanded ? 'Hide' : 'Show'}
          </Text>
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
  toggle: {
    minWidth: 72,
    height: 40,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  toggleLabel: { fontSize: 12, lineHeight: 16, fontWeight: '800' },
  content: { gap: 10 }
});
