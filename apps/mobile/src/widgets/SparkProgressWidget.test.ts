import { SparkProgressWidget } from './SparkProgressWidget';
import { SparkToolkitWidget } from './SparkToolkitWidget';

jest.mock('react-native-android-widget', () => ({
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget'
}));

describe('additional Android widgets', () => {
  it('links locally stored progress to the Journey screen', () => {
    const tree: any = SparkProgressWidget({
      snapshot: {
        habitId: null,
        title: 'Enough',
        tinyLabel: 'Rest',
        winsToday: 2,
        totalWins: 12,
        totalSparks: 21,
        accent: '#20B8B2'
      }
    });
    expect(tree.props.clickActionData.uri).toBe('spark://journey');
    expect(tree.props.accessibilityLabel).toContain('12 total wins');
  });

  it('provides four low-friction tool destinations', () => {
    const tree: any = SparkToolkitWidget();
    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('spark://quick-capture');
    expect(serialized).toContain('spark://focus-launch?minutes=2');
    expect(serialized).toContain('spark://departure');
    expect(serialized).toContain('spark://help');
  });
});
