import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type ViewStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

interface ScreenProps extends PropsWithChildren {
  scroll?: boolean;
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  keyboard?: boolean;
  testID?: string;
  refreshControl?: ScrollViewProps['refreshControl'];
}

export function Screen({
  children,
  scroll = true,
  footer,
  contentStyle,
  keyboard = true,
  testID,
  refreshControl
}: ScreenProps) {
  const theme = useTheme();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, contentStyle]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      testID={testID}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.flex, contentStyle]} testID={testID}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={keyboard && Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {body}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 16
  }
});
