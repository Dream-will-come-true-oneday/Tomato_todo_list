import type { DailyScheduleSettings } from './domain/types';
import type { ScheduleReminder } from './domain/dailySchedule';

export type DesktopBridge = {
  isDesktop: true;
  syncDailySchedule: (settings: DailyScheduleSettings) => Promise<void>;
  onDailyScheduleReminder: (listener: (reminder: ScheduleReminder) => void) => () => void;
  onOpenDailySchedule: (listener: () => void) => () => void;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  saveFullBackup: (contents: string, suggestedName: string) => Promise<SaveBackupResult>;
};

export type SaveBackupResult =
  | { status: 'saved'; filePath: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export function getDesktopBridge() {
  return window.desktopBridge;
}
