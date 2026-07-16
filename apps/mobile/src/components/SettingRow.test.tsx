import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { SettingRow } from './SettingRow';

describe('SettingRow accessibility', () => {
  it('exposes a labelled switch with its current state', async () => {
    const onValueChange = jest.fn();
    const view = await render(
      <SettingRow
        title="Reduce motion"
        description="Avoid pulsing movement."
        value
        onValueChange={onValueChange}
      />
    );
    const toggle = view.getByLabelText('Reduce motion');
    expect(toggle.props.accessibilityState?.checked ?? toggle.props.value).toBe(true);
    await fireEvent(toggle, 'valueChange', false);
    expect(onValueChange).toHaveBeenCalledWith(false);
  });

  it('gives navigation rows a meaningful name and hint', async () => {
    const onPress = jest.fn();
    const view = await render(
      <SettingRow
        title="Privacy and data map"
        description="See what stays local."
        onPress={onPress}
      />
    );
    const row = view.getByRole('button', { name: 'Privacy and data map' });
    expect(row.props.accessibilityHint).toBe('See what stays local.');
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalled();
  });
});
