import type { PropsWithChildren, ReactNode, Ref } from 'react';
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
  scrollViewRef?: Ref<ScrollView>;
  onScroll?: ScrollViewProps['onScroll'];
  scrollEventThrottle?: ScrollViewProps['scrollEventThrottle'];
}

export function keyboardAvoidingBehavior(
  platform: typeof Platform.OS,
  enabled: boolean
): 'padding' | 'height' | undefined {
  if (!enabled) return undefined;
  return platform === 'ios' ? 'padding' : 'height';
}

export function Screen({
  children,
  scroll = true,
  footer,
  contentStyle,
  keyboard = true,
  testID,
  refreshControl,
  scrollViewRef,
  onScroll,
  scrollEventThrottle
}: ScreenProps) {
  const theme = useTheme();
  const body = scroll ? (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={[styles.content, styles.scrollContent, contentStyle]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      keyboardShouldPersistTaps="handled"
      onScroll={onScroll}
      refreshControl={refreshControl}
      scrollEventThrottle={scrollEventThrottle}
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
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['top', 'bottom']}
      testID="spark-safe-area"
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={keyboardAvoidingBehavior(Platform.OS, keyboard)}
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
  scrollContent: { flexGrow: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 16
  }
});
