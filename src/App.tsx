import {
  AlarmClock,
  Settings,
  X
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { type TimerPanelHandle, type TimerSnapshot } from './components/TimerPanel';
import { ToastHost, useToasts } from './components/Toast';
import { TopNav } from './components/TopNav';
import { GlobalSettingsDialog } from './components/GlobalSettingsDialog';
import { getDesktopBridge } from './desktopBridge';
import type { AppAction } from './domain/appReducer';
import {
  createBacklogItem,
  createInspirationTag,
  createTypeTag
} from './domain/defaultData';
import {
  getLatestMissedScheduleReminder,
  getScheduleReminderKey,
  type ScheduleReminder
} from './domain/dailySchedule';
import { playReminderSound } from './domain/reminderSound';
import { loadAppData, saveAppData } from './domain/storage';
import { isTodayPomodoroTodo, toDateKey } from './domain/todoFilters';
import { initUndoableState, undoableAppReducer } from './domain/undo';
import type {
  AppData,
  DailyScheduleSettings,
  TimerPreset,
  Todo
} from './domain/types';
import { buildTodayPlanTodos } from './domain/todayPlan';
import { currentIso } from './lib/dateUtils';
import { isEditableTarget } from './lib/keyboard';
import type { Page } from './lib/navigation';
import HomePage from './pages/HomePage';
import TodoHubPage from './pages/TodoHubPage';
import TodayPlanPage from './pages/TodayPlanPage';
import DailySchedulePage from './pages/DailySchedulePage';
import PomodoroPage from './pages/PomodoroPage';
import IncompleteTodosPage from './pages/IncompleteTodosPage';
import CompletedTodosPage from './pages/CompletedTodosPage';
import WeeklySummaryPage from './pages/WeeklySummaryPage';
import BacklogPage from './pages/BacklogPage';
import CompletedInspirationPage from './pages/CompletedInspirationPage';

function getUniquePresetName(baseName: string, presets: TimerPreset[]) {
  const existingNames = new Set(presets.map((preset) => preset.name));
  if (!existingNames.has(baseName)) return baseName;

  let index = 2;
  while (existingNames.has(`${baseName} ${index}`)) {
    index += 1;
  }
  return `${baseName} ${index}`;
}

const BROWSER_SCHEDULE_REMINDER_KEY = 'pomodoro-todo-app:daily-schedule-last-reminder';


export default function App() {
  const [initialLoad] = useState(loadAppData);
  const [undoState, dispatchUndoable] = useReducer(undoableAppReducer, initialLoad.data, initUndoableState);
  const data = undoState.data;
  const [page, setPage] = useState<Page>('home');
  const [newTodoFocusSignal, setNewTodoFocusSignal] = useState(0);
  const [recovered, setRecovered] = useState(initialLoad.recovered);
  const [selectedPomodoroTodoId, setSelectedPomodoroTodoId] = useState<string | null>(null);
  const [todoTagFocusId, setTodoTagFocusId] = useState<string | null>(null);
  const [timerSnapshot, setTimerSnapshot] = useState<TimerSnapshot | null>(null);
  const [scheduleReminder, setScheduleReminder] = useState<ScheduleReminder | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const scheduleReminderTimerRef = useRef<number | null>(null);
  const timerPanelRef = useRef<TimerPanelHandle>(null);
  const desktopBridge = useMemo(getDesktopBridge, []);
  const today = toDateKey();

  const undoStateRef = useRef(undoState);
  undoStateRef.current = undoState;
  const settingsOpenRef = useRef(settingsOpen);
  settingsOpenRef.current = settingsOpen;
  const { toasts, showToast, dismissToast } = useToasts();
  const undoToastIdRef = useRef<number | null>(null);
  const prevUndoTopSeqRef = useRef<number | undefined>(undefined);

  function flashUndoToast(message: string, canUndo: boolean, duration: number) {
    if (undoToastIdRef.current !== null) dismissToast(undoToastIdRef.current);
    undoToastIdRef.current = showToast(
      canUndo ? `${message} — Ctrl+Z 可撤销` : message,
      {
        action: canUndo ? { label: '撤销', perform: performUndo } : undefined,
        duration
      }
    );
  }

  function hideUndoToast() {
    if (undoToastIdRef.current !== null) {
      dismissToast(undoToastIdRef.current);
      undoToastIdRef.current = null;
    }
  }

  function performUndo() {
    const stack = undoStateRef.current.undoStack;
    if (stack.length === 0) {
      // 导入备份等场景可能已清空撤销栈而 toast 尚未消失，此时隐藏 toast，避免点击“撤销”静默无效
      hideUndoToast();
      return;
    }
    dispatchUndoable({ type: 'undo' });
    // 撤销后栈顶变为原第二条记录（或空栈），提前同步 ref，避免下方 effect 把 undo 误判为新入栈
    prevUndoTopSeqRef.current = stack[1]?.seq;
    flashUndoToast('已撤销', false, 2000);
  }

  function performRedo() {
    const entry = undoStateRef.current.redoStack[0];
    if (!entry) return;
    dispatchUndoable({ type: 'redo' });
    // 重做会把该条目压回撤销栈顶，提前同步 ref，避免下方 effect 把 redo 误判为新入栈
    prevUndoTopSeqRef.current = entry.seq;
    flashUndoToast(`已重做：${entry.label}`, true, 5000);
  }

  const performUndoRef = useRef(performUndo);
  performUndoRef.current = performUndo;
  const performRedoRef = useRef(performRedo);
  performRedoRef.current = performRedo;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const top = undoState.undoStack[0];
    const previousSeq = prevUndoTopSeqRef.current;
    prevUndoTopSeqRef.current = top?.seq;
    // 以栈顶 seq（而非深度）判定新入栈：栈满 UNDO_STACK_LIMIT 条后深度不再增长，旧的深度判定会导致 toast 永久静默
    if (top && top.seq !== previousSeq) {
      flashUndoToast(top.label, true, 8000);
    }
  }, [undoState.undoStack]);

  useEffect(() => {
    // 数字键 1-4 切换 TopNav 前四页；N 跳转未完成页并聚焦新增输入
    const SHORTCUT_PAGES: Page[] = ['home', 'pomodoro', 'dailySchedule', 'todoHub'];
    function handleGlobalShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        const key = event.key.toLowerCase();
        if (key !== 'z' && key !== 'y') return;
        if (isEditableTarget(event.target)) return;
        if (settingsOpenRef.current) return;
        // 对话框与内联确认条挂起期间 Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y 不应触发撤销或重做
        if (
          document.querySelector(
            '[role="dialog"][aria-modal="true"], [role="alertdialog"], .inline-confirmation'
          )
        ) {
          return;
        }
        event.preventDefault();
        // Ctrl+Y 或 Ctrl+Shift+Z 走重做；Ctrl+Z 保持撤销
        if (key === 'y' || event.shiftKey) {
          performRedoRef.current();
          return;
        }
        performUndoRef.current();
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      if (isEditableTarget(event.target)) return;
      if (settingsOpenRef.current) return;
      if (
        document.querySelector(
          '[role="dialog"][aria-modal="true"], [role="alertdialog"], .inline-confirmation'
        )
      ) {
        return;
      }
      if (event.key === 'n' || event.key === 'N') {
        event.preventDefault();
        navigateRef.current('incomplete');
        setNewTodoFocusSignal((current) => current + 1);
        return;
      }
      const shortcutPageIndex = SHORTCUT_PAGES.findIndex((_, index) => event.key === String(index + 1));
      if (shortcutPageIndex === -1) return;
      event.preventDefault();
      navigateRef.current(SHORTCUT_PAGES[shortcutPageIndex]);
    }

    document.addEventListener('keydown', handleGlobalShortcut);
    return () => document.removeEventListener('keydown', handleGlobalShortcut);
  }, []);

  useEffect(() => {
    if (recovered) return;
    saveAppData(data);
  }, [data, recovered]);
  function presentScheduleReminder(reminder: ScheduleReminder, allowBrowserNotification: boolean) {
    playReminderSound(data.dailySchedule.soundEnabled);
    setScheduleReminder(reminder);
    if (scheduleReminderTimerRef.current !== null) window.clearTimeout(scheduleReminderTimerRef.current);
    scheduleReminderTimerRef.current = window.setTimeout(() => setScheduleReminder(null), 8000);

    if (
      allowBrowserNotification &&
      data.dailySchedule.desktopNotificationEnabled &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification('每日安排提醒', { body: reminder.rule ? `${reminder.title}：${reminder.rule}` : reminder.title });
    }
  }

  useEffect(() => {
    if (!desktopBridge) return;
    void desktopBridge.syncDailySchedule(data.dailySchedule);
  }, [data.dailySchedule, desktopBridge]);

  useEffect(() => {
    if (!desktopBridge) return;
    return desktopBridge.onDailyScheduleReminder((reminder) => presentScheduleReminder(reminder, false));
  }, [data.dailySchedule.soundEnabled, desktopBridge]);

  useEffect(() => {
    if (!desktopBridge) return;
    return desktopBridge.onOpenDailySchedule(() => navigate('dailySchedule'));
  }, [desktopBridge, page]);

  useEffect(() => {
    if (desktopBridge || !data.dailySchedule.enabled) return;

    const checkSchedule = () => {
      const lastKey = window.localStorage.getItem(BROWSER_SCHEDULE_REMINDER_KEY);
      const reminder = getLatestMissedScheduleReminder(data.dailySchedule, new Date(), lastKey);
      if (!reminder) return;
      const reminderKey = getScheduleReminderKey(reminder.dateKey, reminder.itemId);
      window.localStorage.setItem(BROWSER_SCHEDULE_REMINDER_KEY, reminderKey);
      presentScheduleReminder(reminder, true);
    };

    checkSchedule();
    const interval = window.setInterval(checkSchedule, 15000);
    return () => window.clearInterval(interval);
  }, [data.dailySchedule, desktopBridge]);

  useEffect(
    () => () => {
      if (scheduleReminderTimerRef.current !== null) window.clearTimeout(scheduleReminderTimerRef.current);
    },
    []
  );

  const activePreset = useMemo(
    () => data.presets.find((preset) => preset.id === data.activePresetId) ?? data.presets[0],
    [data.activePresetId, data.presets]
  );

  const todayPlanTodos = useMemo(
    () => buildTodayPlanTodos(data.todos, data.todayPlans, today),
    [data.todos, data.todayPlans, today]
  );

  useEffect(() => {
    if (selectedPomodoroTodoId && todayPlanTodos.some((todo) => todo.id === selectedPomodoroTodoId)) return;
    setSelectedPomodoroTodoId(todayPlanTodos[0]?.id ?? null);
  }, [selectedPomodoroTodoId, todayPlanTodos]);

  const selectedPomodoroTodo = todayPlanTodos.find((todo) => todo.id === selectedPomodoroTodoId) ?? null;

  function navigate(nextPage: Page) {
    if (page === 'pomodoro' && nextPage !== 'pomodoro') {
      const snapshot = timerPanelRef.current?.capture();
      if (snapshot) setTimerSnapshot(snapshot);
    }
    setPage(nextPage);
  }

  function dispatchData(action: AppAction, undoLabel?: string) {
    dispatchUndoable({ type: 'data', action, undoLabel });
  }

  function updateTodo(todo: Todo, patch: Partial<Todo>) {
    dispatchData({ type: 'updateTodo', todo: { ...todo, ...patch } });
  }

  function updatePreset(preset: TimerPreset, patch: Partial<TimerPreset>) {
    dispatchData({ type: 'upsertPreset', preset: { ...preset, ...patch } });
  }

  function updateDailySchedule(schedule: DailyScheduleSettings, undoLabel?: string) {
    dispatchData({ type: 'updateDailySchedule', schedule }, undoLabel);
  }

  function replaceData(nextData: AppData) {
    saveAppData(nextData);
    dispatchData({ type: 'replaceData', data: nextData });
    // replaceData 会清空撤销栈，已显示的 toast 所指向的撤销记录已失效，立即关闭
    hideUndoToast();
    prevUndoTopSeqRef.current = undefined;
    setRecovered(false);
    setTimerSnapshot(null);
    setSelectedPomodoroTodoId(null);
  }

  return (
    <main className={`app-frame page-${page}`}>
      {recovered && (
        <div className="recovery-banner">
          本地数据读取失败，已载入默认数据。
          <button type="button" onClick={() => setRecovered(false)}>
            知道了
          </button>
        </div>
      )}

      {scheduleReminder && (
        <div className="schedule-reminder-banner" role="status">
          <AlarmClock size={20} />
          <span>
            <strong>{scheduleReminder.title}</strong>
            {scheduleReminder.rule && <small>{scheduleReminder.rule}</small>}
          </span>
          <button type="button" aria-label="关闭每日安排提醒" onClick={() => setScheduleReminder(null)}>
            <X size={18} />
          </button>
        </div>
      )}
      <button
        className="global-settings-trigger"
        type="button"
        aria-label="打开设置"
        title="设置"
        onClick={() => setSettingsOpen(true)}
      >
        <Settings size={20} />
      </button>
      {page !== 'home' && <TopNav page={page} onNavigate={navigate} />}

      {page === 'home' && <HomePage onNavigate={navigate} />}
      {page === 'pomodoro' && (
        <PomodoroPage
          activePreset={activePreset}
          data={data}
          selectedTodo={selectedPomodoroTodo}
          todayTodos={todayPlanTodos}
          onNavigate={navigate}
          onSelectTodo={setSelectedPomodoroTodoId}
          onSetActivePreset={(presetId) => dispatchData({ type: 'setActivePreset', presetId })}
          onUpdatePreset={updatePreset}
          onCreatePreset={() =>
            dispatchData({
              type: 'upsertPreset',
              preset: {
                ...activePreset,
                id: `preset-${crypto.randomUUID()}`,
                name: getUniquePresetName('新类型', data.presets)
              }
            })
          }
          onDeletePreset={(presetId) => dispatchData({ type: 'deletePreset', presetId })}
          onSessionComplete={(payload) => dispatchData({ type: 'completeFocusSession', ...payload })}
          timerPanelRef={timerPanelRef}
          timerSnapshot={timerSnapshot}
        />
      )}
      {page === 'dailySchedule' && (
        <DailySchedulePage
          settings={data.dailySchedule}
          onUpdate={updateDailySchedule}
        />
      )}
      {page === 'todoHub' && <TodoHubPage data={data} todayPlanTodos={todayPlanTodos} onNavigate={navigate} />}
      {page === 'todayPlan' && (
        <TodayPlanPage
          dateKey={today}
          todayPlanTodos={todayPlanTodos}
          onRemoveTodo={(todo) =>
            dispatchData({
              type: 'removeTodayPlanTodo',
              date: today,
              todoId: todo.id,
              isDefaultTodo: isTodayPomodoroTodo(todo, today)
            })
          }
        />
      )}
      {page === 'incomplete' && (
        <IncompleteTodosPage
          data={data}
          todayPlanTodos={todayPlanTodos}
          onAddTypeTag={(name, color) => dispatchData({ type: 'addTypeTag', tag: createTypeTag(name, color) })}
          onDeleteTypeTag={(tagId) => dispatchData({ type: 'deleteTypeTag', tagId })}
          onAddTodo={(todo) => dispatchData({ type: 'addTodo', todo })}
          onAddTodayPlanTodos={(todoIds) =>
            todoIds.forEach((todoId) => dispatchData({ type: 'addTodayPlanTodo', date: today, todoId }))
          }
          onDeleteTodo={(todoId) => dispatchData({ type: 'deleteTodo', todoId })}
          onUpdateTodo={updateTodo}
          onToggleTodoCheckIn={(todoId) => dispatchData({ type: 'toggleTodoCheckIn', todoId, date: today })}
          focusTodoId={todoTagFocusId}
          onFocusHandled={() => setTodoTagFocusId(null)}
          focusNewTodoSignal={newTodoFocusSignal}
          onToast={showToast}
        />
      )}
      {page === 'completed' && (
        <CompletedTodosPage
          data={data}
          onUpdateTodo={updateTodo}
          onSaveReflection={(date, content) =>
            dispatchData({ type: 'upsertReflection', reflection: { date, content, updatedAt: currentIso() } })
          }
          onOpenTodoTags={(todoId) => {
            setTodoTagFocusId(todoId);
            navigate('incomplete');
          }}
        />
      )}
      {page === 'weeklySummary' && (
        <WeeklySummaryPage
          data={data}
          onSaveReflection={(weekStart, content) =>
            dispatchData({ type: 'upsertWeeklyReflection', reflection: { weekStart, content, updatedAt: currentIso() } })
          }
        />
      )}
      {page === 'backlog' && (
        <BacklogPage
          items={data.backlogItems}
          tags={data.inspirationTags}
          onAddItem={(title) => dispatchData({ type: 'addBacklogItem', item: createBacklogItem(title) })}
          onDeleteItem={(itemId) => dispatchData({ type: 'deleteBacklogItem', itemId })}
          onUpdateItem={(item) => dispatchData({ type: 'updateBacklogItem', item })}
          onAddTag={(name, color) => dispatchData({ type: 'addInspirationTag', tag: createInspirationTag(name, color) })}
          onDeleteTag={(tagId) => dispatchData({ type: 'deleteInspirationTag', tagId })}
          onNavigate={navigate}
        />
      )}
      {page === 'completedBacklog' && (
        <CompletedInspirationPage
          items={data.backlogItems}
          tags={data.inspirationTags}
          onUpdateItem={(item) => dispatchData({ type: 'updateBacklogItem', item })}
          onNavigate={navigate}
        />
      )}
      {settingsOpen && (
        <GlobalSettingsDialog
          data={data}
          activePreset={activePreset}
          desktopBridge={desktopBridge}
          onClose={closeSettings}
          onUpdatePreset={updatePreset}
          onUpdateDailySchedule={updateDailySchedule}
          onReplaceData={replaceData}
        />
      )}
      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}

