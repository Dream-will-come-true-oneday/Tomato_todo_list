import { BellRing, CalendarRange, Clock3, Download, RefreshCw, Settings, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getDesktopBridge, type UpdateStatus } from '../desktopBridge';
import { parseAppDataExportEnvelope, serializeAppDataExport } from '../domain/storage';
import type { AppData, DailyScheduleSettings, TimerPreset } from '../domain/types';
import { backupFileName, saveBackupFile } from '../lib/backupFile';

function DesktopNotificationButton() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  async function requestDesktopNotification() {
    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission);
  }

  const label =
    permission === 'granted'
      ? '桌面提醒已开启'
      : permission === 'denied'
        ? '桌面提醒未授权'
        : permission === 'unsupported'
          ? '不支持桌面提醒'
          : '开启桌面提醒';

  return (
    <button
      className="ghost-button notification-button"
      type="button"
      disabled={permission === 'granted' || permission === 'denied' || permission === 'unsupported'}
      onClick={requestDesktopNotification}
    >
      <BellRing size={17} />
      {label}
    </button>
  );
}
type PendingDataImport = {
  fileName: string;
  envelope: NonNullable<ReturnType<typeof parseAppDataExportEnvelope>>;
};

export function GlobalSettingsDialog({
  data,
  activePreset,
  desktopBridge,
  onClose,
  onUpdatePreset,
  onUpdateDailySchedule,
  onReplaceData
}: {
  data: AppData;
  activePreset: TimerPreset;
  desktopBridge: ReturnType<typeof getDesktopBridge>;
  onClose: () => void;
  onUpdatePreset: (preset: TimerPreset, patch: Partial<TimerPreset>) => void;
  onUpdateDailySchedule: (settings: DailyScheduleSettings) => void;
  onReplaceData: (data: AppData) => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<PendingDataImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const settings = data.dailySchedule;
  const incompleteCount = data.todos.filter((todo) => todo.status !== 'completed' && todo.status !== 'archived').length;
  const completedCount = data.todos.filter((todo) => todo.status === 'completed').length;

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busyRef.current) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )].filter((element) => element.offsetParent !== null || element === document.activeElement);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (!desktopBridge) return;
    let disposed = false;
    void desktopBridge.getAutoLaunch().then((enabled) => {
      if (!disposed && enabled !== settings.autoLaunch) {
        onUpdateDailySchedule({ ...settings, autoLaunch: enabled });
      }
    });
    return () => {
      disposed = true;
    };
  }, [desktopBridge]);

  useEffect(() => {
    if (!desktopBridge) return;
    let disposed = false;
    void desktopBridge.getAppVersion().then((version) => {
      if (!disposed) setAppVersion(version);
    });
    const unsubscribe = desktopBridge.onUpdateStatus((status) => {
      if (!disposed) setUpdateStatus(status);
    });
    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [desktopBridge]);

  async function handleCheckForUpdate() {
    if (!desktopBridge) return;
    setUpdateStatus({ phase: 'checking' });
    const result = await desktopBridge.checkForUpdate();
    if (result.phase !== 'checking') setUpdateStatus(result);
  }

  async function handleDownloadUpdate() {
    if (!desktopBridge) return;
    setUpdateStatus({ phase: 'downloading', percent: 0 });
    await desktopBridge.downloadUpdate();
  }

  async function toggleScheduleSystemReminder() {
    if (settings.desktopNotificationEnabled) {
      onUpdateDailySchedule({ ...settings, desktopNotificationEnabled: false });
      return;
    }
    if (desktopBridge) {
      onUpdateDailySchedule({ ...settings, desktopNotificationEnabled: true });
      return;
    }
    if (!('Notification' in window)) {
      setMessage('当前浏览器不支持系统提醒');
      return;
    }
    const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
    if (permission !== 'granted') {
      setMessage('系统提醒权限未开启');
      return;
    }
    onUpdateDailySchedule({ ...settings, desktopNotificationEnabled: true });
  }

  async function toggleAutoLaunch(enabled: boolean) {
    if (!desktopBridge) return;
    const actual = await desktopBridge.setAutoLaunch(enabled);
    onUpdateDailySchedule({ ...settings, autoLaunch: actual });
    if (actual !== enabled) setMessage('开机启动设置未能应用，请检查系统权限');
  }

  async function exportAllData(label: '完整备份' | '导入前备份') {
    setBusy(true);
    setMessage(null);
    const result = await saveBackupFile(serializeAppDataExport(data), backupFileName(label), desktopBridge);
    setBusy(false);
    if (result.status === 'saved') {
      setMessage(label === '完整备份' ? '全部软件数据已成功导出' : '当前数据备份成功');
    } else if (result.status === 'cancelled') {
      setMessage('已取消保存，数据没有发生变化');
    } else {
      setMessage(`导出失败：${result.message}`);
    }
    return result;
  }

  async function selectImportFile(file: File | null) {
    if (!file) return;
    const envelope = parseAppDataExportEnvelope(await file.text());
    if (!envelope) {
      setPendingImport(null);
      setMessage('无法导入：请选择有效且受支持的完整备份 JSON');
      return;
    }
    setMessage(null);
    setPendingImport({ fileName: file.name, envelope });
  }

  async function confirmImport() {
    if (!pendingImport) return;
    const backupResult = await exportAllData('导入前备份');
    if (backupResult.status !== 'saved') return;

    setBusy(true);
    let nextData = pendingImport.envelope.data;
    if (desktopBridge) {
      try {
        const actualAutoLaunch = await desktopBridge.setAutoLaunch(nextData.dailySchedule.autoLaunch);
        if (actualAutoLaunch !== nextData.dailySchedule.autoLaunch) {
          nextData = {
            ...nextData,
            dailySchedule: { ...nextData.dailySchedule, autoLaunch: actualAutoLaunch }
          };
        }
      } catch {
        nextData = {
          ...nextData,
          dailySchedule: { ...nextData.dailySchedule, autoLaunch: false }
        };
      }
    }
    onReplaceData(nextData);
    window.localStorage.setItem('pomodoro-todo-app:desktop-migration-tip', 'dismissed');
    setPendingImport(null);
    setBusy(false);
    setMessage('完整数据已恢复');
  }

  const importData = pendingImport?.envelope.data;
  const importedAt = pendingImport
    ? new Date(pendingImport.envelope.exportedAt).toLocaleString('zh-CN', { hour12: false })
    : '';

  return (
    <div
      className="settings-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-dialog-title"
      >
        <header className="settings-dialog-header">
          <div>
            <span>偏好与备份</span>
            <h2 id="settings-dialog-title">设置</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="icon-button settings-close-button"
            type="button"
            aria-label="关闭设置"
            disabled={busy}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>

        <div className="settings-dialog-content">
          <section className="settings-section" aria-labelledby="pomodoro-settings-title">
            <div className="settings-section-heading">
              <Clock3 size={19} />
              <div>
                <h3 id="pomodoro-settings-title">番茄钟提醒</h3>
                <span>{activePreset.name}</span>
              </div>
            </div>
            <div className="settings-controls">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={activePreset.soundEnabled}
                  onChange={(event) => onUpdatePreset(activePreset, { soundEnabled: event.target.checked })}
                />
                提醒声音
              </label>
              <DesktopNotificationButton />
            </div>
          </section>

          <section className="settings-section" aria-labelledby="schedule-settings-title">
            <div className="settings-section-heading">
              <CalendarRange size={19} />
              <div>
                <h3 id="schedule-settings-title">每日安排提醒</h3>
                <span>{settings.items.filter((item) => item.enabled).length} 项已启用</span>
              </div>
            </div>
            <div className="settings-controls">
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(event) => onUpdateDailySchedule({ ...settings, enabled: event.target.checked })}
                />
                安排提醒
              </label>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(event) => onUpdateDailySchedule({ ...settings, soundEnabled: event.target.checked })}
                />
                提醒声音
              </label>
              <button className="ghost-button" type="button" onClick={() => void toggleScheduleSystemReminder()}>
                <BellRing size={17} />
                {settings.desktopNotificationEnabled ? '关闭系统提醒' : '开启系统提醒'}
              </button>
            </div>
          </section>

          <section className="settings-section" aria-labelledby="desktop-settings-title">
            <div className="settings-section-heading">
              <Settings size={19} />
              <div>
                <h3 id="desktop-settings-title">桌面设置</h3>
                <span>{desktopBridge ? 'Windows 桌面版' : '浏览器模式'}</span>
              </div>
            </div>
            <div className="settings-controls">
              <label className="toggle-row" title={desktopBridge ? undefined : '仅桌面版可用'}>
                <input
                  type="checkbox"
                  checked={settings.autoLaunch}
                  disabled={!desktopBridge}
                  onChange={(event) => void toggleAutoLaunch(event.target.checked)}
                />
                开机启动
              </label>
            </div>
          </section>

          <section className="settings-section update-settings-section" aria-labelledby="update-settings-title">
            <div className="settings-section-heading">
              <RefreshCw size={19} />
              <div>
                <h3 id="update-settings-title">软件更新</h3>
                <span>{appVersion ? `当前版本 v${appVersion}` : '检查获取最新版本'}</span>
              </div>
            </div>
            {!desktopBridge && <p className="update-status-text">浏览器模式不支持应用内更新，请下载最新桌面版安装包。</p>}
            {desktopBridge && updateStatus === null && (
              <div className="data-action-row">
                <button type="button" onClick={() => void handleCheckForUpdate()}>
                  <RefreshCw size={17} />
                  检查更新
                </button>
              </div>
            )}
            {desktopBridge && updateStatus && (
              <div className="update-status" role="status">
                {updateStatus.phase === 'checking' && <p className="update-status-text">正在检查更新…</p>}
                {updateStatus.phase === 'not-available' && <p className="update-status-text">已是最新版本</p>}
                {updateStatus.phase === 'unsupported' && <p className="update-status-text">开发环境暂不支持应用内更新</p>}
                {updateStatus.phase === 'available' && (
                  <>
                    <p className="update-status-text">发现新版本 v{updateStatus.version}</p>
                    <div className="data-action-row">
                      <button type="button" onClick={() => void handleDownloadUpdate()}>
                        <Download size={17} />
                        立即下载
                      </button>
                      <button className="ghost-button" type="button" onClick={() => setUpdateStatus(null)}>
                        以后再说
                      </button>
                    </div>
                  </>
                )}
                {updateStatus.phase === 'downloading' && (
                  <>
                    <p className="update-status-text">正在下载新版本 {Math.round(updateStatus.percent)}%</p>
                    <div className="update-progress" aria-hidden="true">
                      <div className="update-progress-bar" style={{ width: `${Math.min(100, Math.max(0, updateStatus.percent))}%` }} />
                    </div>
                  </>
                )}
                {updateStatus.phase === 'downloaded' && (
                  <>
                    <p className="update-status-text">新版本 v{updateStatus.version} 已就绪</p>
                    <div className="data-action-row">
                      <button type="button" onClick={() => void desktopBridge.installUpdate()}>
                        <RefreshCw size={17} />
                        重启并安装
                      </button>
                      <button className="ghost-button" type="button" onClick={() => setUpdateStatus(null)}>
                        以后再说
                      </button>
                    </div>
                  </>
                )}
                {updateStatus.phase === 'error' && (
                  <>
                    <p className="update-status-text">{updateStatus.message}</p>
                    <div className="data-action-row">
                      <button type="button" onClick={() => void handleCheckForUpdate()}>
                        <RefreshCw size={17} />
                        重试
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="settings-section data-settings-section" aria-labelledby="data-settings-title">
            <div className="settings-section-heading">
              <Download size={19} />
              <div>
                <h3 id="data-settings-title">数据管理</h3>
                <span>完整持久数据</span>
              </div>
            </div>
            <div className="backup-summary" aria-label="当前数据摘要">
              <div><strong>{incompleteCount}</strong><span>未完成待办</span></div>
              <div><strong>{completedCount}</strong><span>已完成待办</span></div>
              <div><strong>{data.pomodoroRecords.length}</strong><span>番茄记录</span></div>
              <div><strong>{data.backlogItems.length}</strong><span>灵感记录</span></div>
            </div>
            <div className="data-action-row">
              <button type="button" disabled={busy} onClick={() => void exportAllData('完整备份')}>
                <Download size={17} />
                一键导出全部数据
              </button>
              <button className="ghost-button" type="button" disabled={busy} onClick={() => importInputRef.current?.click()}>
                <Upload size={17} />
                从备份恢复
              </button>
              <input
                ref={importInputRef}
                className="visually-hidden"
                type="file"
                accept="application/json,.json"
                aria-label="选择完整数据备份"
                onChange={(event) => {
                  void selectImportFile(event.target.files?.[0] ?? null);
                  event.target.value = '';
                }}
              />
            </div>

            {pendingImport && importData && (
              <div className="backup-import-confirmation" role="alert">
                <div>
                  <strong>{pendingImport.fileName}</strong>
                  <span>导出于 {importedAt}</span>
                </div>
                <dl>
                  <div><dt>待办</dt><dd>{importData.todos.length}</dd></div>
                  <div><dt>番茄</dt><dd>{importData.pomodoroRecords.length}</dd></div>
                  <div><dt>灵感</dt><dd>{importData.backlogItems.length}</dd></div>
                  <div><dt>复盘</dt><dd>{importData.reflections.length + importData.weeklyReflections.length}</dd></div>
                </dl>
                <p>恢复将完整替换当前数据，确认后会先要求保存当前数据备份。</p>
                <div>
                  <button type="button" disabled={busy} onClick={() => void confirmImport()}>备份当前数据并恢复</button>
                  <button className="ghost-button" type="button" disabled={busy} onClick={() => setPendingImport(null)}>取消</button>
                </div>
              </div>
            )}
          </section>
        </div>

        {message && <p className="settings-status" role="status">{message}</p>}
      </section>
    </div>
  );
}
