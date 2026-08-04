import { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, Notification, powerMonitor, Tray } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { getLatestMissedScheduleReminder, getScheduleReminderKey, type ScheduleReminder } from '../src/domain/dailySchedule';
import type { DailyScheduleSettings } from '../src/domain/types';

const DEV_URL = 'http://127.0.0.1:5173';
const SCHEDULER_INTERVAL_MS = 15000;

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let dailySchedule: DailyScheduleSettings | null = null;
let schedulerInterval: NodeJS.Timeout | null = null;
let lastFiredOccurrenceKey: string | null = null;

function schedulerStatePath() {
  return path.join(app.getPath('userData'), 'daily-schedule-state.json');
}

function loadSchedulerState() {
  try {
    const state = JSON.parse(fs.readFileSync(schedulerStatePath(), 'utf8')) as { lastFiredOccurrenceKey?: unknown };
    lastFiredOccurrenceKey = typeof state.lastFiredOccurrenceKey === 'string' ? state.lastFiredOccurrenceKey : null;
  } catch {
    lastFiredOccurrenceKey = null;
  }
}

function saveSchedulerState() {
  fs.writeFileSync(schedulerStatePath(), JSON.stringify({ lastFiredOccurrenceKey }), 'utf8');
}

function showWindow(openSchedule = false) {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
  if (openSchedule) mainWindow.webContents.send('daily-schedule:open');
}

function sendReminder(reminder: ScheduleReminder) {
  if (!dailySchedule) return;
  lastFiredOccurrenceKey = getScheduleReminderKey(reminder.dateKey, reminder.itemId);
  saveSchedulerState();

  mainWindow?.webContents.send('daily-schedule:reminder', {
    ...reminder,
    scheduledAt: reminder.scheduledAt.toISOString()
  });

  if (!dailySchedule.desktopNotificationEnabled || !Notification.isSupported()) return;
  const notification = new Notification({
    title: '每日安排提醒',
    body: reminder.rule ? `${reminder.title}：${reminder.rule}` : reminder.title
  });
  notification.on('click', () => showWindow(true));
  notification.show();
}

function checkDailySchedule() {
  if (!dailySchedule) return;
  const reminder = getLatestMissedScheduleReminder(dailySchedule, new Date(), lastFiredOccurrenceKey);
  if (reminder) sendReminder(reminder);
}

function startScheduler() {
  if (schedulerInterval) clearInterval(schedulerInterval);
  checkDailySchedule();
  schedulerInterval = setInterval(checkDailySchedule, SCHEDULER_INTERVAL_MS);
}

function createTray() {
  const trayImagePath = path.join(__dirname, '../../src/assets/longchang-awakening-hero.png');
  const trayImage = nativeImage.createFromPath(trayImagePath).resize({ width: 16, height: 16 });
  tray = new Tray(trayImage);
  tray.setToolTip('番茄时钟与待办');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '打开应用', click: () => showWindow() },
      { label: '打开每日安排', click: () => showWindow(true) },
      { type: 'separator' },
      {
        label: '退出应用',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ])
  );
  tray.on('double-click', () => showWindow());
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1000,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    backgroundColor: '#f4eddd',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  const startedHidden = process.argv.includes('--hidden');
  mainWindow.once('ready-to-show', () => {
    if (!startedHidden) mainWindow?.show();
  });
  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
  });

  if (app.isPackaged) {
    void mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
  } else {
    void mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL ?? DEV_URL);
  }
}

function registerIpc() {
  ipcMain.handle('daily-schedule:sync', (_event, settings: DailyScheduleSettings) => {
    dailySchedule = settings;
    checkDailySchedule();
  });
  ipcMain.handle('auto-launch:get', () => app.getLoginItemSettings().openAtLogin);
  ipcMain.handle('auto-launch:set', (_event, enabled: boolean) => {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: app.getPath('exe'),
      args: enabled ? ['--hidden'] : []
    });
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle('backup:save', async (_event, payload: { contents?: unknown; suggestedName?: unknown }) => {
    if (typeof payload?.contents !== 'string' || typeof payload.suggestedName !== 'string') {
      return { status: 'error', message: '备份内容无效' };
    }

    const suggestedName = path.basename(payload.suggestedName) || 'backup.json';
    try {
      const options = {
        title: '导出全部软件数据',
        defaultPath: path.join(app.getPath('documents'), suggestedName),
        filters: [{ name: 'JSON 数据备份', extensions: ['json'] }]
      };
      const result = mainWindow
        ? await dialog.showSaveDialog(mainWindow, options)
        : await dialog.showSaveDialog(options);
      if (result.canceled || !result.filePath) return { status: 'cancelled' };
      await fs.promises.writeFile(result.filePath, payload.contents, 'utf8');
      return { status: 'saved', filePath: result.filePath };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : '写入备份文件失败' };
    }
  });
}

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
  app.whenReady().then(() => {
    app.setAppUserModelId('com.longchang.pomodoro-todo');
    loadSchedulerState();
    registerIpc();
    createWindow();
    createTray();
    startScheduler();
    powerMonitor.on('resume', checkDailySchedule);
  });

  app.on('activate', () => showWindow());
  app.on('before-quit', () => {
    isQuitting = true;
    if (schedulerInterval) clearInterval(schedulerInterval);
  });
  app.on('window-all-closed', () => {
    // The tray owns the application lifetime on Windows.
  });
}
