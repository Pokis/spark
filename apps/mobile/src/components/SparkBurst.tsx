import type { CompletionTag } from '@spark/domain';
import { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette } from '../theme';

const particles = [
  { x: -72, y: -78, color: palette.coral },
  { x: 68, y: -65, color: palette.gold },
  { x: -84, y: 20, color: palette.purple },
  { x: 78, y: 34, color: palette.teal },
  { x: -40, y: 82, color: palette.blue },
  { x: 35, y: 88, color: palette.coral }
];

export function SparkBurst({
  visible,
  title,
  reward,
  reducedMotion,
  sensoryProfile,
  celebrationStyle = 'burst',
  showReward,
  tags = [],
  onToggleTag,
  onDismiss
}: {
  visible: boolean;
  title: string;
  reward: number;
  reducedMotion: boolean;
  sensoryProfile: 'calm' | 'balanced' | 'celebratory';
  celebrationStyle?: 'burst' | 'ripple' | 'confetti';
  showReward: boolean;
  tags?: CompletionTag[];
  onToggleTag?(tag: CompletionTag): void;
  onDismiss(): void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    const calm = sensoryProfile === 'calm';
    progress.setValue(reducedMotion || calm ? 1 : 0);
    if (!reducedMotion && !calm) {
      Animated.spring(progress, {
        toValue: 1,
        useNativeDriver: true,
        friction: sensoryProfile === 'celebratory' ? 4 : 5,
        tension: sensoryProfile === 'celebratory' ? 85 : 70
      }).start();
    }
  }, [progress, reducedMotion, sensoryProfile, visible]);

  const visibleParticles =
    sensoryProfile === 'calm'
      ? []
      : sensoryProfile === 'balanced'
        ? particles.slice(0, 4)
        : celebrationStyle === 'ripple'
          ? particles.slice(0, 3)
          : particles;
  const rewardLabel = showReward
    ? ` You earned ${reward} ${reward === 1 ? 'spark' : 'sparks'}.`
    : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.stage}>
          {visibleParticles.map((particle, index) => (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                { backgroundColor: particle.color },
                {
                  opacity: progress,
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, particle.x]
                      })
                    },
                    {
                      translateY: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, particle.y]
                      })
                    },
                    {
                      scale: progress.interpolate({
                        inputRange: [0, 0.55, 1],
                        outputRange: [0.2, 1.4, 1]
                      })
                    }
                  ]
                }
              ]}
            />
          ))}
          <Animated.View
            style={[
              styles.spark,
              {
                borderRadius: celebrationStyle === 'ripple' ? 58 : 40,
                transform: [
                  {
                    scale: progress.interpolate({
                      inputRange: [0, 0.65, 1],
                      outputRange: [0.35, 1.15, 1]
                    })
                  },
                  {
                    rotate: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-20deg', '0deg']
                    })
                  }
                ]
              }
            ]}
          >
            <Text style={styles.sparkIcon}>✦</Text>
          </Animated.View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.reward}>
            {showReward ? `+${reward} sparks · it counts` : 'It counts'}
          </Text>
          {onToggleTag ? (
            <>
              <Text style={styles.tagPrompt}>Anything help? Optional.</Text>
              <View style={styles.tags}>
                {(
                  [
                    ['timer_helped', 'Timer helped'],
                    ['made_it_tiny', 'Made it tiny'],
                    ['body_double', 'Body double'],
                    ['good_cue', 'Good cue']
                  ] as const
                ).map(([tag, label]) => (
                  <Pressable
                    key={tag}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: tags.includes(tag) }}
                    onPress={() => onToggleTag(tag)}
                    style={[
                      styles.tag,
                      { backgroundColor: tags.includes(tag) ? '#6546C3' : '#202A45' }
                    ]}
                  >
                    <Text style={styles.tagText}>{tags.includes(tag) ? '✓ ' : ''}{label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title} completed.${rewardLabel} Continue.`}
            onPress={onDismiss}
            style={styles.continue}
          >
            <Text style={styles.continueText}>Continue</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7,11,23,0.91)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stage: { width: '92%', maxWidth: 360, alignItems: 'center', justifyContent: 'center' },
  particle: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 4,
    top: 128,
    left: 134
  },
  spark: {
    width: 116,
    height: 116,
    borderRadius: 40,
    backgroundColor: palette.coral,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: palette.coral,
    shadowOpacity: 0.75,
    shadowRadius: 28,
    elevation: 16
  },
  sparkIcon: { color: '#FFFFFF', fontSize: 70, lineHeight: 88 },
  title: {
    marginTop: 28,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center'
  },
  reward: { marginTop: 8, color: '#FFC857', fontSize: 16, fontWeight: '700' },
  tagPrompt: { marginTop: 18, color: '#D7DCEC', fontSize: 13 },
  tags: {
    marginTop: 9,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 7
  },
  tag: { minHeight: 38, borderRadius: 12, paddingHorizontal: 10, justifyContent: 'center' },
  tagText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  continue: {
    marginTop: 22,
    minHeight: 48,
    minWidth: 160,
    borderRadius: 15,
    backgroundColor: '#FF6B5F',
    alignItems: 'center',
    justifyContent: 'center'
  },
  continueText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }
});
