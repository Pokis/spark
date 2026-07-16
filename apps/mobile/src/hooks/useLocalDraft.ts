import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef } from 'react';

const PREFIX = 'spark.draft.v1.';

export function useLocalDraft<T>(
  key: string,
  value: T,
  restore: (draft: T) => void,
  enabled = true
) {
  const ready = useRef(false);
  const generation = useRef(0);
  const restoreRef = useRef(restore);
  restoreRef.current = restore;

  useEffect(() => {
    let active = true;
    ready.current = false;
    if (!enabled) {
      ready.current = true;
      return;
    }
    void AsyncStorage.getItem(`${PREFIX}${key}`)
      .then((raw) => {
        if (active && raw) restoreRef.current(JSON.parse(raw) as T);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) ready.current = true;
      });
    return () => {
      active = false;
    };
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled || !ready.current) return;
    const currentGeneration = generation.current;
    const timeout = setTimeout(() => {
      if (ready.current && generation.current === currentGeneration) {
        void AsyncStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value));
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [enabled, key, value]);

  return useCallback(
    async () => {
      ready.current = false;
      generation.current += 1;
      await AsyncStorage.removeItem(`${PREFIX}${key}`);
      ready.current = true;
    },
    [key]
  );
}
