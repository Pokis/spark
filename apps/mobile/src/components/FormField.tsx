import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../theme';

export function FormField({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          props.multiline && styles.multiline,
          {
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: theme.border
          },
          props.style
        ]}
      />
      {hint ? <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 7 },
  label: { fontSize: 14, fontWeight: '700' },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  hint: { fontSize: 12, lineHeight: 17 }
});
