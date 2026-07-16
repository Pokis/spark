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
  onDismiss
}: {
  visible: boolean;
  title: string;
  reward: number;
  reducedMotion: boolean;
  onDismiss(): void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    progress.setValue(reducedMotion ? 1 : 0);
    if (!reducedMotion) {
      Animated.spring(progress, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 70
      }).start();
    }
  }, [progress, reducedMotion, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title} completed. You earned ${reward} sparks. Tap to continue.`}
        onPress={onDismiss}
        style={styles.backdrop}
      >
        <View style={styles.stage}>
          {particles.map((particle, index) => (
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
          <Text style={styles.reward}>+{reward} sparks · it counts</Text>
          <Text style={styles.dismiss}>Tap anywhere</Text>
        </View>
      </Pressable>
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
  stage: { width: 280, height: 340, alignItems: 'center', justifyContent: 'center' },
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
  dismiss: { marginTop: 30, color: '#A8B0C4', fontSize: 13 }
});
