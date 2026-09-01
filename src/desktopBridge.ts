import type { DailyScheduleSettings } from './domain/types';
import type { ScheduleReminder } from './domain/dailySchedule';

export type DesktopBridge = {
  isDesktop: true;
  syncDailySchedule: (settings: DailyScheduleSettings) => Promise<void>;
  onDailyScheduleReminder: (listener: (reminder: ScheduleReminder) => void) => () => void;
  onOpenDailySchedule: (listener: () => void) => () => void;
  getAutoLaunch: () => Promise<boolean>;
  setAutoLaunch: (enabled: boolean) => Promise<boolean>;
  checkForUpdate: () => Promise<UpdateStatus>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  onUpdateStatus: (listener: (status: UpdateStatus) => void) => () => void;
  saveFullBackup: (contents: string, suggestedName: string) => Promise<SaveBackupResult>;
};

export type UpdateStatus =
  | { phase: 'checking' }
  | { phase: 'available'; version: string }
  | { phase: 'not-available' }
  | { phase: 'downloading'; percent: number }
  | { phase: 'downloaded'; version: string }
  | { phase: 'error'; message: string }
  | { phase: 'unsupported' };

export type SaveBackupResult =
  | { status: 'saved'; filePath: string }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

export function getDesktopBridge() {
  return (window as { desktopBridge?: DesktopBridge }).desktopBridge;
}
