import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useLocalDraft } from './useLocalDraft';

describe('local form drafts', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => jest.useRealTimers());

  it('restores an existing draft and then debounces new values', async () => {
    await AsyncStorage.setItem(
      'spark.draft.v1.habit',
      JSON.stringify({ title: 'Restored' })
    );
    const restore = jest.fn();
    const hook = await renderHook<
      () => Promise<void>,
      { value: { title: string } }
    >(
      ({ value }) => useLocalDraft('habit', value, restore),
      { initialProps: { value: { title: 'Initial' } } }
    );
    await waitFor(() =>
      expect(restore).toHaveBeenCalledWith({ title: 'Restored' })
    );
    await hook.rerender({ value: { title: 'Changed' } });
    await act(async () => {
      jest.advanceTimersByTime(350);
    });
    expect(
      JSON.parse((await AsyncStorage.getItem('spark.draft.v1.habit'))!)
    ).toEqual({ title: 'Changed' });
  });

  it('does not restore or save when drafts are disabled', async () => {
    await AsyncStorage.setItem('spark.draft.v1.disabled', '"old"');
    const restore = jest.fn();
    await renderHook(() =>
      useLocalDraft('disabled', 'new', restore, false)
    );
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(restore).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('spark.draft.v1.disabled')).toBe('"old"');
  });

  it('clears a draft without allowing an older pending write to recreate it', async () => {
    const restore = jest.fn();
    const hook = await renderHook(() =>
      useLocalDraft('clear-me', { title: 'Pending' }, restore)
    );
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await hook.result.current();
      jest.advanceTimersByTime(500);
    });
    expect(await AsyncStorage.getItem('spark.draft.v1.clear-me')).toBeNull();
  });

  it('ignores corrupt draft JSON instead of breaking the form', async () => {
    await AsyncStorage.setItem('spark.draft.v1.corrupt', '{broken');
    const restore = jest.fn();
    await renderHook(() => useLocalDraft('corrupt', 'value', restore));
    await act(async () => {
      await Promise.resolve();
    });
    expect(restore).not.toHaveBeenCalled();
  });
});
