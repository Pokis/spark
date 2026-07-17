import { fireEvent, render } from '@testing-library/react-native';
import { describe, expect, it, jest } from '@jest/globals';
import { CapacityPicker } from './CapacityPicker';

describe('CapacityPicker', () => {
  it('reports a low-capacity choice without judgment language', async () => {
    const onChange = jest.fn();
    const view = await render(<CapacityPicker value={null} onChange={onChange} />);
    await fireEvent.press(view.getByRole('button', { name: /Running low/ }));
    expect(onChange).toHaveBeenCalledWith('empty');
    expect(view.getByText(/only changes the action suggestions/)).toBeTruthy();
  });
});
