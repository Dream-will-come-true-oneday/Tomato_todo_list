import { describe, expect, it } from 'vitest';
import { DEFAULT_DAILY_SCHEDULE_ITEMS, createDefaultDailySchedule } from './defaultData';
import {
  getCurrentScheduleItem,
  getLatestMissedScheduleReminder,
  getNextScheduleItem,
  getScheduleReminderKey,
  isValidScheduleTime,
  REMINDER_WINDOW_MS,
  sortScheduleItems
} from './dailySchedule';
import type { DailyScheduleItem } from './types';

function item(id: string, startTime: string, endTime: string | null = null, enabled = true): DailyScheduleItem {
  return { id, startTime, endTime, title: id, rule: '', enabled };
}

describe('daily schedule', () => {
  it('creates the complete default schedule from the supplied routine', () => {
    const schedule = createDefaultDailySchedule();

    expect(DEFAULT_DAILY_SCHEDULE_ITEMS).toHaveLength(19);
    expect(schedule).toMatchObject({
      enabled: true,
      soundEnabled: true,
      desktopNotificationEnabled: false,
      autoLaunch: false
    });
    expect(schedule.items.map((entry) => entry.startTime)).toEqual([
      '07:30',
      '08:00',
      '08:30',
      '08:35',
      '09:25',
      '09:35',
      '10:25',
      '10:35',
      '11:25',
      '14:00',
      '14:50',
      '15:00',
      '15:50',
      '16:00',
      '16:50',
      '19:30',
      '20:00',
      '21:00',
      '22:30'
    ]);
    expect(schedule.items.find((entry) => entry.startTime === '16:50')?.endTime).toBeNull();
    expect(schedule.items.find((entry) => entry.startTime === '22:30')?.endTime).toBeNull();
  });

  it('validates and sorts local HH:mm schedule times', () => {
    expect(isValidScheduleTime('00:00')).toBe(true);
    expect(isValidScheduleTime('23:59')).toBe(true);
    expect(isValidScheduleTime('24:00')).toBe(false);
    expect(isValidScheduleTime('8:00')).toBe(false);

    expect(sortScheduleItems([item('late', '19:00'), item('early', '07:30')]).map((entry) => entry.id)).toEqual([
      'early',
      'late'
    ]);
  });

  it('uses the next enabled item as the boundary for an open-ended segment', () => {
    const items = [item('evening', '19:30', '20:00'), item('low', '16:50'), item('wake', '07:30', '08:00')];

    expect(getCurrentScheduleItem(items, new Date(2026, 6, 27, 18, 0))?.id).toBe('low');
    expect(getCurrentScheduleItem(items, new Date(2026, 6, 27, 19, 45))?.id).toBe('evening');
    expect(getNextScheduleItem(items, new Date(2026, 6, 27, 22, 0))?.id).toBe('wake');
    expect(getCurrentScheduleItem([{ ...item('disabled', '08:00'), enabled: false }], new Date(2026, 6, 27, 8, 1))).toBeNull();
  });

  it('returns only the latest missed reminder and does not replay older items', () => {
    const settings = {
      enabled: true,
      items: [item('early', '08:00'), item('latest', '08:05')]
    };
    const now = new Date(2026, 6, 27, 8, 9);
    const reminder = getLatestMissedScheduleReminder(settings, now);

    expect(reminder?.itemId).toBe('latest');
    expect(now.getTime() - reminder!.scheduledAt.getTime()).toBeLessThanOrEqual(REMINDER_WINDOW_MS);

    const key = reminder ? getScheduleReminderKey(reminder.dateKey, reminder.itemId) : null;
    expect(getLatestMissedScheduleReminder(settings, now, key)).toBeNull();
    expect(getLatestMissedScheduleReminder(settings, new Date(2026, 6, 27, 8, 20), key)).toBeNull();
  });

  it('ignores disabled, future and stale schedule occurrences', () => {
    const settings = {
      enabled: true,
      items: [item('disabled', '08:00', null, false), item('future', '09:00')]
    };

    expect(getLatestMissedScheduleReminder(settings, new Date(2026, 6, 27, 8, 5))).toBeNull();
    expect(getLatestMissedScheduleReminder(settings, new Date(2026, 6, 27, 8, 11))).toBeNull();
    expect(getLatestMissedScheduleReminder({ ...settings, enabled: false }, new Date(2026, 6, 27, 8, 5))).toBeNull();
  });
});
