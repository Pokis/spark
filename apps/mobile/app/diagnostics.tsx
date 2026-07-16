import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { LoadingState } from '../src/components/LoadingState';
import { Screen } from '../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import {
  buildDiagnosticsReport,
  clearDiagnostics,
  shareDiagnostics,
  type DiagnosticsReport
} from '../src/services/diagnostics';
import { useTheme } from '../src/theme';

export default function DiagnosticsScreen() {
  const theme = useTheme();
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    setError(null);
    void buildDiagnosticsReport()
      .then(setReport)
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'Could not run self-check.')
      );
  }

  useEffect(refresh, []);

  if (!report && !error) return <LoadingState />;

  return (
    <Screen>
      <View>
        <Eyebrow>Privacy-safe self-check</Eyebrow>
        <H1>Useful facts, not personal content.</H1>
        <Muted>
          This report includes app/platform state, counts, storage integrity, and recent technical
          errors. It excludes the text of habits, notes, routines, Capture, and focus targets.
        </Muted>
      </View>

      {error ? (
        <Card>
          <SectionHeading>Self-check could not finish</SectionHeading>
          <Muted>{error}</Muted>
          <Button label="Try again" onPress={refresh} />
        </Card>
      ) : null}

      {report ? (
        <>
          <Card>
            <SectionHeading>Storage</SectionHeading>
            <DiagnosticRow
              label="Encrypted native database"
              value={report.storage.encrypted ? 'Verified' : report.storage.expoGoPreview ? 'Expo Go preview' : 'Not verified'}
              good={report.storage.encrypted || report.storage.expoGoPreview}
            />
            <DiagnosticRow
              label="SQLite integrity"
              value={report.storage.integrity}
              good={report.storage.integrity === 'ok'}
            />
            <Muted>{report.storage.integrityMessage}</Muted>
          </Card>

          <Card>
            <SectionHeading>Device capabilities</SectionHeading>
            <DiagnosticRow
              label="Notifications"
              value={report.permissions.notifications}
              good={report.permissions.notifications === 'granted'}
            />
            <DiagnosticRow
              label="Device authentication"
              value={
                report.permissions.localAuthenticationHardware &&
                report.permissions.localAuthenticationEnrolled
                  ? 'Ready'
                  : 'Not configured'
              }
              good={
                report.permissions.localAuthenticationHardware &&
                report.permissions.localAuthenticationEnrolled
              }
            />
          </Card>

          <Card>
            <SectionHeading>Local record counts</SectionHeading>
            {Object.entries(report.counts).map(([label, value]) => (
              <DiagnosticRow key={label} label={label} value={String(value)} good />
            ))}
          </Card>

          <Card>
            <SectionHeading>Recent technical errors</SectionHeading>
            {report.entries.length ? (
              report.entries.slice(-10).reverse().map((entry) => (
                <View key={`${entry.at}-${entry.context}`} style={styles.errorEntry}>
                  <Text style={[styles.errorTitle, { color: theme.text }]}>{entry.context}</Text>
                  <Muted>{new Date(entry.at).toLocaleString()}</Muted>
                  <Muted>{entry.message}</Muted>
                </View>
              ))
            ) : (
              <Muted>No locally recorded technical errors.</Muted>
            )}
          </Card>

          <Button
            label="Share privacy-safe report"
            onPress={() =>
              void shareDiagnostics().catch((reason: unknown) =>
                Alert.alert(
                  'Could not share',
                  reason instanceof Error ? reason.message : 'Try again.'
                )
              )
            }
          />
          <Button
            label="Clear local error history"
            variant="ghost"
            onPress={() =>
              void clearDiagnostics().then(() => {
                setReport({ ...report, entries: [] });
              })
            }
          />
          <Button label="Run self-check again" variant="secondary" onPress={refresh} />
        </>
      ) : null}
    </Screen>
  );
}

function DiagnosticRow({
  label,
  value,
  good
}: {
  label: string;
  value: string;
  good: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: good ? theme.success : theme.textMuted }]}>
        {good ? '✓ ' : '• '}
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '700' },
  rowValue: { flexShrink: 1, fontSize: 13, textAlign: 'right' },
  errorEntry: { gap: 2, paddingVertical: 8 },
  errorTitle: { fontSize: 14, fontWeight: '800' }
});

