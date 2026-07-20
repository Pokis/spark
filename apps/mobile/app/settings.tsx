import * as LocalAuthentication from 'expo-local-authentication';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { CollapsibleSection } from '../src/components/CollapsibleSection';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { SettingRow } from '../src/components/SettingRow';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import { getDatabaseSecurityStatus } from '../src/data/database';
import { supportedLocales, useI18n } from '../src/i18n';
import { endOfToday, isQuietNow } from '../src/lib/sensory';
import { deleteCloudIdentity } from '../src/services/api';
import { pickBackupForPreview, restoreBackup, shareBackup, sharePortableCsv } from '../src/services/backup';
import { cloudConfigured } from '../src/services/cloudConfig';
import { creatorTipLinkEnabled, openCreatorTipLink } from '../src/services/creatorSupport';
import { requestNotificationPermission } from '../src/services/notifications';
import { useSpark } from '../src/state/SparkProvider';

const featureKeys = [
  'actionSizesEnabled', 'adaptiveSuggestionsEnabled', 'focusToolEnabled',
  'captureToolEnabled', 'routinesEnabled', 'streaksEnabled',
  'planningToolsEnabled', 'showRewards', 'insightsEnabled'
] as const;

export default function SettingsScreen() {
  const spark = useSpark();
  const { t } = useI18n();
  const cloudAvailable = cloudConfigured();
  const supportAvailable = cloudAvailable && spark.remoteConfig.defaults.supportEnabled;
  const [storageStatus, setStorageStatus] = useState('Checking local storage…');
  const enabledFeatures = featureKeys.filter((key) => Boolean(spark.settings[key])).length;

  useEffect(() => {
    void getDatabaseSecurityStatus()
      .then((status) => setStorageStatus(
        status.encrypted && status.integrity === 'ok'
          ? 'Encrypted local storage check passed.'
          : status.expoGoPreview
            ? 'Expo Go cannot verify encryption; installed builds can.'
            : status.integrityMessage
      ))
      .catch((reason: unknown) => setStorageStatus(reason instanceof Error ? reason.message : 'Storage check failed.'));
  }, []);

  async function toggleNotifications(value: boolean) {
    if (!value) {
      await spark.updateSetting('notificationsEnabled', false);
      return;
    }
    if (await requestNotificationPermission()) {
      await spark.updateSetting('notificationsEnabled', true);
    } else {
      Alert.alert('Notifications stayed off', 'You can enable them later in device settings.');
    }
  }

  async function toggleAppLock(value: boolean) {
    if (!value) {
      await spark.updateSetting('appLockEnabled', false);
      return;
    }
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) {
      Alert.alert('Set up device security first', 'Add a PIN, fingerprint, or supported face unlock in device settings.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Turn on Spark app lock', disableDeviceFallback: false });
    if (result.success) await spark.updateSetting('appLockEnabled', true);
  }

  async function restore() {
    try {
      const preview = await pickBackupForPreview();
      if (!preview) return;
      Alert.alert(
        `Restore ${preview.fileName}?`,
        `This backup contains ${preview.counts.habits} habits and ${preview.counts.completions} completions. It will replace current local data after creating a safety copy.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => void restoreBackup(preview).then(() => spark.refresh()).then(() => Alert.alert('Restored', 'The backup is ready.')).catch((error: unknown) => Alert.alert('Could not restore', error instanceof Error ? error.message : 'Try again.'))
          }
        ]
      );
    } catch (error) {
      Alert.alert('Could not inspect backup', error instanceof Error ? error.message : 'Try again.');
    }
  }

  function deleteCloudData() {
    Alert.alert('Delete optional online data?', 'Local habits and completions will remain on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete online data',
        style: 'destructive',
        onPress: () => void deleteCloudIdentity().then(() => spark.updateSetting('cloudSupportEnabled', false)).then(() => Alert.alert('Deleted', 'Local data is unchanged.')).catch((error: unknown) => Alert.alert('Could not delete', error instanceof Error ? error.message : 'Try again.'))
      }
    ]);
  }

  return (
    <Screen testID="settings-screen">
      <View>
        <Eyebrow>App controls</Eyebrow>
        <H1>{t('settings')}</H1>
      </View>

      <Card style={styles.featureCard}>
        <View style={styles.featureText}>
          <SectionHeading>Optional features</SectionHeading>
          <Muted>{enabledFeatures ? `${enabledFeatures} enabled` : 'None enabled · habit tracking stays simple'}</Muted>
        </View>
        <Body>Choose whether Focus, Capture, routines, streaks, points, and other extras appear.</Body>
        <Button label="Choose optional features" variant="secondary" onPress={() => router.push('/features' as Href)} />
      </Card>

      <CollapsibleSection title="Reminders" summary={spark.settings.notificationsEnabled ? 'On' : 'Off'}>
        <SettingRow title="Habit reminders" description="Private notifications scheduled on this device." value={spark.settings.notificationsEnabled} onValueChange={(value) => void toggleNotifications(value)} />
        {spark.settings.notificationsEnabled ? (
          <>
            <Muted>Lock-screen detail</Muted>
            <View style={styles.choices}>
              {([['full', 'Habit name'], ['private', 'Generic text'], ['secret', 'Hidden']] as const).map(([value, label]) => <Chip key={value} label={label} selected={spark.settings.notificationPrivacy === value} onPress={() => void spark.updateSetting('notificationPrivacy', value)} />)}
            </View>
            <Muted>Maximum reminders per day</Muted>
            <View style={styles.choices}>{[1, 2, 3, 4].map((value) => <Chip key={value} label={String(value)} selected={spark.settings.notificationCap === value} onPress={() => void spark.updateSetting('notificationCap', value)} />)}</View>
          </>
        ) : null}
      </CollapsibleSection>

      <CollapsibleSection title="Comfort & accessibility" summary={isQuietNow(spark.settings) ? 'Quiet for today' : 'Sound, motion, haptics, and contrast'}>
        <SettingRow title="Quiet for today" description="Turn off haptics, animation, sound, and celebration overlays until tomorrow." value={isQuietNow(spark.settings)} onValueChange={(value) => void spark.updateSetting('quietUntil', value ? endOfToday() : null)} />
        <SettingRow title="Haptics" description="A short tactile response after completion." value={spark.settings.hapticsEnabled} onValueChange={(value) => void spark.updateSetting('hapticsEnabled', value)} />
        <SettingRow title="Reduce motion" description="Use restrained transitions and effects." value={spark.settings.reducedMotion} onValueChange={(value) => void spark.updateSetting('reducedMotion', value)} />
        <SettingRow title="High contrast" description="Use stronger borders and text contrast." value={spark.settings.highContrast} onValueChange={(value) => void spark.updateSetting('highContrast', value)} />
        <Muted>Completion feedback</Muted>
        <View style={styles.choices}>{(['calm', 'balanced', 'celebratory'] as const).map((value) => <Chip key={value} label={value[0]!.toUpperCase() + value.slice(1)} selected={spark.settings.sensoryProfile === value} onPress={() => void spark.updateSetting('sensoryProfile', value)} />)}</View>
      </CollapsibleSection>

      <CollapsibleSection title="Name & language" summary={supportedLocales.find((locale) => locale.code === spark.settings.language)?.label ?? 'System language'}>
        <FormField label="Name used in the app" placeholder="Optional" value={spark.settings.displayName} onChangeText={(value) => void spark.updateSetting('displayName', value)} maxLength={40} />
        <Muted>{t('languageCoverage')}</Muted>
        <View style={styles.choices}>{supportedLocales.map((locale) => <Chip key={locale.code} label={locale.label} selected={spark.settings.language === locale.code} onPress={() => void spark.updateSetting('language', locale.code)} />)}</View>
      </CollapsibleSection>

      {spark.settings.planningToolsEnabled || spark.settings.routinesEnabled ? (
        <CollapsibleSection title="Enabled planning tools" summary="Open the extras you chose">
          {spark.settings.routinesEnabled ? <Button label="Create a routine" variant="secondary" onPress={() => router.push('/routine/new')} /> : null}
          {spark.settings.planningToolsEnabled ? (
            <>
              <Button label="Plan my week" variant="secondary" onPress={() => router.push('/weekly-reset')} />
              <Button label="Help me leave on time" variant="secondary" onPress={() => router.push('/departure')} />
              <Button label="Try a change for a week" variant="secondary" onPress={() => router.push('/experiments')} />
              <Button label="Share selected completions" variant="ghost" onPress={() => router.push('/share-progress')} />
            </>
          ) : null}
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection title="Data & privacy" summary="Backups, app lock, and local storage">
        <Muted>{storageStatus}</Muted>
        <Button label="Export encrypted backup" variant="secondary" onPress={() => void shareBackup().catch((error: unknown) => Alert.alert('Could not export', error instanceof Error ? error.message : 'Try again.'))} />
        <Button label="Export readable CSV" variant="secondary" onPress={() => void sharePortableCsv().catch((error: unknown) => Alert.alert('Could not export', error instanceof Error ? error.message : 'Try again.'))} />
        <Button label="Restore a backup" variant="secondary" onPress={() => void restore()} />
        <Button label="Automatic encrypted backups" variant="ghost" onPress={() => router.push('/encrypted-backups')} />
        <SettingRow title="App lock" description="Require device authentication after leaving Spark." value={spark.settings.appLockEnabled} onValueChange={(value) => void toggleAppLock(value)} />
        <SettingRow title="Hide app preview" description="Protect the app-switcher preview; Android also blocks screenshots." value={spark.settings.hideSensitiveAppPreview} onValueChange={(value) => void spark.updateSetting('hideSensitiveAppPreview', value)} />
        <Button label="Plain-language privacy details" variant="ghost" onPress={() => router.push('/privacy')} />
      </CollapsibleSection>

      <CollapsibleSection title="Help & support" summary="Guides, diagnostics, and optional online support">
        <Button label="Feature tutorials" variant="secondary" onPress={() => router.push('/tutorials')} />
        <Button label="Check for technical problems" variant="ghost" onPress={() => router.push('/diagnostics')} />
        <SettingRow
          title="Allow optional online support"
          description={cloudAvailable ? 'Creates a private support identity only when needed. Habit data is never uploaded.' : 'Not configured in this build.'}
          value={spark.settings.cloudSupportEnabled}
          onValueChange={(value) => void spark.updateSetting('cloudSupportEnabled', value)}
        />
        <Button label="Contact support" variant="secondary" disabled={!supportAvailable || !spark.settings.cloudSupportEnabled} onPress={() => router.push('/support')} />
        {cloudAvailable ? <Button label="Delete optional online data" variant="danger" onPress={deleteCloudData} /> : null}
        <Button label={spark.entitlement.premium ? 'Premium active' : 'Premium options'} variant="ghost" onPress={() => router.push('/paywall')} />
      </CollapsibleSection>

      {creatorTipLinkEnabled() ? (
        <View style={styles.creatorSupport}>
          <Button label="Support the creator with a coffee ↗" variant="ghost" onPress={() => void openCreatorTipLink().catch(() => Alert.alert('Could not open the page', 'Try again later.'))} />
        </View>
      ) : null}
      <Muted>Version 0.1.0 · habit data stays on this device</Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  featureCard: { gap: 9 },
  featureText: { gap: 2 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  creatorSupport: { alignItems: 'center', paddingVertical: 4 }
});
