import { endOfToday, isQuietNow } from './sensory';

describe('sensory quiet mode', () => {
  it('expires at the next local midnight', () => {
    const end = new Date(endOfToday(new Date('2026-07-16T18:45:00')));
    expect(end.getHours()).toBe(0);
    expect(end.getMinutes()).toBe(0);
    expect(end.getDate()).toBe(17);
  });

  it('is active only while the stored instant is in the future', () => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    expect(
      isQuietNow({ quietUntil: '2026-07-16T12:00:01.000Z' }, now)
    ).toBe(true);
    expect(
      isQuietNow({ quietUntil: '2026-07-16T12:00:00.000Z' }, now)
    ).toBe(false);
    expect(isQuietNow({ quietUntil: null }, now)).toBe(false);
    expect(isQuietNow({ quietUntil: 'not-a-date' }, now)).toBe(false);
  });
});
