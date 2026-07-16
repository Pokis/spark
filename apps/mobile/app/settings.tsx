import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Chip } from '../src/components/Chip';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { SettingRow } from '../src/components/SettingRow';
import { SparkBurst } from '../src/components/SparkBurst';
import { Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import {
  pickBackupForPreview,
  restoreBackup,
  shareBackup,
  sharePortableCsv,
  clearRestoreSafetyCopies,
  listRestoreSafetyCopies
} from '../src/services/backup';
import { cloudConfigured } from '../src/services/cloudConfig';
import { deleteCloudIdentity } from '../src/services/api';
import {
  clearDatabaseSafetyCopies,
  getDatabaseSecurityStatus,
  listDatabaseSafetyCopies
} from '../src/data/database';
import { clearDiagnostics, shareDiagnostics } from '../src/services/diagnostics';
import { requestNotificationPermission } from '../src/services/notifications';
import { useSpark } from '../src/state/SparkProvider';
import { useTheme } from '../src/theme';

export default function SettingsScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const cloudAvailable = cloudConfigured();
  const supportAvailable = cloudAvailable && spark.remoteConfig.defaults.supportEnabled;
  const [storageStatus, setStorageStatus] = useState('Checking local storage…');
  const [safetyCopies, setSafetyCopies] = useState(0);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    void Promise.all([
      getDatabaseSecurityStatus(),
      listDatabaseSafetyCopies(),
      listRestoreSafetyCopies()
    ])
      .then(([status, databaseCopies, restoreCopies]) => {
        setStorageStatus(
          status.encrypted
            ? `Encrypted with SQLCipher ${status.cipherVersion ?? ''}. Database check: ${
                status.integrity === 'ok' ? 'healthy' : status.integrityMessage
              }`.trim()
            : status.expoGoPreview
              ? 'Expo Go preview: local database is not encrypted'
              : 'Encryption could not be verified'
        );
        setSafetyCopies(databaseCopies.length + restoreCopies.length);
      })
      .catch((reason: unknown) =>
        setStorageStatus(reason instanceof Error ? reason.message : 'Storage check failed')
      );
  }, []);

  async function toggleNotifications(value: boolean) {
    if (!value) {
      await spark.updateSetting('notificationsEnabled', false);
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert(
        'Notifications stayed off',
        'Spark respects that choice. You can enable them later in system settings.'
      );
      return;
    }
    await spark.updateSetting('notificationsEnabled', true);
  }

  async function restore() {
    try {
      const preview = await pickBackupForPreview();
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
          'Spark will first save an automatic safety copy, then replace current local data.'
        ].join('\n'),
        [
          { text: 'Keep current data', style: 'cancel' },
          {
            text: 'Restore backup',
             style: 'destructive',
             onPress: () =>
               void restoreBackup(preview)
                .then(async (safetyCopy) => {
                  await spark.refresh();
                  return safetyCopy;
                })
                .then((safetyCopy) =>
                  Alert.alert(
                    'Restored',
                    safetyCopy
                      ? 'Your backup is ready. Spark also kept a private pre-restore safety copy in app storage.'
                      : 'Your backup is ready.'
                  )
                )
                .catch((error: unknown) =>
                  Alert.alert(
                    'Could not restore',
                    error instanceof Error ? error.message : 'Try again.'
                  )
                )
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Could not inspect backup',
        error instanceof Error ? error.message : 'Try again.'
      );
    }
  }

  function deleteCloudData() {
    Alert.alert(
      'Delete optional cloud data?',
      'This removes your support conversations, cloud entitlement record, and random support identity. Records that must be retained for fraud or legal reasons are disconnected from that identity. Local habits and backups are unchanged.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete cloud data',
          style: 'destructive',
          onPress: () =>
            void deleteCloudIdentity()
              .then(() => spark.updateSetting('cloudSupportEnabled', false))
              .then(() => Alert.alert('Cloud data deleted', 'Your local Spark data is unchanged.'))
              .catch((error: unknown) =>
                Alert.alert('Could not delete', error instanceof Error ? error.message : 'Try again.')
              )
        }
      ]
    );
  }

  function clearSafetyCopies() {
    Alert.alert(
      'Delete automatic safety copies?',
      'This removes bounded pre-migration and pre-restore copies. Your current data and exported backups are unchanged.',
      [
        { text: 'Keep them', style: 'cancel' },
        {
          text: 'Delete copies',
          style: 'destructive',
          onPress: () =>
            void Promise.all([
              clearDatabaseSafetyCopies(),
              clearRestoreSafetyCopies()
            ])
              .then(() => setSafetyCopies(0))
              .catch((error: unknown) =>
                Alert.alert(
                  'Could not delete safety copies',
                  error instanceof Error ? error.message : 'Try again.'
                )
              )
        }
      ]
    );
  }

  async function previewFeedback() {
    setPreview(true);
    if (!spark.settings.hapticsEnabled) return;
    try {
      if (spark.settings.sensoryProfile === 'calm') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      // Visual preview remains available when the device has no haptic engine.
    }
  }

  return (
    <>
    <Screen>
      <View>
        <Eyebrow>Make Spark yours</Eyebrow>
        <H1>Settings</H1>
      </View>

      <Card>
        <SectionHeading>You</SectionHeading>
        <FormField
          label="Name Spark can use"
          placeholder="Optional"
          value={spark.settings.displayName}
          onChangeText={(value) => void spark.updateSetting('displayName', value)}
          maxLength={40}
        />
      </Card>

      <Card>
        <SectionHeading>Sensory comfort</SectionHeading>
        <Muted>Choose how much celebration Spark uses. All modes keep rewards predictable.</Muted>
        <View style={styles.choiceRow}>
          {(['calm', 'balanced', 'celebratory'] as const).map((value) => (
            <Chip
              key={value}
              label={value[0]!.toUpperCase() + value.slice(1)}
              selected={spark.settings.sensoryProfile === value}
              onPress={() => void spark.updateSetting('sensoryProfile', value)}
            />
          ))}
        </View>
        <SettingRow
          title="Haptic celebration"
          description="A short tactile response after a win."
          value={spark.settings.hapticsEnabled}
          onValueChange={(value) => void spark.updateSetting('hapticsEnabled', value)}
        />
        <SettingRow
          title="Reduce motion"
          description="Keeps celebrations calm and avoids pulsing movement."
          value={spark.settings.reducedMotion}
          onValueChange={(value) => void spark.updateSetting('reducedMotion', value)}
        />
        <SettingRow
          title="High contrast"
          description="Uses stronger borders and text contrast throughout Spark."
          value={spark.settings.highContrast}
          onValueChange={(value) => void spark.updateSetting('highContrast', value)}
        />
        <Button
          label="Preview feedback"
          variant="secondary"
          onPress={() => void previewFeedback()}
        />
      </Card>

      <Card>
        <SectionHeading>Cognitive load</SectionHeading>
        <SettingRow
          title="Remember context by time of day"
          description="Stores morning, afternoon, and evening context preferences only on this device."
          value={spark.settings.rememberContextByTime}
          onValueChange={(value) => void spark.updateSetting('rememberContextByTime', value)}
        />
        <SettingRow
          title="Supportive observations"
          description="Derives neutral patterns from local completions and focus sessions."
          value={spark.settings.insightsEnabled}
          onValueChange={(value) => void spark.updateSetting('insightsEnabled', value)}
        />
        {spark.settings.hiddenInsightIds.length ? (
          <Button
            label={`Restore ${spark.settings.hiddenInsightIds.length} hidden observation${
              spark.settings.hiddenInsightIds.length === 1 ? '' : 's'
            }`}
            variant="ghost"
            onPress={() => void spark.updateSetting('hiddenInsightIds', [])}
          />
        ) : null}
        <SettingRow
          title="Minimum viable day"
          description="Today shows one deliberately tiny next action instead of a list."
          value={spark.settings.minimumViableDay}
          onValueChange={(value) => void spark.updateSetting('minimumViableDay', value)}
        />
        <SettingRow
          title="Five-second launch runway"
          description="Focus sessions can count down gently, with a clear Not yet button."
          value={spark.settings.launchCountdownEnabled}
          onValueChange={(value) =>
            void spark.updateSetting('launchCountdownEnabled', value)
          }
        />
        <SettingRow
          title="Transition nudges"
          description="After focus, Spark asks for the next tiny move without requiring one."
          value={spark.settings.transitionNudgesEnabled}
          onValueChange={(value) =>
            void spark.updateSetting('transitionNudgesEnabled', value)
          }
        />
        <SettingRow
          title="Show Spark points"
          description="Hide levels and point totals if they feel like pressure."
          value={spark.settings.showRewards}
          onValueChange={(value) => void spark.updateSetting('showRewards', value)}
        />
        <SettingRow
          title="Show rhythm percentages"
          description="Turn percentages off and keep qualitative progress language."
          value={spark.settings.showRhythmPercentages}
          onValueChange={(value) => void spark.updateSetting('showRhythmPercentages', value)}
        />
      </Card>

      <Card>
        <SectionHeading>Gentle reminders</SectionHeading>
        <SettingRow
          title="Local notifications"
          description="Scheduled on this device. Spark does not need a server to remind you."
          value={spark.settings.notificationsEnabled}
          onValueChange={(value) => void toggleNotifications(value)}
        />
        <SettingRow
          title="Quiet repeatedly ignored reminders"
          description="After three unanswered invitations, pause that habit’s reminders for three days. Habit progress is unchanged."
          value={spark.settings.autoQuietReminders}
          onValueChange={(value) =>
            void spark.updateSetting('autoQuietReminders', value)
          }
        />
        <Muted>
          Spark schedules at most {spark.settings.notificationCap} habit reminders and prioritizes
          the habits you marked important.
        </Muted>
        <Muted>Snooze length</Muted>
        <View style={styles.choiceRow}>
          {[5, 15, 30, 60].map((value) => (
            <Chip
              key={value}
              label={`${value} min`}
              selected={spark.settings.reminderSnoozeMinutes === value}
              onPress={() => void spark.updateSetting('reminderSnoozeMinutes', value)}
            />
          ))}
        </View>
        <View style={styles.capRow}>
          {[1, 2, 3, 4].map((value) => (
            <Button
              key={value}
              label={String(value)}
              variant={spark.settings.notificationCap === value ? 'primary' : 'secondary'}
              onPress={() => void spark.updateSetting('notificationCap', value)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeading>Backup without an account</SectionHeading>
        <Muted>
          Export a readable JSON backup to a folder you choose. Spark never uploads it for you.
          Treat the file as private because its contents are not separately encrypted.
        </Muted>
        <Button
          label="Export local backup"
          variant="secondary"
          icon={<Ionicons name="share-outline" size={19} color={theme.text} />}
          onPress={() =>
            void shareBackup().catch((error: unknown) =>
              Alert.alert('Could not export', error instanceof Error ? error.message : 'Try again.')
            )
          }
        />
        <Button
          label="Export portable CSV"
          variant="secondary"
          onPress={() =>
            void sharePortableCsv().catch((error: unknown) =>
              Alert.alert(
                'Could not export CSV',
                error instanceof Error ? error.message : 'Try again.'
              )
            )
          }
        />
        <Button label="Restore a backup" variant="ghost" onPress={() => void restore()} />
        <Muted>
          Spark keeps at most three pre-migration database copies and three pre-restore JSON
          copies. Current automatic safety copies: {safetyCopies}.
        </Muted>
        {safetyCopies ? (
          <Button label="Delete automatic safety copies" variant="ghost" onPress={clearSafetyCopies} />
        ) : null}
      </Card>

      <Card>
        <SectionHeading>Optional cloud features</SectionHeading>
        <SettingRow
          title="Private support identity"
          description={
            cloudAvailable
              ? 'Creates a random Firebase identity only when support or purchases are used.'
              : 'Not configured in this build; the offline app is unaffected.'
          }
          value={spark.settings.cloudSupportEnabled}
          onValueChange={(value) => void spark.updateSetting('cloudSupportEnabled', value)}
        />
        <Button
          label="Contact support"
          variant="secondary"
          disabled={!supportAvailable}
          onPress={() => router.push('/support')}
        />
        {cloudAvailable && !supportAvailable ? (
          <Muted>Support is currently paused by the app owner.</Muted>
        ) : null}
        {cloudAvailable ? (
          <Button label="Delete optional cloud data" variant="danger" onPress={deleteCloudData} />
        ) : null}
      </Card>

      <Card>
        <SectionHeading>Support Spark, never unlock basic functioning</SectionHeading>
        <Muted>
          Habits, focus, capture, reminders, and local backups remain free. Premium is for
          supporter cosmetics and comfort options.
        </Muted>
        <SettingRow
          title={spark.entitlement.premium ? 'Premium active' : 'Spark premium'}
          description={
            spark.entitlement.premium
              ? `Granted through ${spark.entitlement.source}`
              : 'Lifetime purchase, official promo code, or a staff grant.'
          }
          onPress={() => router.push('/paywall')}
        />
        {spark.entitlement.premium ? (
          <>
            <SettingRow
              title="Supporter theme"
              description="Cosmetic accent themes; all core tools stay free."
              value={spark.settings.supporterThemeEnabled}
              onValueChange={(value) => void spark.updateSetting('supporterThemeEnabled', value)}
            />
            {spark.settings.supporterThemeEnabled ? (
              <>
                <Muted>Theme</Muted>
                <View style={styles.choiceRow}>
                  {(['aurora', 'ocean', 'forest'] as const).map((value) => (
                    <Chip
                      key={value}
                      label={value[0]!.toUpperCase() + value.slice(1)}
                      selected={spark.settings.supporterTheme === value}
                      onPress={() => void spark.updateSetting('supporterTheme', value)}
                    />
                  ))}
                </View>
              </>
            ) : null}
            <SettingRow
              title="Show supporter badge"
              description="Controls the small supporter label on Today."
              value={spark.settings.supporterBadgeVisible}
              onValueChange={(value) => void spark.updateSetting('supporterBadgeVisible', value)}
            />
            <Muted>Body-double companion</Muted>
            <View style={styles.choiceRow}>
              {(['spark', 'owl', 'cloud'] as const).map((value) => (
                <Chip
                  key={value}
                  label={value[0]!.toUpperCase() + value.slice(1)}
                  selected={spark.settings.companionStyle === value}
                  onPress={() => void spark.updateSetting('companionStyle', value)}
                />
              ))}
            </View>
            <Muted>Celebration style</Muted>
            <View style={styles.choiceRow}>
              {(['burst', 'ripple', 'confetti'] as const).map((value) => (
                <Chip
                  key={value}
                  label={value[0]!.toUpperCase() + value.slice(1)}
                  selected={spark.settings.celebrationStyle === value}
                  onPress={() => void spark.updateSetting('celebrationStyle', value)}
                />
              ))}
            </View>
            <SettingRow
              title="Offline soundscape"
              description="A generated local loop with no streaming, account, tracking, or recurring cost."
              value={spark.settings.soundscapeEnabled}
              onValueChange={(value) => void spark.updateSetting('soundscapeEnabled', value)}
            />
            {spark.settings.soundscapeEnabled ? (
              <>
                <View style={styles.choiceRow}>
                  {(['brown', 'pink', 'soft'] as const).map((value) => (
                    <Chip
                      key={value}
                      label={`${value[0]!.toUpperCase() + value.slice(1)} sound`}
                      selected={spark.settings.soundscapeKind === value}
                      onPress={() => void spark.updateSetting('soundscapeKind', value)}
                    />
                  ))}
                </View>
                <Muted>Soundscape volume</Muted>
                <View style={styles.choiceRow}>
                  {[0.1, 0.25, 0.5, 0.75].map((value) => (
                    <Chip
                      key={value}
                      label={`${Math.round(value * 100)}%`}
                      selected={spark.settings.soundscapeVolume === value}
                      onPress={() => void spark.updateSetting('soundscapeVolume', value)}
                    />
                  ))}
                </View>
              </>
            ) : null}
            <Muted>App icon treatment</Muted>
            <View style={styles.choiceRow}>
              {(['classic', 'calm', 'midnight'] as const).map((value) => (
                <Chip
                  key={value}
                  label={value[0]!.toUpperCase() + value.slice(1)}
                  selected={spark.settings.appIconStyle === value}
                  onPress={() => void spark.updateSetting('appIconStyle', value)}
                />
              ))}
            </View>
            <Muted>
              Icon treatment is reflected inside Spark and its widgets. Android launcher icon
              variants remain a build-time release choice so Spark does not add a fragile native
              alias permission.
            </Muted>
          </>
        ) : null}
      </Card>

      <Card>
        <SectionHeading>Trust</SectionHeading>
        <SettingRow title="Privacy and data map" onPress={() => router.push('/privacy')} />
        <Muted>{storageStatus}</Muted>
        <Button
          label="Export privacy-safe diagnostics"
          variant="secondary"
          onPress={() =>
            void shareDiagnostics().catch((error: unknown) =>
              Alert.alert(
                'Could not export diagnostics',
                error instanceof Error ? error.message : 'Try again.'
              )
            )
          }
        />
        <Button
          label="Clear diagnostic history"
          variant="ghost"
          onPress={() =>
            Alert.alert(
              'Clear diagnostic history?',
              'This removes local error messages Spark kept for troubleshooting.',
              [
                { text: 'Keep it', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => void clearDiagnostics()
                }
              ]
            )
          }
        />
        <Muted>Version 0.1.0 · Android first, iPhone compatible</Muted>
      </Card>
    </Screen>
    <SparkBurst
      visible={preview}
      title="Preview win"
      reward={2}
      reducedMotion={spark.settings.reducedMotion}
      sensoryProfile={spark.settings.sensoryProfile}
      celebrationStyle={spark.entitlement.premium ? spark.settings.celebrationStyle : 'burst'}
      showReward={spark.settings.showRewards}
      onDismiss={() => setPreview(false)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  capRow: { flexDirection: 'row', gap: 8 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
});
