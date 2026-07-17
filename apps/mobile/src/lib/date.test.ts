import {
  deviceTimeZone,
  friendlyDate,
  friendlyTime,
  secondsLabel
} from './date';

describe('date presentation helpers', () => {
  it('returns a usable device time zone', () => {
    expect(deviceTimeZone()).toEqual(expect.any(String));
    expect(deviceTimeZone().length).toBeGreaterThan(0);
  });

  it('formats friendly dates and times without leaking invalid values', () => {
    expect(friendlyDate(new Date('2026-07-16T12:00:00.000Z'))).toEqual(
      expect.any(String)
    );
    expect(friendlyTime('2026-07-16T12:05:00.000Z')).toEqual(
      expect.any(String)
    );
    expect(friendlyDate(new Date('2026-07-16T12:00:00.000Z'), 'lt')).toMatch(
      /liep|ketvirt/i
    );
    expect(friendlyTime('2026-07-16T12:05:00.000Z', 'de')).toEqual(
      expect.any(String)
    );
    expect(friendlyDate(new Date('2026-07-16T12:00:00.000Z'))).not.toContain(
      'Invalid'
    );
  });

  it('formats focus timer values at minute boundaries', () => {
    expect(secondsLabel(0)).toBe('00:00');
    expect(secondsLabel(59)).toBe('00:59');
    expect(secondsLabel(60)).toBe('01:00');
    expect(secondsLabel(3_661)).toBe('61:01');
  });
});
