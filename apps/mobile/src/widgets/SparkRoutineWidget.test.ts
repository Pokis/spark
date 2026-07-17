import {
  emptyRoutineSnapshot,
  routineWidgetUri,
  SparkRoutineWidget
} from './SparkRoutineWidget';

jest.mock('react-native-android-widget', () => ({
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget'
}));

describe('Spark routine widget', () => {
  it('opens the selected routine and describes the visible step', () => {
    expect(routineWidgetUri('leave / now')).toBe('spark://routine/leave%20%2F%20now');
    const tree: any = SparkRoutineWidget({
      snapshot: {
        routineId: 'leave',
        title: 'Leave home',
        icon: '🚪',
        currentStep: 'Put on shoes',
        stepNumber: 2,
        stepCount: 3,
        paused: true
      }
    });
    expect(tree.props.clickActionData.uri).toBe('spark://routine/leave');
    expect(tree.props.accessibilityLabel).toContain('Step 2 of 3');
    expect(tree.props.accessibilityLabel).toContain('tap to resume');
  });

  it('offers routine creation when there is no saved routine', () => {
    const tree: any = SparkRoutineWidget({ snapshot: emptyRoutineSnapshot });
    expect(tree.props.clickActionData.uri).toBe('spark://routine/new');
    expect(tree.props.accessibilityLabel).toContain('Create a routine');
  });
});
