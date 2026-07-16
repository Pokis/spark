import type { AppSettings } from '../data/models';

export function endOfToday(now = new Date()): string {
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  return end.toISOString();
}

export function isQuietNow(
  settings: Pick<AppSettings, 'quietUntil'>,
  now = new Date()
): boolean {
  return Boolean(settings.quietUntil && Date.parse(settings.quietUntil) > now.getTime());
}

