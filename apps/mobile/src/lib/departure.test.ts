import type { Routine } from '@spark/domain';
import {
  departureCalendarEvent,
  departureStartAt,
  routineEstimateMinutes
} from './departure';

const routine: Routine = {
  id: 'leave',
  title: 'Leave the house',
  icon: '🚪',
  color: '#fff',
  createdAt: '2026-07-01T00:00:00.000Z',
  steps: [
    { id: 'a', title: 'Shoes', estimateMinutes: 3, sortOrder: 0 },
    { id: 'b', title: 'Keys', estimateMinutes: 2, sortOrder: 1 }
  ]
};

describe('departure planning', () => {
  it('adds non-negative routine estimates and works backward', () => {
    expect(routineEstimateMinutes(routine)).toBe(5);
    expect(
      departureStartAt(
        new Date('2026-07-16T10:00:00.000Z'),
        15,
        5
      ).toISOString()
    ).toBe('2026-07-16T09:40:00.000Z');
    expect(
      departureStartAt(
        new Date('2026-07-16T10:00:00.000Z'),
        -5,
        -2
      ).toISOString()
    ).toBe('2026-07-16T10:00:00.000Z');
  });

  it('builds one explicit event without calendar-read data', () => {
    const event = departureCalendarEvent({
      title: ' Dentist ',
      targetAt: new Date('2026-07-16T10:00:00.000Z'),
      bufferMinutes: 15,
      routine
    });
    expect(event.title).toBe('Spark: Dentist');
    expect(event.startAt.toISOString()).toBe('2026-07-16T09:40:00.000Z');
    expect(event.endAt.toISOString()).toBe('2026-07-16T10:00:00.000Z');
    expect(event.notes).toContain('Routine: Leave the house.');
    expect(event.notes).toContain('Spark did not read your calendar');
  });

  it('uses safe defaults when no routine or title exists', () => {
    expect(routineEstimateMinutes()).toBe(0);
    const event = departureCalendarEvent({
      title: ' ',
      targetAt: new Date('2026-07-16T10:00:00.000Z'),
      bufferMinutes: 0
    });
    expect(event.title).toBe('Spark: Departure');
    expect(event.notes).not.toContain('Routine:');
  });
});
