import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme';

export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel
}: {
  label: string;
  selected?: boolean;
  onPress(): void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.primary : theme.surfaceAlt,
          borderColor: selected ? theme.primary : theme.border,
          opacity: pressed ? 0.75 : 1
        }
      ]}
    >
      <Text style={[styles.text, { color: selected ? theme.primaryText : theme.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 42,
    maxWidth: '100%',
    paddingHorizontal: 14,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'center'
  }
});
