import * as LocalAuthentication from 'expo-local-authentication';
import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import {
  chooseAutomaticBackupDirectory,
  ensureBackupRecoveryCode,
  getBackupRecoveryCode,
  pickEncryptedBackupForPreview,
  restoreBackup,
  rotateBackupRecoveryCode,
  shareEncryptedBackup,
  writeAutomaticEncryptedBackup
} from '../src/services/backup';
import { useSpark } from '../src/state/SparkProvider';
import { useTheme } from '../src/theme';

export default function EncryptedBackupsScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const [secret, setSecret] = useState('');
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function authenticateIfAvailable(): Promise<boolean> {
    const available =
      (await LocalAuthentication.hasHardwareAsync()) &&
      (await LocalAuthentication.isEnrolledAsync());
    if (!available) return true;
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Show backup recovery code',
      disableDeviceFallback: false,
      fallbackLabel: 'Use device passcode'
    });
    return result.success;
  }

  async function revealCode() {
    if (!(await authenticateIfAvailable())) return;
    setRecoveryCode((await getBackupRecoveryCode()) ?? (await ensureBackupRecoveryCode()));
  }

  async function configureAutomatic() {
    setBusy('folder');
    try {
      const directoryUri = await chooseAutomaticBackupDirectory();
      const code = await ensureBackupRecoveryCode();
      setRecoveryCode(code);
      await writeAutomaticEncryptedBackup(directoryUri);
      await spark.updateSetting('automaticBackupDirectoryUri', directoryUri);
      await spark.updateSetting('automaticBackupEnabled', true);
      await spark.updateSetting('lastAutomaticBackupAt', new Date().toISOString());
      Alert.alert(
        'Automatic encrypted backups are on',
        'Write down or share the recovery code shown on this screen. Spark cannot recover it from a server.'
      );
    } catch (error) {
      Alert.alert(
        'Could not configure the folder',
        error instanceof Error ? error.message : 'Try again.'
      );
    } finally {
      setBusy(null);
    }
  }

  async function restore() {
    if (!secret.trim()) {
      Alert.alert('Enter the key first', 'Use the backup password or generated recovery code.');
      return;
    }
    setBusy('restore');
    try {
      const preview = await pickEncryptedBackupForPreview(secret);
      if (!preview) return;
      Alert.alert(
        `Restore ${preview.fileName}?`,
        [
          `${preview.counts.habits} habits`,
          `${preview.counts.completions} completions`,
          `${preview.counts.focusSessions} focus sessions`,
          `${preview.counts.captureItems} captured thoughts`,
          `${preview.counts.routines} routines`,
          '',
          'Spark will make a local safety copy before replacing current data.'
        ].join('\n'),
        [
          { text: 'Keep current data', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () =>
              void restoreBackup(preview)
                .then(() => spark.refresh())
                .then(() => Alert.alert('Restored', 'The encrypted backup is ready.'))
                .catch((reason: unknown) =>
                  Alert.alert(
                    'Could not restore',
                    reason instanceof Error ? reason.message : 'Try again.'
                  )
                )
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Could not unlock backup',
        error instanceof Error ? error.message : 'Try again.'
      );
    } finally {
      setBusy(null);
    }
  }

  async function rotateCode() {
    Alert.alert(
      'Create a new recovery code?',
      'New automatic backups will use the new code. Existing encrypted backups still require the old code.',
      [
        { text: 'Keep current code', style: 'cancel' },
        {
          text: 'Create new code',
          style: 'destructive',
          onPress: () => void rotateBackupRecoveryCode().then(setRecoveryCode)
        }
      ]
    );
  }

  return (
    <Screen>
      <View>
        <Eyebrow>No-account recovery</Eyebrow>
        <H1>Encrypted files you control.</H1>
        <Muted>
          Backups use AES-256-GCM with a password-derived key. Spark does not upload the file or
          know the password.
        </Muted>
      </View>

      <Card>
        <SectionHeading>Manual encrypted backup</SectionHeading>
        <FormField
          label="Backup password or recovery code"
          hint="At least 10 characters. It is never stored for manual exports."
          value={secret}
          onChangeText={setSecret}
          secureTextEntry
          autoCapitalize="none"
          maxLength={200}
        />
        <Button
          label="Export encrypted backup"
          loading={busy === 'export'}
          disabled={secret.trim().length < 10}
          onPress={() => {
            setBusy('export');
            void shareEncryptedBackup(secret)
              .catch((error: unknown) =>
                Alert.alert(
                  'Could not export',
                  error instanceof Error ? error.message : 'Try again.'
                )
              )
              .finally(() => setBusy(null));
          }}
        />
        <Button
          label="Restore encrypted backup"
          variant="secondary"
          loading={busy === 'restore'}
          onPress={() => void restore()}
        />
      </Card>

      <Card>
        <SectionHeading>Automatic Android folder backup</SectionHeading>
        <Muted>
          Once per day when Spark is opened and changed, write an encrypted file to a folder you
          explicitly choose. No broad storage permission and no cloud account are required.
        </Muted>
        <Muted>
          Status: {spark.settings.automaticBackupEnabled ? 'on' : 'off'}
          {spark.settings.lastAutomaticBackupAt
            ? ` · last ${new Date(spark.settings.lastAutomaticBackupAt).toLocaleString()}`
            : ''}
        </Muted>
        {spark.settings.automaticBackupEnabled &&
        spark.settings.automaticBackupDirectoryUri ? (
          <>
            <Button
              label="Back up now"
              variant="secondary"
              onPress={() => {
                setBusy('now');
                void writeAutomaticEncryptedBackup(
                  spark.settings.automaticBackupDirectoryUri!
                )
                  .then(() =>
                    spark.updateSetting('lastAutomaticBackupAt', new Date().toISOString())
                  )
                  .then(() => Alert.alert('Backup written', 'The encrypted file is in your chosen folder.'))
                  .catch((error: unknown) =>
                    Alert.alert(
                      'Could not write backup',
                      error instanceof Error ? error.message : 'Choose the folder again.'
                    )
                  )
                  .finally(() => setBusy(null));
              }}
              loading={busy === 'now'}
            />
            <Button
              label="Choose a different folder"
              variant="ghost"
              onPress={() => void configureAutomatic()}
            />
            <Button
              label="Turn automatic backups off"
              variant="ghost"
              onPress={() => void spark.updateSetting('automaticBackupEnabled', false)}
            />
          </>
        ) : (
          <Button
            label="Choose folder and turn on"
            loading={busy === 'folder'}
            onPress={() => void configureAutomatic()}
          />
        )}
      </Card>

      <Card style={{ borderColor: theme.purple }}>
        <SectionHeading>Recovery code</SectionHeading>
        <Muted>
          The generated code is kept in device secure storage and is not backed up to Spark’s
          servers. Keep a copy somewhere you trust.
        </Muted>
        {recoveryCode ? (
          <>
            <Text selectable style={[styles.code, { color: theme.text }]}>
              {recoveryCode}
            </Text>
            <Button
              label="Share or print recovery code"
              variant="secondary"
              onPress={() =>
                void Share.share({
                  title: 'Spark backup recovery code',
                  message: `Spark backup recovery code:\n${recoveryCode}\n\nKeep this private. Spark cannot recover it for you.`
                })
              }
            />
            <Button label="Hide code" variant="ghost" onPress={() => setRecoveryCode(null)} />
            <Button label="Rotate recovery code" variant="ghost" onPress={() => void rotateCode()} />
          </>
        ) : (
          <Button label="Reveal or create recovery code" onPress={() => void revealCode()} />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: 1.3,
    textAlign: 'center'
  }
});
