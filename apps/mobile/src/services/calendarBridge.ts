import * as Calendar from 'expo-calendar/legacy';

export interface CalendarBridgeEvent {
  title: string;
  startAt: Date;
  endAt: Date;
  notes: string;
}

export async function openCalendarExport(event: CalendarBridgeEvent): Promise<boolean> {
  const result = await Calendar.createEventInCalendarAsync({
    title: event.title,
    startDate: event.startAt,
    endDate: event.endAt,
    notes: event.notes,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    alarms: [{ relativeOffset: -10 }]
  });
  return (
    result.action === Calendar.CalendarDialogResultActions.saved ||
    result.action === Calendar.CalendarDialogResultActions.done
  );
}
