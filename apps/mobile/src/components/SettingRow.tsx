import type { ReactNode } from 'react';
import { I18nManager, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useTheme } from '../theme';

export function SettingRow({
  title,
  description,
  value,
  onValueChange,
  onPress,
  trailing
}: {
  title: string;
  description?: string;
  value?: boolean;
  onValueChange?(value: boolean): void;
  onPress?(): void;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  const languageStyle = {
    textAlign: I18nManager.isRTL ? ('right' as const) : ('left' as const),
    writingDirection: I18nManager.isRTL ? ('rtl' as const) : ('ltr' as const)
  };
  const content = (
    <>
      <View style={styles.text}>
        <Text style={[styles.title, { color: theme.text }, languageStyle]}>{title}</Text>
        {description ? (
          <Text style={[styles.description, { color: theme.textMuted }, languageStyle]}>{description}</Text>
        ) : null}
      </View>
      {onValueChange ? (
        <Switch
          accessibilityLabel={title}
          value={Boolean(value)}
          onValueChange={onValueChange}
          trackColor={{ false: theme.border, true: theme.primary }}
        />
      ) : (
        trailing ?? <Text style={{ color: theme.textMuted }}>›</Text>
      )}
    </>
  );

  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8
  },
  text: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: '600' },
  description: { fontSize: 13, lineHeight: 18 }
});
