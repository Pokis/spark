import type { Capacity } from '@spark/domain';
import { StyleSheet, View } from 'react-native';
import { Chip } from './Chip';
import { Muted, SectionHeading } from './Typography';

const options: { value: Capacity; label: string; description: string }[] = [
  { value: 'empty', label: '🪫 Running low', description: 'Show the gentlest starts' },
  { value: 'steady', label: '🌿 Steady', description: 'Keep it practical' },
  { value: 'ready', label: '⚡ Ready', description: 'Offer a stretch option' }
];

export function CapacityPicker({
  value,
  onChange
}: {
  value: Capacity | null;
  onChange(value: Capacity): void;
}) {
  return (
    <View style={styles.wrapper}>
      <View>
        <SectionHeading>What kind of day is this?</SectionHeading>
        <Muted>This changes suggestions, never your worth or your progress.</Muted>
      </View>
      <View style={styles.chips}>
        {options.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            accessibilityLabel={`${option.label}. ${option.description}`}
            selected={value === option.value}
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }
});
