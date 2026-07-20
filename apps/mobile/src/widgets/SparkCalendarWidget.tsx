'use no memo';

import type { Completion, Habit } from '@spark/domain';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { habitDayStatus, monthCalendarDays, monthKey, monthTitle } from '../lib/habitCalendar';

export interface SparkCalendarHabitSnapshot {
  id: string;
  title: string;
  icon: string;
  color: string;
  days: Array<'outside' | 'completed' | 'scheduled' | 'flexible' | 'none'>;
}

export interface SparkCalendarSnapshot {
  month: string;
  title: string;
  habits: SparkCalendarHabitSnapshot[];
}

export const emptyCalendarSnapshot: SparkCalendarSnapshot = {
  month: '',
  title: 'Habit calendar',
  habits: []
};

export function buildCalendarWidgetSnapshot(input: {
  habits: Habit[];
  completions: Array<Pick<Completion, 'habitId' | 'localDate'>>;
  today: string;
  locale?: string;
}): SparkCalendarSnapshot {
  const month = monthKey(input.today);
  const days = monthCalendarDays(month);
  return {
    month,
    title: monthTitle(month, input.locale ?? 'en'),
    habits: input.habits
      .filter((habit) => !habit.archivedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .slice(0, 2)
      .map((habit) => ({
        id: habit.id,
        title: habit.title,
        icon: habit.icon,
        color: habit.color,
        days: days.map((day) => habitDayStatus(habit, day.dateKey, input.completions, day.inMonth))
      }))
  };
}

function CalendarGrid({ habit }: { habit: SparkCalendarHabitSnapshot }) {
  const rows = Array.from({ length: 6 }, (_, row) => habit.days.slice(row * 7, row * 7 + 7));
  return (
    <FlexWidget style={{ flexDirection: 'column', width: 'match_parent' }}>
      {rows.map((row, rowIndex) => (
        <FlexWidget key={rowIndex} style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between' }}>
          {row.map((status, columnIndex) => (
            <TextWidget
              key={`${rowIndex}-${columnIndex}`}
              text={status === 'completed' ? '✓' : ''}
              style={{
                width: 17,
                height: 17,
                margin: 1,
                borderRadius: 5,
                textAlign: 'center',
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: '700',
                backgroundColor:
                  status === 'completed'
                    ? habit.color as `#${string}`
                    : status === 'scheduled' || status === 'flexible'
                      ? '#273049'
                      : status === 'outside'
                        ? '#0B1020'
                        : '#151C2E'
              }}
            />
          ))}
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

export function SparkCalendarWidget({ snapshot }: { snapshot: SparkCalendarSnapshot }) {
  return (
    <FlexWidget
      accessibilityLabel={`${snapshot.title}. ${snapshot.habits.length} habits. Tap to open the calendar.`}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'spark://journey' }}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: 24,
        backgroundColor: '#0B1020',
        padding: 14,
        flexDirection: 'column'
      }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <TextWidget text="✦  HABIT CALENDAR" style={{ color: '#20B8B2', fontSize: 11, fontWeight: '700' }} />
        <TextWidget text={snapshot.title} style={{ color: '#D7DCEC', fontSize: 11, fontWeight: '700' }} />
      </FlexWidget>
      {snapshot.habits.length ? (
        <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
          {snapshot.habits.map((habit) => (
            <FlexWidget key={habit.id} style={{ width: 134, flexDirection: 'column', marginRight: 6 }}>
              <TextWidget text={`${habit.icon} ${habit.title}`} maxLines={1} style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginBottom: 5 }} />
              <CalendarGrid habit={habit} />
            </FlexWidget>
          ))}
        </FlexWidget>
      ) : (
        <FlexWidget style={{ width: 'match_parent', height: 'match_parent', alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget text="Create a habit to begin" style={{ color: '#D7DCEC', fontSize: 14, fontWeight: '700' }} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}
