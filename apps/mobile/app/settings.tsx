import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { CollapsibleSection } from '../src/components/CollapsibleSection';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { SettingRow } from '../src/components/SettingRow';
import { SparkBurst } from '../src/components/SparkBurst';
import { Eyebrow, H1, Muted } from '../src/components/Typography';
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
import { supportedLocales } from '../src/i18n';
import { endOfToday, isQuietNow } from '../src/lib/sensory';
import {
  creatorTipLinkEnabled,
  openCreatorTipLink
} from '../src/services/creatorSupport';

export default function SettingsScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const cloudAvailable = cloudConfigured();
  const supportAvailable = cloudAvailable && spark.remoteConfig.defaults.supportEnabled;
  const creatorTipAvailable = creatorTipLinkEnabled();
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
            ? status.integrity === 'ok'
              ? 'Your local data is encrypted and the storage check passed.'
              : `Your local data is encrypted, but the storage check needs attention: ${status.integrityMessage}`
            : status.expoGoPreview
              ? 'This Expo Go preview cannot verify encrypted storage. Installed test and release builds can.'
              : 'Spark could not verify local storage encryption.'
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

  async function toggleAppLock(value: boolean) {
    if (!value) {
      await spark.updateSetting('appLockEnabled', false);
      return;
    }
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hardware || !enrolled) {
      Alert.alert(
        'Set up device authentication first',
        'Add a device PIN, fingerprint, or supported face unlock in Android or iPhone settings.'
      );
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Turn on Spark app lock',
      disableDeviceFallback: false,
      fallbackLabel: 'Use device passcode'
    });
    if (result.success) await spark.updateSetting('appLockEnabled', true);
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
    if (!spark.settings.hapticsEnabled || isQuietNow(spark.settings)) return;
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

      <CollapsibleSection
        title="Help & learning"
        summary="Understand Spark or learn one feature at a time"
      >
        <SettingRow
          title="How Spark works"
          description="A short explanation of habits, action sizes, completed actions, and points."
          onPress={() => router.push('/guide')}
        />
        <SettingRow
          title="Learn each feature"
          description="Short guides you can close, dismiss, or replay whenever you want."
          onPress={() => router.push('/tutorials')}
        />
        <SettingRow
          title="Help me choose right now"
          description="Get one practical suggestion when starting feels difficult."
          onPress={() => router.push('/help')}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Profile"
        summary={spark.settings.displayName ? `Spark calls you ${spark.settings.displayName}` : 'Name is optional'}
      >
        <FormField
          label="Name Spark can use"
          placeholder="Optional"
          value={spark.settings.displayName}
          onChangeText={(value) => void spark.updateSetting('displayName', value)}
          maxLength={40}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Language"
        summary={supportedLocales.find((locale) => locale.code === spark.settings.language)?.label ?? 'Use device language'}
      >
        <Muted>
          Navigation and the main support tools use your chosen language. Some longer screens
          are still shown in English.
        </Muted>
        <View style={styles.choiceRow}>
          {supportedLocales.map((locale) => (
            <Chip
              key={locale.code}
              label={locale.label}
              selected={spark.settings.language === locale.code}
              onPress={() => void spark.updateSetting('language', locale.code)}
            />
          ))}
        </View>
      </CollapsibleSection>

      <CollapsibleSection
        title="Sound, motion & feedback"
        summary={`${spark.settings.sensoryProfile} feedback${isQuietNow(spark.settings) ? ' · quiet today' : ''}`}
      >
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
          title={isQuietNow(spark.settings) ? 'Quiet now is on' : 'Quiet now for today'}
          description="One switch disables haptics, soundscapes, animations, and reward celebrations until tomorrow."
          value={isQuietNow(spark.settings)}
          onValueChange={(value) =>
            void spark.updateSetting('quietUntil', value ? endOfToday() : null)
          }
        />
        <SettingRow
          title="Reduce motion"
          description="Uses fades and restrained celebration effects instead of pulsing movement."
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Keep the app simple"
        summary={spark.settings.simpleMode ? 'Shorter Today screen is on' : 'Control prompts, suggestions, and progress details'}
      >
        <SettingRow
          title="Simple mode"
          description="Keep Today to one action plus Quick Capture, Focus, and a running routine; hide Progress from the tab bar."
          value={spark.settings.simpleMode}
          onValueChange={(value) => void spark.updateSetting('simpleMode', value)}
        />
        <SettingRow
          title="Show help prompts"
          description="Show a Help me now option with practical starting and choosing tools."
          value={spark.settings.progressiveHelpEnabled}
          onValueChange={(value) =>
            void spark.updateSetting('progressiveHelpEnabled', value)
          }
        />
        <SettingRow
          title="Remember my usual place"
          description="When you choose Home, Work, or Errands, Spark can preselect it at a similar time of day. This stays on your device."
          value={spark.settings.rememberContextByTime}
          onValueChange={(value) => void spark.updateSetting('rememberContextByTime', value)}
        />
        <SettingRow
          title="Show helpful patterns"
          description="Find patterns in completed actions and focus sessions stored on this device."
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
          title="One-action view"
          description="Highlight one tiny action on Today until you turn this view off."
          value={spark.settings.minimumViableDay}
          onValueChange={(value) => void spark.updateSetting('minimumViableDay', value)}
        />
        <SettingRow
          title="Five-second focus countdown"
          description="Begin focus sessions with a five-second countdown and a clear Not yet button."
          value={spark.settings.launchCountdownEnabled}
          onValueChange={(value) =>
            void spark.updateSetting('launchCountdownEnabled', value)
          }
        />
        <SettingRow
          title="Ask for my next step after Focus"
          description="When a focus timer ends, Spark offers a place to save the next tiny move."
          value={spark.settings.transitionNudgesEnabled}
          onValueChange={(value) =>
            void spark.updateSetting('transitionNudgesEnabled', value)
          }
        />
        <SettingRow
          title="Show Spark points"
          description="Show fixed point totals and levels alongside completed actions."
          value={spark.settings.showRewards}
          onValueChange={(value) => void spark.updateSetting('showRewards', value)}
        />
        <SettingRow
          title="Show habit percentages"
          description="Turn percentages off to use words such as Finding a rhythm instead."
          value={spark.settings.showRhythmPercentages}
          onValueChange={(value) => void spark.updateSetting('showRhythmPercentages', value)}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Reminders"
        summary={spark.settings.notificationsEnabled ? `On · up to ${spark.settings.notificationCap} local reminders` : 'Off'}
      >
        <SettingRow
          title="Local notifications"
          description="Scheduled on this device. Spark does not need a server to remind you."
          value={spark.settings.notificationsEnabled}
          onValueChange={(value) => void toggleNotifications(value)}
        />
        <Muted>Lock-screen privacy</Muted>
        <View style={styles.choiceRow}>
          {(
            [
              ['full', 'Show habit'],
              ['private', 'Generic text'],
              ['secret', 'Hide on lock screen']
            ] as const
          ).map(([value, label]) => (
            <Chip
              key={value}
              label={label}
              selected={spark.settings.notificationPrivacy === value}
              onPress={() => void spark.updateSetting('notificationPrivacy', value)}
            />
          ))}
        </View>
        <SettingRow
          title="Pause reminders I do not answer"
          description="After three unanswered reminders, pause that habit’s reminders for three days, then start them again automatically."
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
        <Muted>Maximum habit reminders per day</Muted>
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Backup & restore"
        summary="Save a copy without creating an account"
      >
        <Muted>
          Export a readable JSON backup to a folder you choose. Spark never uploads it for you.
          Treat the file as private because its contents are not separately encrypted.
        </Muted>
        <Button
          label="Encrypted backups and automatic folder"
          onPress={() => router.push('/encrypted-backups')}
        />
        <Button
          label="Export readable backup (not encrypted)"
          variant="secondary"
          icon={<Ionicons name="share-outline" size={19} color={theme.text} />}
          onPress={() =>
            void shareBackup().catch((error: unknown) =>
              Alert.alert('Could not export', error instanceof Error ? error.message : 'Try again.')
            )
          }
        />
        <Button
          label="Export spreadsheet copy (CSV)"
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
          Before a major storage change or restore, Spark keeps a few temporary safety copies on
          this device. Current safety copies: {safetyCopies}.
        </Muted>
        {safetyCopies ? (
          <Button label="Delete automatic safety copies" variant="ghost" onPress={clearSafetyCopies} />
        ) : null}
      </CollapsibleSection>

      <CollapsibleSection
        title="App lock & privacy"
        summary={spark.settings.appLockEnabled ? 'App lock is on' : 'App lock and private previews'}
      >
        <SettingRow
          title="Lock Spark"
          description="Require device authentication after Spark has been in the background."
          value={spark.settings.appLockEnabled}
          onValueChange={(value) => void toggleAppLock(value)}
        />
        {spark.settings.appLockEnabled ? (
          <>
            <Muted>Lock after being away</Muted>
            <View style={styles.choiceRow}>
              {[0, 1, 5, 15, 60].map((minutes) => (
                <Chip
                  key={minutes}
                  label={minutes === 0 ? 'Immediately' : `${minutes} min`}
                  selected={spark.settings.appLockTimeoutMinutes === minutes}
                  onPress={() =>
                    void spark.updateSetting('appLockTimeoutMinutes', minutes)
                  }
                />
              ))}
            </View>
          </>
        ) : null}
        <SettingRow
          title="Hide sensitive app preview"
          description="Android also prevents screenshots while enabled; iPhone protects the app-switcher preview."
          value={spark.settings.hideSensitiveAppPreview}
          onValueChange={(value) =>
            void spark.updateSetting('hideSensitiveAppPreview', value)
          }
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Planning & extra tools"
        summary="Plan the week, leave on time, try a change, or share selected wins"
      >
        <SettingRow
          title="Plan my week"
          description="Choose a few habits for this week and one small start for tomorrow."
          onPress={() => router.push('/weekly-reset')}
        />
        <SettingRow
          title="Help me leave on time"
          description="Work backward from when you need to leave and include preparation time."
          onPress={() => router.push('/departure')}
        />
        <SettingRow
          title="Try a change for one week"
          description="Try a tiny version or an afternoon reminder, then review a simple local count."
          onPress={() => router.push('/experiments')}
        />
        <SettingRow
          title="Share selected wins"
          description="Choose completed actions, preview them, and open your phone’s Share menu."
          onPress={() => router.push('/share-progress')}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Optional online services"
        summary={cloudAvailable ? 'Support and purchase checks are available but off until enabled' : 'Not set up · no cloud cost'}
      >
        <SettingRow
          title="Allow online support and purchase checks"
          description={
            cloudAvailable
              ? 'Creates a private sign-in only when you contact support or verify a purchase. Habits never upload.'
              : 'Online services are not set up in this build. The offline app works normally.'
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Premium & support"
        summary={spark.entitlement.premium ? 'Premium active · comfort and cosmetic options' : 'Core tools remain free'}
      >
        <Muted>
          Habits, focus, capture, reminders, and local backups remain free. Premium is for
          supporter cosmetics and comfort options.
        </Muted>
        <SettingRow
          title={spark.entitlement.premium ? 'Premium active' : 'Spark premium'}
          description={
            spark.entitlement.premium
              ? 'Premium features are available on this device.'
              : 'Lifetime purchase, official promo code, or access granted to you.'
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
            <Muted>Focus companion</Muted>
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
            <Muted>The chosen icon style appears inside Spark and its home-screen widgets.</Muted>
          </>
        ) : null}
      </CollapsibleSection>

      <CollapsibleSection
        title="Privacy & troubleshooting"
        summary="See where data stays or check a technical problem"
      >
        <SettingRow
          title="Where my data is stored"
          description="A plain-language map of local and optional online data."
          onPress={() => router.push('/privacy')}
        />
        <SettingRow
          title="Check for technical problems"
          description="Run local checks and view information useful when asking for support."
          onPress={() => router.push('/diagnostics')}
        />
        <Muted>{storageStatus}</Muted>
        <Button
          label="Share troubleshooting report"
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
          label="Clear troubleshooting history"
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
      </CollapsibleSection>

      {creatorTipAvailable ? (
        <View style={styles.creatorSupport}>
          <Muted>
            Prefer not to buy Premium? You can leave the creator an optional tip. Tips do not
            unlock features, change your account, or send Spark data.
          </Muted>
          <Button
            label="Buy the creator a coffee ↗"
            variant="ghost"
            onPress={() =>
              void openCreatorTipLink().catch((error: unknown) =>
                Alert.alert(
                  'Could not open the support page',
                  error instanceof Error ? error.message : 'Try again.'
                )
              )
            }
          />
        </View>
      ) : null}
    </Screen>
    <SparkBurst
      visible={preview && !isQuietNow(spark.settings)}
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
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  creatorSupport: { alignItems: 'center', gap: 2, paddingHorizontal: 12, paddingVertical: 6 }
});
