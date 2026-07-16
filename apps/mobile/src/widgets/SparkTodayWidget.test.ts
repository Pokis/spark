import { widgetActionUri } from './SparkTodayWidget';

describe('Today widget semantics', () => {
  it('opens the explicit confirmation route instead of writing a completion directly', () => {
    expect(widgetActionUri('habit with spaces')).toBe(
      'spark://widget-action?habitId=habit%20with%20spaces'
    );
  });

  it('uses an open-only route when there is no suggested habit', () => {
    expect(widgetActionUri(null)).toBe('spark://');
  });
});
