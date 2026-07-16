import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';
import type { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress(): void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  accessibilityHint?: string;
  testID?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  accessibilityHint,
  testID
}: ButtonProps) {
  const theme = useTheme();
  const background =
    variant === 'primary'
      ? theme.primary
      : variant === 'danger'
        ? '#D92D20'
        : variant === 'secondary'
          ? theme.surfaceAlt
          : 'transparent';
  const color =
    variant === 'primary' || variant === 'danger'
      ? theme.primaryText
      : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      android_ripple={{ color: `${theme.text}18`, borderless: false }}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: variant === 'ghost' ? theme.border : background,
          opacity: disabled || loading ? 0.45 : pressed ? 0.78 : 1
        }
      ]}
    >
      {loading ? (
        <View accessibilityLiveRegion="polite" style={styles.content}>
          <ActivityIndicator color={color} />
          <Text style={[styles.label, { color }]}>Saving…</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, { color }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center'
  }
});
