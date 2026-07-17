import type { Completion, Habit } from '@spark/domain';
import {
  progressShareText,
  progressWinLabel,
  toggleSharedWin
} from './progressSharing';

const habit: Habit = {
  id: 'habit',
  title: 'Read',
  color: '#fff',
  icon: '📚',
  variants: [
    { id: 'tiny', kind: 'tiny', label: 'One line', targetMinutes: 1, reward: 1 }
  ],
  schedule: { type: 'daily' },
  reminderEnabled: false,
  priority: 1,
  contexts: ['anywhere'],
  createdAt: '2026-07-01T00:00:00.000Z',
  sortOrder: 0
};

const completion: Completion = {
  id: 'win',
  habitId: 'habit',
  variantId: 'tiny',
  variantKind: 'tiny',
  reward: 1,
  occurredAt: '2026-07-16T10:00:00.000Z',
  loggedAt: '2026-07-16T10:00:00.000Z',
  localDate: '2026-07-16',
  source: 'today'
};

describe('deliberate progress sharing', () => {
  it('labels only the selected local completion and has a private fallback', () => {
    expect(progressWinLabel(completion, [habit])).toBe('📚 One line');
    expect(progressWinLabel(undefined, [])).toBe('✦ A private win');
  });

  it('adds, removes, and enforces the calm five-win limit', () => {
    expect(toggleSharedWin([], 'a').selected).toEqual(['a']);
    expect(toggleSharedWin(['a'], 'a').selected).toEqual([]);
    expect(toggleSharedWin(['a', 'b'], 'c', 2)).toEqual({
      selected: ['a', 'b'],
      atLimit: true
    });
  });

  it('creates explicit text with no recipient or account information', () => {
    const text = progressShareText(['win'], [completion], [habit]);
    expect(text).toContain('• 📚 One line');
    expect(text).toContain('Selected and shared from Spark');
    expect(text).not.toContain('email');
    expect(text).not.toContain('recipient');
  });
});
