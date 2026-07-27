import type { DailyScheduleItem, DailyScheduleSettings } from './types';
import { toDateKey } from './todoFilters';

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const REMINDER_WINDOW_MS = 10 * 60 * 1000;

export type ScheduleReminder = {
  itemId: string;
  dateKey: string;
  scheduledAt: Date;
  title: string;
  rule: string;
};

export function isValidScheduleTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

export function scheduleTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function sortScheduleItems(items: DailyScheduleItem[]) {
  return [...items].sort(
    (a, b) => scheduleTimeToMinutes(a.startTime) - scheduleTimeToMinutes(b.startTime) || a.id.localeCompare(b.id)
  );
}

function dateFromKey(dateKey: string, time: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function dateKeyOffset(date: Date, offset: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + offset);
  return toDateKey(result);
}

export function getCurrentScheduleItem(items: DailyScheduleItem[], now = new Date()) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sorted = sortScheduleItems(items.filter((item) => item.enabled));

  return (
    sorted.find((item, index) => {
      const startMinutes = scheduleTimeToMinutes(item.startTime);
      const nextStartMinutes = sorted[index + 1] ? scheduleTimeToMinutes(sorted[index + 1].startTime) : null;
      const endMinutes = item.endTime ? scheduleTimeToMinutes(item.endTime) : nextStartMinutes ?? 24 * 60;
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }) ?? null
  );
}

export function getNextScheduleItem(items: DailyScheduleItem[], now = new Date()) {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const sorted = sortScheduleItems(items.filter((item) => item.enabled));
  return sorted.find((item) => scheduleTimeToMinutes(item.startTime) > currentMinutes) ?? sorted[0] ?? null;
}

export function getScheduleReminderKey(dateKey: string, itemId: string) {
  return `${dateKey}:${itemId}`;
}

function createReminder(item: DailyScheduleItem, dateKey: string) {
  return {
    itemId: item.id,
    dateKey,
    scheduledAt: dateFromKey(dateKey, item.startTime),
    title: item.title,
    rule: item.rule
  } satisfies ScheduleReminder;
}

export function getLatestMissedScheduleReminder(
  settings: Pick<DailyScheduleSettings, 'enabled' | 'items'>,
  now = new Date(),
  lastFiredOccurrenceKey: string | null = null
) {
  if (!settings.enabled) return null;

  const candidates = [-1, 0].flatMap((offset) => {
    const dateKey = dateKeyOffset(now, offset);
    return settings.items
      .filter((item) => item.enabled && isValidScheduleTime(item.startTime))
      .map((item) => createReminder(item, dateKey));
  });

  const lastFiredCandidate = candidates.find(
    (candidate) => getScheduleReminderKey(candidate.dateKey, candidate.itemId) === lastFiredOccurrenceKey
  );
  return (
    candidates
      .filter((candidate) => {
        const age = now.getTime() - candidate.scheduledAt.getTime();
        return (
          age >= 0 &&
          age <= REMINDER_WINDOW_MS &&
          getScheduleReminderKey(candidate.dateKey, candidate.itemId) !== lastFiredOccurrenceKey &&
          (!lastFiredCandidate || candidate.scheduledAt > lastFiredCandidate.scheduledAt)
        );
      })
      .sort((a, b) => b.scheduledAt.getTime() - a.scheduledAt.getTime())[0] ?? null
  );
}

export { REMINDER_WINDOW_MS };
