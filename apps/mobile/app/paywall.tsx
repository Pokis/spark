import Ionicons from '@expo/vector-icons/Ionicons';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Screen } from '../src/components/Screen';
import { Body, Eyebrow, H1, Muted, SectionHeading } from '../src/components/Typography';
import { getEntitlement } from '../src/services/api';
import { cloudConfigured } from '../src/services/cloudConfig';
import {
  purchasePremium,
  premiumDisplayPrice,
  purchasesSupportedOnPlatform,
  restorePurchases
} from '../src/services/purchases';
import { useSpark } from '../src/state/SparkProvider';
import { goBackOr } from '../src/lib/navigation';
import { useTheme } from '../src/theme';

const freeFeatures = [
  'Unlimited habits with three effort sizes',
  'No-guilt rhythms and all local insights',
  'Focus companion and brain-dump capture',
  'Local reminders and device backups'
];

const premiumFeatures = [
  'Aurora, Ocean, and Forest accent themes',
  'Spark, owl, and cloud body-double companions',
  'Alternate celebrations and icon treatments',
  'Generated offline focus soundscapes with volume control',
  'Optional Spark supporter badge',
  'Restore supporter status on another device',
];

export default function PaywallScreen() {
  const spark = useSpark();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState<string | null>(null);
  const configured = cloudConfigured();
  const platformSupported = purchasesSupportedOnPlatform();
  const purchasesAvailable =
    platformSupported && configured && spark.remoteConfig.defaults.purchasesEnabled;

  useEffect(() => {
    if (!purchasesAvailable) return;
    void premiumDisplayPrice()
      .then(setPrice)
      .catch(() => setPrice(null));
  }, [purchasesAvailable]);

  async function refreshEntitlement() {
    const remote = await getEntitlement();
    await spark.updateEntitlement({
      ...remote,
      checkedAt: new Date().toISOString()
    });
  }

  async function run(action: 'buy' | 'restore' | 'refresh') {
    if (!configured || (action !== 'refresh' && !purchasesAvailable)) {
      Alert.alert(
        'Purchases are not enabled',
        'The offline app is complete. Configure the low-cost control plane before accepting money so every purchase can be verified safely.'
      );
      return;
    }
    setBusy(true);
    try {
      if (action === 'buy') await purchasePremium();
      if (action === 'restore') await restorePurchases();
      await refreshEntitlement();
      Alert.alert('Premium is ready', 'Thank you for supporting humane habit tools.');
    } catch (error) {
      Alert.alert(
        action === 'refresh' ? 'Could not check access' : 'Purchase not completed',
        error instanceof Error ? error.message : 'Try again later.'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: theme.primary }]}>
          <Ionicons name="sparkles" size={40} color="#FFFFFF" />
        </View>
        <Eyebrow>Ethical monetization</Eyebrow>
        <H1>{spark.entitlement.premium ? 'Premium is active.' : 'Support Spark once.'}</H1>
        <Body>
          Core ADHD support stays free. Premium is a lifetime supporter purchase, not a
          subscription or a pressure loop.
        </Body>
      </View>

      <Card>
        <SectionHeading>Free, permanently</SectionHeading>
        {freeFeatures.map((feature) => (
          <View key={feature} style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color={theme.success} />
            <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
          </View>
        ))}
      </Card>
      <Card style={{ borderColor: theme.primary }}>
        <SectionHeading>Premium supporter extras</SectionHeading>
        {premiumFeatures.map((feature) => (
          <View key={feature} style={styles.feature}>
            <Ionicons name="sparkles" size={19} color={theme.primary} />
            <Text style={[styles.featureText, { color: theme.text }]}>{feature}</Text>
          </View>
        ))}
        {spark.entitlement.premium ? (
          <Muted>Access source: {spark.entitlement.source}</Muted>
        ) : (
          <Button
            label={price ? `Buy lifetime premium · ${price}` : 'Buy lifetime premium'}
            loading={busy}
            disabled={!purchasesAvailable}
            onPress={() => void run('buy')}
          />
        )}
      </Card>

      <Card>
        <SectionHeading>Already have access?</SectionHeading>
        <Button
          label={platformSupported ? 'Restore Play purchase' : 'iPhone purchase coming later'}
          variant="secondary"
          loading={busy}
          disabled={!purchasesAvailable}
          onPress={() => void run('restore')}
        />
        <Button
          label="Check staff or promo grant"
          variant="ghost"
          loading={busy}
          disabled={!configured}
          onPress={() => void run('refresh')}
        />
        <Button
          label="Redeem official Google Play code"
          variant="ghost"
          onPress={() => void Linking.openURL('https://play.google.com/redeem')}
        />
        <Muted>
          Public giveaways use official Play promo codes. Staff can also grant a named support
          account through the admin dashboard; those actions are audited.
        </Muted>
      </Card>

      {!purchasesAvailable ? (
        <Card style={{ borderColor: theme.warning }}>
          <SectionHeading>Developer note</SectionHeading>
          <Muted>
            {platformSupported
              ? 'Purchase buttons are intentionally disabled until the verification service, Firebase identity, and dashboard purchase switch are enabled. This prevents unverified or lost purchases.'
              : 'iPhone purchases are intentionally disabled until App Store server verification, restore, and revocation handling are complete.'}
          </Muted>
        </Card>
      ) : null}
      <Button label="Close" variant="ghost" onPress={() => goBackOr('/settings')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10 },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center'
  },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  featureText: { flex: 1, fontSize: 15, lineHeight: 21 }
});
