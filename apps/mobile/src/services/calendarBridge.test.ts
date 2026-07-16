import * as Calendar from 'expo-calendar/legacy';
import { openCalendarExport } from './calendarBridge';

jest.mock('expo-calendar/legacy', () => ({
  CalendarDialogResultActions: {
    saved: 'saved',
    done: 'done',
    canceled: 'canceled'
  },
  createEventInCalendarAsync: jest.fn()
}));

const createEvent = Calendar.createEventInCalendarAsync as jest.MockedFunction<
  typeof Calendar.createEventInCalendarAsync
>;

describe('calendar bridge', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(['saved', 'done'] as const)(
    'reports success when the system dialog returns %s',
    async (action) => {
      createEvent.mockResolvedValue({ action } as never);
      const startAt = new Date('2026-07-16T10:00:00.000Z');
      const endAt = new Date('2026-07-16T10:25:00.000Z');
      await expect(
        openCalendarExport({
          title: 'Focus',
          startAt,
          endAt,
          notes: 'Created explicitly'
        })
      ).resolves.toBe(true);
      expect(createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Focus',
          startDate: startAt,
          endDate: endAt,
          notes: 'Created explicitly',
          alarms: [{ relativeOffset: -10 }]
        })
      );
      expect(createEvent.mock.calls[0]?.[0]).not.toHaveProperty('calendarId');
    }
  );

  it('reports cancellation without trying to inspect calendars', async () => {
    createEvent.mockResolvedValue({ action: 'canceled' } as never);
    await expect(
      openCalendarExport({
        title: 'Focus',
        startAt: new Date('2026-07-16T10:00:00.000Z'),
        endAt: new Date('2026-07-16T10:25:00.000Z'),
        notes: ''
      })
    ).resolves.toBe(false);
  });
});
