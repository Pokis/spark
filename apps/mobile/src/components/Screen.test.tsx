import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { keyboardAvoidingBehavior, Screen } from './Screen';

describe('Screen device insets and keyboard behavior', () => {
  it('keeps controls above both system bars', async () => {
    const view = await render(
      <Screen scroll={false}>
        <Text>Continue</Text>
      </Screen>
    );
    expect(view.getByTestId('spark-safe-area').props.edges).toMatchObject({
      top: 'additive',
      bottom: 'additive'
    });
  });

  it('shrinks around the Android keyboard so focused fields remain reachable', () => {
    expect(keyboardAvoidingBehavior('android', true)).toBe('height');
    expect(keyboardAvoidingBehavior('ios', true)).toBe('padding');
    expect(keyboardAvoidingBehavior('android', false)).toBeUndefined();
  });
});
