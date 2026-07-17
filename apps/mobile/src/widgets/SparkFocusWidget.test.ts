import {
  emptyFocusSnapshot,
  focusRemainingSeconds,
  SparkFocusWidget
} from './SparkFocusWidget';

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

  it('freezes elapsed time at pausedAt', () => {
    expect(
      focusRemainingSeconds(
        {
          id: 'focus',
          title: 'Open document',
          plannedSeconds: 600,
          startedAt: '2026-07-16T10:00:00.000Z',
          endedAt: null,
          pausedAt: '2026-07-16T10:02:00.000Z',
          pausedSeconds: 30,
          completed: false,
          interruptionCount: 0
        },
        Date.parse('2026-07-16T11:00:00.000Z')
      )
    ).toBe(510);
  });

  it('renders safe idle, running, paused, and complete actions', () => {
    const idle: any = SparkFocusWidget({ snapshot: emptyFocusSnapshot });
    expect(idle.props.accessibilityLabel).toContain('Start a two minute focus session');
    expect(idle.props.clickActionData.uri).toContain('minutes=2');

    jest.spyOn(Date, 'now').mockReturnValue(
      Date.parse('2026-07-16T10:01:00.000Z')
    );
    const base = {
      id: 'focus/id',
      title: 'Open document',
      plannedSeconds: 120,
      startedAt: '2026-07-16T10:00:00.000Z',
      endedAt: null,
      pausedAt: null,
      pausedSeconds: 0,
      completed: false,
      interruptionCount: 0
    };
    const running: any = SparkFocusWidget({
      snapshot: { session: base, syncedAt: base.startedAt }
    });
    expect(running.props.accessibilityLabel).toContain('Running');
    expect(JSON.stringify(running.props.children)).toContain('action=pause');

    const paused: any = SparkFocusWidget({
      snapshot: {
        session: { ...base, pausedAt: '2026-07-16T10:00:30.000Z' },
        syncedAt: base.startedAt
      }
    });
    expect(paused.props.accessibilityLabel).toContain('Paused');
    expect(JSON.stringify(paused.props.children)).toContain('action=resume');

    const complete: any = SparkFocusWidget({
      snapshot: {
        session: { ...base, plannedSeconds: 30 },
        syncedAt: base.startedAt
      }
    });
    expect(complete.props.accessibilityLabel).toContain('Timer complete');
    expect(JSON.stringify(complete.props.children)).toContain('action=open');
    jest.restoreAllMocks();
  });
});
