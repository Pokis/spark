import type { Routine } from '@spark/domain';
import type { CalendarBridgeEvent } from '../services/calendarBridge';

export function routineEstimateMinutes(routine?: Routine): number {
  return (
    routine?.steps.reduce(
      (total, step) => total + Math.max(0, step.estimateMinutes),
      0
    ) ?? 0
  );
}

export function departureStartAt(
  targetAt: Date,
  bufferMinutes: number,
  routineMinutes: number
): Date {
  return new Date(
    targetAt.getTime() -
      (Math.max(0, bufferMinutes) + Math.max(0, routineMinutes)) * 60_000
  );
}

export function departureCalendarEvent(input: {
  title: string;
  targetAt: Date;
  bufferMinutes: number;
  routine?: Routine;
}): CalendarBridgeEvent {
  const routineMinutes = routineEstimateMinutes(input.routine);
  const startAt = departureStartAt(
    input.targetAt,
    input.bufferMinutes,
    routineMinutes
  );
  return {
    title: `Spark: ${input.title.trim() || 'Departure'}`,
    startAt,
    endAt: input.targetAt,
    notes: [
      `Start winding up at ${startAt.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}.`,
      input.routine ? `Routine: ${input.routine.title}.` : '',
      `${Math.max(0, input.bufferMinutes)}-minute buffer included.`,
      'Created explicitly from Spark. Spark did not read your calendar.'
    ]
      .filter(Boolean)
      .join('\n')
  };
}
