import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { reportError } from '../services/diagnostics';

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    void reportError('react.error_boundary', error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.screen}>
        <Text style={styles.spark}>✦</Text>
        <Text accessibilityRole="header" style={styles.title}>
          Spark hit a rough edge.
        </Text>
        <Text style={styles.body}>
          Your local data has not been deliberately changed. Try opening this screen again. If it
          repeats, export the privacy-safe diagnostic report from Settings.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try Spark again"
          style={styles.button}
          onPress={() => this.setState({ error: null })}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#F8F7FC'
  },
  spark: { fontSize: 54, color: '#FF6B5F' },
  title: { color: '#172033', fontSize: 25, fontWeight: '800', textAlign: 'center' },
  body: { color: '#667085', fontSize: 16, lineHeight: 23, textAlign: 'center' },
  button: {
    minHeight: 50,
    paddingHorizontal: 22,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B5F'
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' }
});
