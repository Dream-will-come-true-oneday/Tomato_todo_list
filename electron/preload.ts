import { contextBridge, ipcRenderer } from 'electron';
import type { DailyScheduleSettings } from '../src/domain/types';
import type { ScheduleReminder } from '../src/domain/dailySchedule';

contextBridge.exposeInMainWorld('desktopBridge', {
  isDesktop: true,
  syncDailySchedule: (settings: DailyScheduleSettings) => ipcRenderer.invoke('daily-schedule:sync', settings),
  onDailyScheduleReminder: (listener: (reminder: ScheduleReminder) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, reminder: Omit<ScheduleReminder, 'scheduledAt'> & { scheduledAt: string }) => {
      listener({ ...reminder, scheduledAt: new Date(reminder.scheduledAt) });
    };
    ipcRenderer.on('daily-schedule:reminder', wrapped);
    return () => ipcRenderer.removeListener('daily-schedule:reminder', wrapped);
  },
  onOpenDailySchedule: (listener: () => void) => {
    const wrapped = () => listener();
    ipcRenderer.on('daily-schedule:open', wrapped);
    return () => ipcRenderer.removeListener('daily-schedule:open', wrapped);
  },
  getAutoLaunch: () => ipcRenderer.invoke('auto-launch:get'),
  setAutoLaunch: (enabled: boolean) => ipcRenderer.invoke('auto-launch:set', enabled),
  saveFullBackup: (contents: string, suggestedName: string) =>
    ipcRenderer.invoke('backup:save', { contents, suggestedName })
});
