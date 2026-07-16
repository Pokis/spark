import { focusRemainingSeconds } from './SparkFocusWidget';

describe('focus widget timer state', () => {
  it('derives remaining time from timestamps and paused time', () => {
    expect(
      focusRemainingSeconds(
        {
          id: 'focus',
          title: 'Open document',
          plannedSeconds: 600,
          startedAt: '2026-07-16T10:00:00.000Z',
          endedAt: null,
          pausedAt: null,
          pausedSeconds: 60,
          completed: false,
          interruptionCount: 0
        },
        Date.parse('2026-07-16T10:05:00.000Z')
      )
    ).toBe(360);
  });

  it('never reports a negative value after a background timer has elapsed', () => {
    expect(
      focusRemainingSeconds(
        {
          id: 'focus',
          title: 'Open document',
          plannedSeconds: 60,
          startedAt: '2026-07-16T10:00:00.000Z',
          endedAt: null,
          pausedAt: null,
          pausedSeconds: 0,
          completed: false,
          interruptionCount: 0
        },
        Date.parse('2026-07-16T10:05:00.000Z')
      )
    ).toBe(0);
  });
});
