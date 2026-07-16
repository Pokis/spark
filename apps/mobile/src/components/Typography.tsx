import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { useTheme } from '../theme';

export function H1({ children, style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <Text accessibilityRole="header" {...props} style={[styles.h1, { color: theme.text }, style]}>
      {children}
    </Text>
  );
}

export function H2({ children, style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <Text accessibilityRole="header" {...props} style={[styles.h2, { color: theme.text }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <Text {...props} style={[styles.body, { color: theme.text }, style]}>
      {children}
    </Text>
  );
}

export function Muted({ children, style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <Text {...props} style={[styles.muted, { color: theme.textMuted }, style]}>
      {children}
    </Text>
  );
}

export function Eyebrow({ children, style, ...props }: TextProps) {
  const theme = useTheme();
  return (
    <Text {...props} style={[styles.eyebrow, { color: theme.primary }, style]}>
      {children}
    </Text>
  );
}

export function SectionHeading({
  children,
  style,
  ...props
}: PropsWithChildren<TextProps>) {
  const theme = useTheme();
  return (
    <Text accessibilityRole="header" {...props} style={[styles.section, { color: theme.text }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.7
  },
  h2: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.4
  },
  body: {
    fontSize: 16,
    lineHeight: 24
  },
  muted: {
    fontSize: 14,
    lineHeight: 21
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase'
  },
  section: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700'
  }
});
