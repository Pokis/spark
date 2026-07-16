import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { FormField } from '../src/components/FormField';
import { Screen } from '../src/components/Screen';
import { SettingRow } from '../src/components/SettingRow';
import { Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import { pickAndRestoreBackup, shareBackup } from '../src/services/backup';
import { cloudConfigured } from '../src/services/cloudConfig';
import { deleteCloudIdentity } from '../src/services/api';
import { requestNotificationPermission } from '../src/services/notifications';
import { useSpark } from '../src/state/SparkProvider';
import { useTheme } from '../src/theme';

export default function SettingsScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const cloudAvailable = cloudConfigured();
  const supportAvailable = cloudAvailable && spark.remoteConfig.defaults.supportEnabled;

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

  function restore() {
    Alert.alert(
      'Replace local Spark data?',
      'Restoring a backup replaces habits, completions, focus sessions, routines, and settings on this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose backup',
          style: 'destructive',
          onPress: () =>
            void pickAndRestoreBackup()
              .then(() => spark.refresh())
              .then(() => Alert.alert('Restored', 'Your local Spark data is ready.'))
              .catch((error: unknown) =>
                Alert.alert('Could not restore', error instanceof Error ? error.message : 'Try again.')
              )
        }
      ]
    );
  }

  function deleteCloudData() {
    Alert.alert(
      'Delete optional cloud data?',
      'This removes your support conversations, cloud entitlement record, and random support identity. It does not delete local habits or backups.',
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

  return (
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
      </Card>

      <Card>
        <SectionHeading>Gentle reminders</SectionHeading>
        <SettingRow
          title="Local notifications"
          description="Scheduled on this device. Spark does not need a server to remind you."
          value={spark.settings.notificationsEnabled}
          onValueChange={(value) => void toggleNotifications(value)}
        />
        <Muted>
          Spark schedules at most {spark.settings.notificationCap} habit reminders and prioritizes
          the habits you marked important.
        </Muted>
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
        <Button label="Restore a backup" variant="ghost" onPress={restore} />
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
          supporter cosmetics and advanced insights.
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
          <SettingRow
            title="Aurora supporter theme"
            description="A purple accent theme included with supporter access."
            value={spark.settings.supporterThemeEnabled}
            onValueChange={(value) => void spark.updateSetting('supporterThemeEnabled', value)}
          />
        ) : null}
      </Card>

      <Card>
        <SectionHeading>Trust</SectionHeading>
        <SettingRow title="Privacy and data map" onPress={() => router.push('/privacy')} />
        <Muted>Version 0.1.0 · Android first, iPhone compatible</Muted>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  capRow: { flexDirection: 'row', gap: 8 },
});
