import {
  Archive,
  ArrowUpRight,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChartPie,
  Clock3,
  Eye,
  Home,
  Lightbulb,
  ListTodo,
  Plus,
  ScrollText,
  Send,
  Sparkles,
  Tag,
  Trash2
} from 'lucide-react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { RefObject } from 'react';
import ReactMarkdown from 'react-markdown';
import heroImage from './assets/longchang-awakening-hero.png';
import inspirationFountainImage from './assets/inspiration-cupid-fountain.png';
import pomodoroBackgroundImage from './assets/longchang-awakening-pomodoro.png';
import TimerPanel, { type TimerPanelHandle, type TimerSnapshot } from './components/TimerPanel';
import { appReducer } from './domain/appReducer';
import { createBacklogItem, createDefaultTodo, createInspirationTag, createTypeTag } from './domain/defaultData';
import { loadAppData, saveAppData } from './domain/storage';
import { isCompletedOn, isIncompleteTodo, isTodayPomodoroTodo, toDateKey } from './domain/todoFilters';
import { getTodoTimeBadge, isCompletedLate } from './domain/todoStatus';
import { buildWeeklyTodoTree, getCompletedTypeTagShares, getWeekStart, getWeekSummary, type TypeTagShare, type WeeklyTodoNode } from './domain/reporting';
import type { BacklogItem, DailyPomodoroPlan, InspirationTag, PomodoroRecord, TimerPreset, Todo, TodoStatus, TodoTerm, UrgencyTag } from './domain/types';

type Page = 'home' | 'pomodoro' | 'todoHub' | 'todayPlan' | 'incomplete' | 'completed' | 'weeklySummary' | 'backlog' | 'completedBacklog';

type CompletedTodoGroup = {
  parent: Todo;
  parentCompletedOnDate: boolean;
  children: Todo[];
};

type TodoFilterState = {
  status: 'all' | Exclude<TodoStatus, 'archived'>;
  term: 'all' | TodoTerm;
  urgency: 'all' | UrgencyTag | 'both';
  typeTagId: 'all' | string;
};

type TypeTagView = {
  id: string;
  name: string;
  color: string;
};

const defaultTodoFilters: TodoFilterState = {
  status: 'all',
  term: 'all',
  urgency: 'all',
  typeTagId: 'all'
};

const statusLabels: Record<Exclude<TodoStatus, 'archived'>, string> = {
  notStarted: '未开始',
  active: '进行中',
  completed: '已完成'
};

const termLabels: Record<TodoTerm, string> = {
  short: '短期',
  long: '长期'
};

const urgencyLabels: Record<UrgencyTag, string> = {
  urgent: '紧急',
  important: '重要'
};

function currentIso() {
  return new Date().toISOString();
}

function asInputDate(value: string | null) {
  return value?.slice(0, 10) ?? '';
}

function nullableDate(value: string) {
  return value || null;
}

function compareNullableDate(a: string | null, b: string | null) {
  const aValue = a ?? '9999-12-31';
  const bValue = b ?? '9999-12-31';
  return aValue.localeCompare(bValue);
}

function compareTodosBySchedule(a: Todo, b: Todo) {
  const dueCompare = compareNullableDate(a.dueAt, b.dueAt);
  if (dueCompare !== 0) return dueCompare;

  const startCompare = compareNullableDate(a.startAt, b.startAt);
  if (startCompare !== 0) return startCompare;

  return a.createdAt.localeCompare(b.createdAt) || a.title.localeCompare(b.title);
}

function matchesTodoFilters(todo: Todo, filters: TodoFilterState) {
  if (filters.status !== 'all' && todo.status !== filters.status) return false;
  if (filters.term !== 'all' && todo.term !== filters.term) return false;
  if (filters.urgency === 'urgent' && !todo.urgencyTags.includes('urgent')) return false;
  if (filters.urgency === 'important' && !todo.urgencyTags.includes('important')) return false;
  if (filters.urgency === 'both' && (!todo.urgencyTags.includes('urgent') || !todo.urgencyTags.includes('important'))) {
    return false;
  }
  if (filters.typeTagId !== 'all' && !todo.typeTagIds.includes(filters.typeTagId)) return false;
  return true;
}

function getTodoTypeTags(todo: Todo, typeTags: TypeTagView[]) {
  return typeTags.filter((tag) => todo.typeTagIds.includes(tag.id));
}

function buildCompletedTodoGroups(todos: Todo[], dateKey: string): CompletedTodoGroup[] {
  const todoById = new Map(todos.map((todo) => [todo.id, todo]));
  const groups = new Map<string, CompletedTodoGroup>();

  for (const todo of todos.filter((item) => isCompletedOn(item, dateKey))) {
    const parent = todo.parentId ? todoById.get(todo.parentId) : null;
    const groupParent = parent ?? todo;
    const existing = groups.get(groupParent.id);
    const group =
      existing ??
      {
        parent: groupParent,
        parentCompletedOnDate: isCompletedOn(groupParent, dateKey),
        children: []
      };

    if (todo.id !== groupParent.id) {
      group.children.push(todo);
    }

    groups.set(groupParent.id, group);
  }

  return [...groups.values()]
    .map((group) => ({ ...group, children: [...group.children].sort(compareTodosBySchedule) }))
    .sort((a, b) => compareTodosBySchedule(a.parent, b.parent));
}

function filterCompletedTodoGroups(groups: CompletedTodoGroup[], filters: TodoFilterState) {
  return groups
    .map((group) => {
      const parentMatches = matchesTodoFilters(group.parent, filters);
      const children = group.children.filter((child) => matchesTodoFilters(child, filters));
      if (!parentMatches && children.length === 0) return null;
      return { ...group, children: parentMatches ? group.children : children };
    })
    .filter((group): group is CompletedTodoGroup => Boolean(group));
}

function completedTime(todo: Todo) {
  return todo.completedAt ? new Date(todo.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
}

function getTodayPlan(todayPlans: Record<string, DailyPomodoroPlan>, dateKey: string): DailyPomodoroPlan {
  return todayPlans[dateKey] ?? { addedTodoIds: [], excludedTodoIds: [] };
}

function buildTodayPlanTodos(todos: Todo[], todayPlans: Record<string, DailyPomodoroPlan>, dateKey: string) {
  const plan = getTodayPlan(todayPlans, dateKey);
  const todoById = new Map(todos.map((todo) => [todo.id, todo]));
  const defaultTodoIds = todos
    .filter((todo) => isTodayPomodoroTodo(todo, dateKey) && !plan.excludedTodoIds.includes(todo.id))
    .map((todo) => todo.id);
  const plannedIds = [...new Set([...defaultTodoIds, ...plan.addedTodoIds])];

  return plannedIds
    .map((todoId) => todoById.get(todoId))
    .filter((todo): todo is Todo => todo !== undefined && isIncompleteTodo(todo))
    .sort(compareTodosBySchedule);
}

function getUniquePresetName(baseName: string, presets: TimerPreset[]) {
  const existingNames = new Set(presets.map((preset) => preset.name));
  if (!existingNames.has(baseName)) return baseName;

  let index = 2;
  while (existingNames.has(`${baseName} ${index}`)) {
    index += 1;
  }
  return `${baseName} ${index}`;
}

export default function App() {
  const [initialLoad] = useState(loadAppData);
  const [data, dispatch] = useReducer(appReducer, initialLoad.data);
  const [page, setPage] = useState<Page>('home');
  const [recovered, setRecovered] = useState(initialLoad.recovered);
  const [selectedPomodoroTodoId, setSelectedPomodoroTodoId] = useState<string | null>(null);
  const [todoTagFocusId, setTodoTagFocusId] = useState<string | null>(null);
  const [timerSnapshot, setTimerSnapshot] = useState<TimerSnapshot | null>(null);
  const timerPanelRef = useRef<TimerPanelHandle>(null);
  const today = toDateKey();

  useEffect(() => {
    if (initialLoad.recovered) return;
    saveAppData(data);
  }, [data, initialLoad.recovered]);

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
      const snapshot = timerPanelRef.current?.pauseAndCapture();
      if (snapshot) setTimerSnapshot(snapshot);
    }
    setPage(nextPage);
  }

  function updateTodo(todo: Todo, patch: Partial<Todo>) {
    dispatch({ type: 'updateTodo', todo: { ...todo, ...patch } });
  }

  function updatePreset(preset: TimerPreset, patch: Partial<TimerPreset>) {
    dispatch({ type: 'upsertPreset', preset: { ...preset, ...patch } });
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
          onSetActivePreset={(presetId) => dispatch({ type: 'setActivePreset', presetId })}
          onUpdatePreset={updatePreset}
          onCreatePreset={() =>
            dispatch({
              type: 'upsertPreset',
              preset: {
                ...activePreset,
                id: `preset-${crypto.randomUUID()}`,
                name: getUniquePresetName('新类型', data.presets)
              }
            })
          }
          onDeletePreset={(presetId) => dispatch({ type: 'deletePreset', presetId })}
          onSessionComplete={(payload) => dispatch({ type: 'completeFocusSession', ...payload })}
          timerPanelRef={timerPanelRef}
          timerSnapshot={timerSnapshot}
        />
      )}
      {page === 'todoHub' && <TodoHubPage data={data} todayPlanTodos={todayPlanTodos} onNavigate={navigate} />}
      {page === 'todayPlan' && (
        <TodayPlanPage
          dateKey={today}
          todayPlanTodos={todayPlanTodos}
          onRemoveTodo={(todo) =>
            dispatch({
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
          onAddTypeTag={(name, color) => dispatch({ type: 'addTypeTag', tag: createTypeTag(name, color) })}
          onDeleteTypeTag={(tagId) => dispatch({ type: 'deleteTypeTag', tagId })}
          onAddTodo={(todo) => dispatch({ type: 'addTodo', todo })}
          onAddTodayPlanTodos={(todoIds) =>
            todoIds.forEach((todoId) => dispatch({ type: 'addTodayPlanTodo', date: today, todoId }))
          }
          onDeleteTodo={(todoId) => dispatch({ type: 'deleteTodo', todoId })}
          onUpdateTodo={updateTodo}
          onToggleTodoCheckIn={(todoId) => dispatch({ type: 'toggleTodoCheckIn', todoId, date: today })}
          focusTodoId={todoTagFocusId}
          onFocusHandled={() => setTodoTagFocusId(null)}
        />
      )}
      {page === 'completed' && (
        <CompletedTodosPage
          data={data}
          onUpdateTodo={updateTodo}
          onSaveReflection={(date, content) =>
            dispatch({ type: 'upsertReflection', reflection: { date, content, updatedAt: currentIso() } })
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
            dispatch({ type: 'upsertWeeklyReflection', reflection: { weekStart, content, updatedAt: currentIso() } })
          }
        />
      )}
      {page === 'backlog' && (
        <BacklogPage
          items={data.backlogItems}
          tags={data.inspirationTags}
          onAddItem={(title) => dispatch({ type: 'addBacklogItem', item: createBacklogItem(title) })}
          onDeleteItem={(itemId) => dispatch({ type: 'deleteBacklogItem', itemId })}
          onUpdateItem={(item) => dispatch({ type: 'updateBacklogItem', item })}
          onAddTag={(name, color) => dispatch({ type: 'addInspirationTag', tag: createInspirationTag(name, color) })}
          onDeleteTag={(tagId) => dispatch({ type: 'deleteInspirationTag', tagId })}
          onNavigate={navigate}
        />
      )}
      {page === 'completedBacklog' && (
        <CompletedInspirationPage
          items={data.backlogItems}
          tags={data.inspirationTags}
          onUpdateItem={(item) => dispatch({ type: 'updateBacklogItem', item })}
          onNavigate={navigate}
        />
      )}
    </main>
  );
}

function TopNav({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  return (
    <nav className="top-nav" aria-label="主导航">
      <button className={page === 'home' ? 'nav-link active' : 'nav-link'} type="button" aria-current={page === 'home' ? 'page' : undefined} onClick={() => onNavigate('home')}>
        <Home size={17} />
        首页
      </button>
      <button
        className={page === 'pomodoro' ? 'nav-link active' : 'nav-link'}
        type="button"
        aria-current={page === 'pomodoro' ? 'page' : undefined}
        onClick={() => onNavigate('pomodoro')}
      >
        <Clock3 size={17} />
        番茄钟
      </button>
      <button
        className={page !== 'pomodoro' && page !== 'home' ? 'nav-link active' : 'nav-link'}
        type="button"
        aria-current={page !== 'pomodoro' && page !== 'home' ? 'page' : undefined}
        onClick={() => onNavigate('todoHub')}
      >
        <ListTodo size={17} />
        待办事项
      </button>
    </nav>
  );
}

function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <section className="hero-page" style={{ backgroundImage: `linear-gradient(90deg, rgba(43, 28, 16, 0.18), rgba(43, 28, 16, 0.04)), url(${heroImage})` }}>
      <nav className="hero-nav" aria-label="首页导航">
        <button type="button" onClick={() => onNavigate('pomodoro')}>
          番茄钟
        </button>
        <button type="button" onClick={() => onNavigate('todoHub')}>
          待办事项
        </button>
      </nav>
      <div className="hero-copy">
        <p>龙场静修</p>
        <h1>知行合一</h1>
        <span>一念收束，一事笃行</span>
      </div>
    </section>
  );
}

function TodoHubPage({
  data,
  todayPlanTodos,
  onNavigate
}: {
  data: { todos: Todo[]; typeTags: TypeTagView[]; pomodoroRecords: PomodoroRecord[] };
  todayPlanTodos: Todo[];
  onNavigate: (page: Page) => void;
}) {
  const today = toDateKey();
  const weekSummary = getWeekSummary(data.todos, data.typeTags, data.pomodoroRecords, getWeekStart());
  const completedToday = data.todos.filter((todo) => isCompletedOn(todo, today)).length;
  const incompleteTodoCount = data.todos.filter(isIncompleteTodo).length;

  return (
    <section className="page-panel hub-panel">
      <PageTitle eyebrow="案牍" title="待办事项" />
      <div className="todo-hub-summary" aria-label="待办摘要">
        <HubMetric label="今日安排" value={todayPlanTodos.length} />
        <HubMetric label="未完成" value={incompleteTodoCount} />
        <HubMetric label="今日完成" value={completedToday} />
        <HubMetric label="本周完成" value={weekSummary.completedTodoCount} />
      </div>
      <div className="hub-actions">
        <button className="hub-action hub-action-today" type="button" onClick={() => onNavigate('todayPlan')}>
          <CalendarDays size={20} />
          <ArrowUpRight className="hub-action-arrow" size={18} aria-hidden="true" />
          <span>
          今日安排
          </span>
        </button>
        <button className="hub-action hub-action-incomplete" type="button" onClick={() => onNavigate('incomplete')}>
          <ListTodo size={20} />
          <ArrowUpRight className="hub-action-arrow" size={18} aria-hidden="true" />
          <span>
          未完成待办
          </span>
        </button>
        <button className="hub-action hub-action-completed" type="button" onClick={() => onNavigate('completed')}>
          <CheckCircle2 size={20} />
          <ArrowUpRight className="hub-action-arrow" size={18} aria-hidden="true" />
          <span>
          已完成待办
          </span>
        </button>
        <button className="hub-action hub-action-backlog" type="button" onClick={() => onNavigate('backlog')}>
          <Lightbulb size={20} />
          <ArrowUpRight className="hub-action-arrow" size={18} aria-hidden="true" />
          <span>
          灵感池
          </span>
        </button>
        <button className="hub-action hub-action-weekly" type="button" onClick={() => onNavigate('weeklySummary')}>
          <CalendarRange size={20} />
          <ArrowUpRight className="hub-action-arrow" size={18} aria-hidden="true" />
          <span>周总结</span>
        </button>
      </div>
    </section>
  );
}

function HubMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="hub-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function TodayPlanPage({
  dateKey,
  todayPlanTodos,
  onRemoveTodo
}: {
  dateKey: string;
  todayPlanTodos: Todo[];
  onRemoveTodo: (todo: Todo) => void;
}) {
  return (
    <section className="page-panel table-page today-plan-page">
      <PageTitle eyebrow={dateKey} title="今日安排" />
      <p className="page-note">在未完成待办中勾选任务，可以批量加入今日安排。</p>
      <div className="today-plan-list">
        <div className="today-plan-row table-head">
          <span>事项</span>
          <span>日期</span>
          <span>状态</span>
          <span>番茄</span>
          <span>操作</span>
        </div>
        {todayPlanTodos.map((todo) => (
          <div className="today-plan-row" key={todo.id}>
            <strong>{todo.title}</strong>
            <span>{asInputDate(todo.startAt) || '-'} / {asInputDate(todo.dueAt) || '-'}</span>
            <span>{statusLabels[todo.status as Exclude<TodoStatus, 'archived'>]}</span>
            <span>{todo.pomodoroCount} 个</span>
            <button className="ghost-button" type="button" onClick={() => onRemoveTodo(todo)}>
              <Trash2 size={16} />
              移除
            </button>
          </div>
        ))}
        {todayPlanTodos.length === 0 && <p className="empty-state table-empty">今日安排暂无待办。</p>}
      </div>
    </section>
  );
}

function PomodoroPage({
  activePreset,
  data,
  selectedTodo,
  todayTodos,
  onNavigate,
  onSelectTodo,
  onSetActivePreset,
  onUpdatePreset,
  onCreatePreset,
  onDeletePreset,
  onSessionComplete,
  timerPanelRef,
  timerSnapshot
}: {
  activePreset: TimerPreset;
  data: { presets: TimerPreset[] };
  selectedTodo: Todo | null;
  todayTodos: Todo[];
  onNavigate: (page: Page) => void;
  onSelectTodo: (todoId: string) => void;
  onSetActivePreset: (presetId: string) => void;
  onUpdatePreset: (preset: TimerPreset, patch: Partial<TimerPreset>) => void;
  onCreatePreset: () => void;
  onDeletePreset: (presetId: string) => void;
  onSessionComplete: Parameters<typeof TimerPanel>[0]['onSessionComplete'];
  timerPanelRef: RefObject<TimerPanelHandle>;
  timerSnapshot: TimerSnapshot | null;
}) {
  return (
    <section
      className="pomodoro-scene"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(31, 24, 18, 0.54), rgba(31, 24, 18, 0.22)), url(${pomodoroBackgroundImage})`
      }}
    >
      <div className="pomodoro-workspace">
        <aside className="page-panel side-panel today-panel">
        <PageTitle eyebrow="今日" title="番茄待办" />
        <div className="today-list">
          {todayTodos.length === 0 && <p className="empty-state">今日安排暂无可专注的待办。</p>}
          {todayTodos.map((todo) => (
            <button
              key={todo.id}
              className={todo.id === selectedTodo?.id ? 'todo-card active' : 'todo-card'}
              type="button"
              aria-pressed={todo.id === selectedTodo?.id}
              onClick={() => onSelectTodo(todo.id)}
            >
              <span>{todo.title}</span>
              <small>{todo.pomodoroCount} 个番茄</small>
            </button>
          ))}
        </div>
        <button className="ghost-button" type="button" onClick={() => onNavigate('todayPlan')}>
          <CalendarDays size={17} />
          管理今日安排
        </button>
        </aside>

        <TimerPanel
          ref={timerPanelRef}
          preset={activePreset}
          selectedTodo={selectedTodo}
          snapshot={timerSnapshot}
          onSessionComplete={onSessionComplete}
        />

        <aside className="page-panel side-panel preset-panel">
        <PageTitle eyebrow="钟法" title="番茄类型" />
        <label>
          番茄钟类型
          <select value={activePreset.id} onChange={(event) => onSetActivePreset(event.target.value)}>
            {data.presets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </label>
        <div className="preset-actions">
          <button type="button" onClick={onCreatePreset}>
            <Plus size={17} />
            新增类型
          </button>
          <button
            className="ghost-button"
            type="button"
            disabled={data.presets.length <= 1}
            onClick={() => onDeletePreset(activePreset.id)}
          >
            <Trash2 size={17} />
            删除类型
          </button>
        </div>
        <label>
          类型名称
          <input value={activePreset.name} onChange={(event) => onUpdatePreset(activePreset, { name: event.target.value })} />
        </label>
        <div className="preset-fields">
          <label>
            专注
            <input
              type="number"
              min="1"
              value={activePreset.focusMinutes}
              onChange={(event) => onUpdatePreset(activePreset, { focusMinutes: Number(event.target.value) })}
            />
          </label>
          <label>
            短休
            <input
              type="number"
              min="1"
              value={activePreset.shortBreakMinutes}
              onChange={(event) => onUpdatePreset(activePreset, { shortBreakMinutes: Number(event.target.value) })}
            />
          </label>
          <label>
            长休
            <input
              type="number"
              min="1"
              value={activePreset.longBreakMinutes}
              onChange={(event) => onUpdatePreset(activePreset, { longBreakMinutes: Number(event.target.value) })}
            />
          </label>
          <label>
            间隔
            <input
              type="number"
              min="1"
              value={activePreset.longBreakInterval}
              onChange={(event) => onUpdatePreset(activePreset, { longBreakInterval: Number(event.target.value) })}
            />
          </label>
        </div>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={activePreset.autoStartNextPhase}
            onChange={(event) => onUpdatePreset(activePreset, { autoStartNextPhase: event.target.checked })}
          />
          自动开始下一阶段
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={activePreset.soundEnabled}
            onChange={(event) => onUpdatePreset(activePreset, { soundEnabled: event.target.checked })}
          />
          提醒声音
        </label>
        <DesktopNotificationButton />
        </aside>
      </div>
    </section>
  );
}

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

function IncompleteTodosPage({
  data,
  todayPlanTodos,
  onAddTodo,
  onAddTodayPlanTodos,
  onUpdateTodo,
  onToggleTodoCheckIn,
  onDeleteTodo,
  onAddTypeTag,
  onDeleteTypeTag,
  focusTodoId,
  onFocusHandled
}: {
  data: {
    todos: Todo[];
    typeTags: { id: string; name: string; color: string }[];
  };
  todayPlanTodos: Todo[];
  onAddTodo: (todo: Todo) => void;
  onAddTodayPlanTodos: (todoIds: string[]) => void;
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onToggleTodoCheckIn: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onAddTypeTag: (name: string, color: string) => void;
  onDeleteTypeTag: (tagId: string) => void;
  focusTodoId: string | null;
  onFocusHandled: () => void;
}) {
  const [title, setTitle] = useState('');
  const [term, setTerm] = useState<TodoTerm>('short');
  const [startAt, setStartAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#9b2f25');
  const [filters, setFilters] = useState<TodoFilterState>(defaultTodoFilters);
  const [selectedTodayPlanTodoIds, setSelectedTodayPlanTodoIds] = useState<string[]>([]);
  const [pendingDeleteTypeTagId, setPendingDeleteTypeTagId] = useState<string | null>(null);
  const [blockedDeleteTypeTagId, setBlockedDeleteTypeTagId] = useState<string | null>(null);
  const [completionTagDialogTodo, setCompletionTagDialogTodo] = useState<Todo | null>(null);
  const todayPlanTodoIdSet = new Set(todayPlanTodos.map((todo) => todo.id));
  const incompleteTodos = data.todos.filter(isIncompleteTodo).filter((todo) => matchesTodoFilters(todo, filters));
  const visibleTodayPlanCandidates = incompleteTodos.filter((todo) => !todayPlanTodoIdSet.has(todo.id));
  const selectedEligibleTodoIds = selectedTodayPlanTodoIds.filter((todoId) =>
    visibleTodayPlanCandidates.some((todo) => todo.id === todoId)
  );
  const allVisibleCandidatesSelected =
    visibleTodayPlanCandidates.length > 0 && visibleTodayPlanCandidates.every((todo) => selectedTodayPlanTodoIds.includes(todo.id));

  useEffect(() => {
    if (!focusTodoId) return;
    const tags = document.getElementById(`todo-type-tags-${focusTodoId}`);
    tags?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const firstTagInput = tags?.querySelector<HTMLInputElement>('input:not(:disabled)');
    firstTagInput?.focus();
    onFocusHandled();
  }, [focusTodoId, onFocusHandled]);

  function addTodo() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddTodo(createDefaultTodo(trimmed, { term, startAt: nullableDate(startAt), dueAt: nullableDate(dueAt) }));
    setTitle('');
  }

  function addTag() {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    onAddTypeTag(trimmed, tagColor);
    setTagName('');
  }

  function deleteTypeTag(tagId: string) {
    const remainingTagIds = new Set(data.typeTags.filter((tag) => tag.id !== tagId).map((tag) => tag.id));
    const wouldLeaveCompletedTodoUntagged = data.todos.some(
      (todo) =>
        todo.status === 'completed' &&
        todo.typeTagIds.includes(tagId) &&
        !todo.typeTagIds.some((todoTagId) => todoTagId !== tagId && remainingTagIds.has(todoTagId))
    );
    if (wouldLeaveCompletedTodoUntagged) {
      setBlockedDeleteTypeTagId(tagId);
      setPendingDeleteTypeTagId(null);
      return;
    }
    onDeleteTypeTag(tagId);
    setPendingDeleteTypeTagId(null);
    if (filters.typeTagId === tagId) {
      setFilters({ ...filters, typeTagId: 'all' });
    }
  }

  function toggleTodayPlanSelection(todoId: string, checked: boolean) {
    setSelectedTodayPlanTodoIds((current) =>
      checked ? [...new Set([...current, todoId])] : current.filter((selectedId) => selectedId !== todoId)
    );
  }

  function toggleAllVisibleTodayPlanCandidates(checked: boolean) {
    setSelectedTodayPlanTodoIds((current) => {
      const visibleIds = visibleTodayPlanCandidates.map((todo) => todo.id);
      if (checked) return [...new Set([...current, ...visibleIds])];
      return current.filter((todoId) => !visibleIds.includes(todoId));
    });
  }

  function addSelectedToTodayPlan() {
    if (selectedEligibleTodoIds.length === 0) return;
    onAddTodayPlanTodos(selectedEligibleTodoIds);
    setSelectedTodayPlanTodoIds((current) => current.filter((todoId) => !selectedEligibleTodoIds.includes(todoId)));
  }

  return (
    <section className="page-panel table-page">
      <PageTitle eyebrow="未竟" title="未完成待办" />
      <div className="toolbar">
        <input
          aria-label="新增待办标题"
          placeholder="新增待办"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addTodo();
          }}
        />
        <select aria-label="新增待办期限" value={term} onChange={(event) => setTerm(event.target.value as TodoTerm)}>
          <option value="short">短期</option>
          <option value="long">长期</option>
        </select>
        <input aria-label="新增开始日期" type="date" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
        <input aria-label="新增截止日期" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        <button type="button" onClick={addTodo}>
          <Plus size={17} />
          新增
        </button>
      </div>
      <div className="toolbar tag-toolbar">
        <input
          aria-label="新类型标签名"
          placeholder="自定义类型标签"
          value={tagName}
          onChange={(event) => setTagName(event.target.value)}
        />
        <input aria-label="类型标签颜色" type="color" value={tagColor} onChange={(event) => setTagColor(event.target.value)} />
        <button type="button" onClick={addTag}>
          <Plus size={17} />
          加标签
        </button>
      </div>
      <div className="type-tag-library" aria-label="类型标签库">
        <span>类型标签库</span>
        {data.typeTags.length === 0 && <em>暂无自定义标签</em>}
        {data.typeTags.map((tag) => {
          const usageCount = data.todos.filter((todo) => todo.typeTagIds.includes(tag.id)).length;
          const isConfirmingDelete = pendingDeleteTypeTagId === tag.id;
          const isDeleteBlocked = blockedDeleteTypeTagId === tag.id;

          return (
            <div key={tag.id} className={isConfirmingDelete ? 'type-tag-chip confirming' : 'type-tag-chip'} style={{ borderColor: tag.color }}>
              <span className="type-tag-chip-name">
                <i style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
              <small>{usageCount} 项</small>
              {isDeleteBlocked ? (
                <>
                  <small className="type-tag-delete-blocked">已完成待办仍在使用此唯一标签，无法删除。</small>
                  <button className="ghost-button" type="button" onClick={() => setBlockedDeleteTypeTagId(null)}>
                    知道了
                  </button>
                </>
              ) : isConfirmingDelete ? (
                <>
                  <button className="danger-button" type="button" onClick={() => deleteTypeTag(tag.id)}>
                    确认删除
                  </button>
                  <button className="ghost-button" type="button" onClick={() => setPendingDeleteTypeTagId(null)}>
                    取消
                  </button>
                </>
              ) : (
                <button
                  className="ghost-button icon-button"
                  type="button"
                  onClick={() => setPendingDeleteTypeTagId(tag.id)}
                  title={`删除 ${tag.name}`}
                  aria-label={`准备删除标签 ${tag.name}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <TodoFilterBar
        filters={filters}
        typeTags={data.typeTags}
        statusOptions={['notStarted', 'active']}
        onChange={setFilters}
      />
      <div className="today-plan-batchbar" aria-label="今日安排批量操作">
        <label className="today-plan-select-all">
          <input
            type="checkbox"
            checked={allVisibleCandidatesSelected}
            disabled={visibleTodayPlanCandidates.length === 0}
            onChange={(event) => toggleAllVisibleTodayPlanCandidates(event.target.checked)}
          />
          选择当前筛选可加入待办
        </label>
        <span>{selectedEligibleTodoIds.length} 项已选择</span>
        <button type="button" onClick={addSelectedToTodayPlan} disabled={selectedEligibleTodoIds.length === 0}>
          <CalendarDays size={17} />
          加入今日安排
        </button>
      </div>
      <TodoTable
        title="短期待办"
        todos={incompleteTodos.filter((todo) => todo.term === 'short')}
        allTodos={data.todos}
        typeTags={data.typeTags}
        todayPlanTodoIdSet={todayPlanTodoIdSet}
        selectedTodayPlanTodoIds={selectedTodayPlanTodoIds}
        onToggleTodayPlanSelection={toggleTodayPlanSelection}
        onAddTodo={onAddTodo}
        onDeleteTodo={onDeleteTodo}
        onUpdateTodo={onUpdateTodo}
        onToggleTodoCheckIn={onToggleTodoCheckIn}
        onCompletionBlocked={setCompletionTagDialogTodo}
      />
      <TodoTable
        title="长期待办"
        todos={incompleteTodos.filter((todo) => todo.term === 'long')}
        allTodos={data.todos}
        typeTags={data.typeTags}
        todayPlanTodoIdSet={todayPlanTodoIdSet}
        selectedTodayPlanTodoIds={selectedTodayPlanTodoIds}
        onToggleTodayPlanSelection={toggleTodayPlanSelection}
        onAddTodo={onAddTodo}
        onDeleteTodo={onDeleteTodo}
        onUpdateTodo={onUpdateTodo}
        onToggleTodoCheckIn={onToggleTodoCheckIn}
        onCompletionBlocked={setCompletionTagDialogTodo}
      />
      {completionTagDialogTodo && (
        <CompletionTagDialog
          todoTitle={completionTagDialogTodo.title}
          onClose={() => setCompletionTagDialogTodo(null)}
          onConfirm={() => {
            const tags = document.getElementById(`todo-type-tags-${completionTagDialogTodo.id}`);
            tags?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
            tags?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
            setCompletionTagDialogTodo(null);
          }}
        />
      )}
    </section>
  );
}

function TodoTable({
  title,
  todos,
  allTodos,
  typeTags,
  todayPlanTodoIdSet,
  selectedTodayPlanTodoIds,
  onToggleTodayPlanSelection,
  onAddTodo,
  onUpdateTodo,
  onToggleTodoCheckIn,
  onDeleteTodo,
  onCompletionBlocked
}: {
  title: string;
  todos: Todo[];
  allTodos: Todo[];
  typeTags: { id: string; name: string; color: string }[];
  todayPlanTodoIdSet: Set<string>;
  selectedTodayPlanTodoIds: string[];
  onToggleTodayPlanSelection: (todoId: string, checked: boolean) => void;
  onAddTodo: (todo: Todo) => void;
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onToggleTodoCheckIn: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onCompletionBlocked: (todo: Todo) => void;
}) {
  const [expandedTodoIds, setExpandedTodoIds] = useState<Set<string>>(() => new Set(todos.map((todo) => todo.id)));
  const visibleTodoIds = new Set(todos.map((todo) => todo.id));
  const roots = todos.filter((todo) => !todo.parentId || !visibleTodoIds.has(todo.parentId));
  const childrenByParent = new Map<string, Todo[]>();
  for (const child of todos.filter((todo) => todo.parentId && visibleTodoIds.has(todo.parentId))) {
    childrenByParent.set(child.parentId!, [...(childrenByParent.get(child.parentId!) ?? []), child]);
  }
  const sortedRoots = [...roots].sort(compareTodosBySchedule);
  const parentTodoIds = [...childrenByParent.keys()];

  function toggleTodoChildren(todoId: string) {
    setExpandedTodoIds((current) => {
      const next = new Set(current);
      if (next.has(todoId)) next.delete(todoId);
      else next.add(todoId);
      return next;
    });
  }

  function expandAllTodoChildren() {
    setExpandedTodoIds((current) => new Set([...current, ...parentTodoIds]));
  }

  function collapseAllTodoChildren() {
    setExpandedTodoIds((current) => {
      const next = new Set(current);
      parentTodoIds.forEach((todoId) => next.delete(todoId));
      return next;
    });
  }

  return (
    <section className="table-section">
      <div className="table-section-heading">
        <h2>{title}</h2>
        {parentTodoIds.length > 0 && (
          <div className="tree-bulk-actions" aria-label={`${title} 子任务显示`}>
            <button className="ghost-button" type="button" onClick={expandAllTodoChildren}>
              全部展开
            </button>
            <button className="ghost-button" type="button" onClick={collapseAllTodoChildren}>
              全部收起
            </button>
          </div>
        )}
      </div>
      <div className="todo-table" role="table" aria-label={title}>
        <div className="todo-row table-head" role="row">
          <span>事项</span>
          <span>日期</span>
          <span>状态</span>
          <span>期限</span>
          <span>打卡</span>
          <span>紧急 / 重要</span>
          <span>类型标签</span>
          <span>操作</span>
        </div>
        {sortedRoots.map((todo) => (
          <TodoRows
            key={todo.id}
            todo={todo}
            childrenByParent={childrenByParent}
            typeTags={typeTags}
            todayPlanTodoIdSet={todayPlanTodoIdSet}
            selectedTodayPlanTodoIds={selectedTodayPlanTodoIds}
            onToggleTodayPlanSelection={onToggleTodayPlanSelection}
            onAddTodo={onAddTodo}
            onDeleteTodo={onDeleteTodo}
            onUpdateTodo={onUpdateTodo}
            onToggleTodoCheckIn={onToggleTodoCheckIn}
            onCompletionBlocked={onCompletionBlocked}
            expandedTodoIds={expandedTodoIds}
            onToggleTodoChildren={toggleTodoChildren}
          />
        ))}
        {todos.length === 0 && <p className="empty-state table-empty">暂无待办。</p>}
      </div>
    </section>
  );
}

function TodoRows({
  todo,
  childrenByParent,
  typeTags,
  todayPlanTodoIdSet,
  selectedTodayPlanTodoIds,
  onToggleTodayPlanSelection,
  onAddTodo,
  onUpdateTodo,
  onToggleTodoCheckIn,
  onDeleteTodo,
  onCompletionBlocked,
  expandedTodoIds,
  onToggleTodoChildren,
  depth = 0
}: {
  todo: Todo;
  childrenByParent: Map<string, Todo[]>;
  typeTags: { id: string; name: string; color: string }[];
  todayPlanTodoIdSet: Set<string>;
  selectedTodayPlanTodoIds: string[];
  onToggleTodayPlanSelection: (todoId: string, checked: boolean) => void;
  onAddTodo: (todo: Todo) => void;
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onToggleTodoCheckIn: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onCompletionBlocked: (todo: Todo) => void;
  expandedTodoIds: Set<string>;
  onToggleTodoChildren: (todoId: string) => void;
  depth?: number;
}) {
  const children = [...(childrenByParent.get(todo.id) ?? [])].sort(compareTodosBySchedule);
  const hasChildren = children.length > 0;
  const isExpanded = expandedTodoIds.has(todo.id);

  return (
    <>
      <TodoRow
        todo={todo}
        depth={depth}
        typeTags={typeTags}
        isInTodayPlan={todayPlanTodoIdSet.has(todo.id)}
        isSelectedForTodayPlan={selectedTodayPlanTodoIds.includes(todo.id)}
        onToggleTodayPlanSelection={onToggleTodayPlanSelection}
        onAddTodo={onAddTodo}
        onDeleteTodo={onDeleteTodo}
        onUpdateTodo={onUpdateTodo}
        onToggleTodoCheckIn={onToggleTodoCheckIn}
        onCompletionBlocked={onCompletionBlocked}
        hasChildren={hasChildren}
        isExpanded={isExpanded}
        onToggleChildren={onToggleTodoChildren}
      />
      {hasChildren && isExpanded && children.map((child) => (
        <TodoRows
          key={child.id}
          todo={child}
          childrenByParent={childrenByParent}
          depth={depth + 1}
          typeTags={typeTags}
          todayPlanTodoIdSet={todayPlanTodoIdSet}
          selectedTodayPlanTodoIds={selectedTodayPlanTodoIds}
          onToggleTodayPlanSelection={onToggleTodayPlanSelection}
          onAddTodo={onAddTodo}
          onDeleteTodo={onDeleteTodo}
          onUpdateTodo={onUpdateTodo}
          onToggleTodoCheckIn={onToggleTodoCheckIn}
          onCompletionBlocked={onCompletionBlocked}
          expandedTodoIds={expandedTodoIds}
          onToggleTodoChildren={onToggleTodoChildren}
        />
      ))}
    </>
  );
}

function TodoRow({
  todo,
  depth = 0,
  typeTags,
  isInTodayPlan,
  isSelectedForTodayPlan,
  onToggleTodayPlanSelection,
  onAddTodo,
  onUpdateTodo,
  onToggleTodoCheckIn,
  onDeleteTodo,
  onCompletionBlocked,
  hasChildren,
  isExpanded,
  onToggleChildren
}: {
  todo: Todo;
  depth?: number;
  typeTags: { id: string; name: string; color: string }[];
  isInTodayPlan: boolean;
  isSelectedForTodayPlan: boolean;
  onToggleTodayPlanSelection: (todoId: string, checked: boolean) => void;
  onAddTodo: (todo: Todo) => void;
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onToggleTodoCheckIn: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onCompletionBlocked: (todo: Todo) => void;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleChildren: (todoId: string) => void;
}) {
  const badge = getTodoTimeBadge(todo);

  function toggleUrgency(tag: UrgencyTag) {
    const hasTag = todo.urgencyTags.includes(tag);
    onUpdateTodo(todo, {
      urgencyTags: hasTag ? todo.urgencyTags.filter((item) => item !== tag) : [...todo.urgencyTags, tag]
    });
  }

  function toggleTypeTag(tagId: string) {
    const hasTag = todo.typeTagIds.includes(tagId);
    onUpdateTodo(todo, {
      typeTagIds: hasTag ? todo.typeTagIds.filter((item) => item !== tagId) : [...todo.typeTagIds, tagId]
    });
  }

  return (
    <div className={depth > 0 ? 'todo-row child-row' : 'todo-row'} role="row">
      <div
        className="title-cell"
        style={{ gridTemplateColumns: `${30 + Math.min(depth, 6) * 24}px auto minmax(0, 1fr) auto` }}
      >
        <span className="tree-gutter">
          {hasChildren ? (
            <button
              className={isExpanded ? 'tree-toggle expanded' : 'tree-toggle'}
              type="button"
              aria-label={`${isExpanded ? '收起' : '展开'} ${todo.title} 的子任务`}
              aria-expanded={isExpanded}
              title={isExpanded ? '收起子任务' : '展开子任务'}
              onClick={() => onToggleChildren(todo.id)}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          ) : depth > 0 ? (
            <span className="branch-mark">└</span>
          ) : null}
        </span>
        <label className={isInTodayPlan ? 'today-plan-picker joined' : 'today-plan-picker'}>
          <input
            type="checkbox"
            aria-label={`${todo.title} 加入今日安排`}
            checked={isInTodayPlan || isSelectedForTodayPlan}
            disabled={isInTodayPlan}
            onChange={(event) => onToggleTodayPlanSelection(todo.id, event.target.checked)}
          />
          <span>{isInTodayPlan ? '已加入' : '待安排'}</span>
        </label>
        <input aria-label={`${todo.title} 标题`} value={todo.title} onChange={(event) => onUpdateTodo(todo, { title: event.target.value })} />
        {badge && <em className={`badge ${badge.tone}`}>{badge.label}</em>}
      </div>
      <div className="date-cell">
        <input
          aria-label={`${todo.title} 开始日期`}
          type="date"
          value={asInputDate(todo.startAt)}
          onChange={(event) => onUpdateTodo(todo, { startAt: nullableDate(event.target.value) })}
        />
        <input
          aria-label={`${todo.title} 截止日期`}
          type="date"
          value={asInputDate(todo.dueAt)}
          onChange={(event) => onUpdateTodo(todo, { dueAt: nullableDate(event.target.value) })}
        />
      </div>
      <select
        aria-label={`${todo.title} 状态`}
        value={todo.status}
        onChange={(event) => {
          const nextStatus = event.target.value as TodoStatus;
          if (nextStatus === 'completed' && !todo.typeTagIds.some((tagId) => typeTags.some((tag) => tag.id === tagId))) {
            onCompletionBlocked(todo);
            return;
          }
          onUpdateTodo(todo, { status: nextStatus });
        }}
      >
        <option value="notStarted">{statusLabels.notStarted}</option>
        <option value="active">{statusLabels.active}</option>
        <option value="completed">{statusLabels.completed}</option>
      </select>
      <select aria-label={`${todo.title} 长短期`} value={todo.term} onChange={(event) => onUpdateTodo(todo, { term: event.target.value as TodoTerm })}>
        <option value="short">短期</option>
        <option value="long">长期</option>
      </select>
      <TodoCheckInCell todo={todo} onToggle={() => onToggleTodoCheckIn(todo.id)} />
      <div className="mini-checks">
        {(Object.keys(urgencyLabels) as UrgencyTag[]).map((tag) => (
          <label key={tag}>
            <input type="checkbox" checked={todo.urgencyTags.includes(tag)} onChange={() => toggleUrgency(tag)} />
            {urgencyLabels[tag]}
          </label>
        ))}
      </div>
      <div className="type-tags" id={`todo-type-tags-${todo.id}`}>
        {typeTags.length === 0 && <em>暂无标签</em>}
        {typeTags.map((tag) => (
          <label key={tag.id} style={{ borderColor: tag.color }}>
            <input
              type="checkbox"
              aria-label={`${todo.title} 类型标签 ${tag.name}`}
              checked={todo.typeTagIds.includes(tag.id)}
              onChange={() => toggleTypeTag(tag.id)}
            />
            {tag.name}
          </label>
        ))}
      </div>
      <div className="row-actions">
        <button
          type="button"
          aria-label={`创建子项 ${todo.title}`}
          onClick={() => onAddTodo(createDefaultTodo('子待办', { parentId: todo.id, term: todo.term }))}
        >
          <Plus size={16} />
          子项
        </button>
        <button className="ghost-button icon-button" type="button" onClick={() => onDeleteTodo(todo.id)} aria-label={`删除 ${todo.title}`}>
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

function TodoCheckInCell({ todo, onToggle }: { todo: Todo; onToggle: () => void }) {
  if (todo.term !== 'long') return <span className="checkin-cell checkin-empty">-</span>;

  const checkedInToday = todo.checkInDates.includes(toDateKey());
  return (
    <div className="checkin-cell">
      <span>累计 {todo.checkInDates.length} 次</span>
      <button
        className={checkedInToday ? 'checkin-button checked' : 'checkin-button'}
        type="button"
        aria-label={`${checkedInToday ? '撤销' : ''}${todo.title} 今日打卡`}
        aria-pressed={checkedInToday}
        onClick={onToggle}
      >
        <CalendarCheck2 size={16} />
        {checkedInToday ? '今日已打卡' : '今日打卡'}
      </button>
    </div>
  );
}

function CompletionTagDialog({
  todoTitle,
  onClose,
  onConfirm
}: {
  todoTitle: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="completion-dialog-backdrop" role="presentation">
      <section className="completion-dialog" role="alertdialog" aria-modal="true" aria-labelledby="completion-dialog-title">
        <h2 id="completion-dialog-title">完成前请选择类型标签</h2>
        <p>“{todoTitle}”尚未标注类型，无法标记为已完成。</p>
        <div className="completion-dialog-actions">
          <button className="ghost-button" type="button" onClick={onClose}>
            取消
          </button>
          <button type="button" onClick={onConfirm} autoFocus>
            前往添加标签
          </button>
        </div>
      </section>
    </div>
  );
}

function TodoFilterBar({
  filters,
  typeTags,
  statusOptions,
  onChange
}: {
  filters: TodoFilterState;
  typeTags: TypeTagView[];
  statusOptions: Array<Exclude<TodoStatus, 'archived'>>;
  onChange: (filters: TodoFilterState) => void;
}) {
  return (
    <div className="filter-bar" aria-label="待办筛选">
      <label>
        状态
        <select
          aria-label="筛选状态"
          value={filters.status}
          onChange={(event) => onChange({ ...filters, status: event.target.value as TodoFilterState['status'] })}
        >
          <option value="all">全部状态</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <label>
        期限
        <select
          aria-label="筛选期限"
          value={filters.term}
          onChange={(event) => onChange({ ...filters, term: event.target.value as TodoFilterState['term'] })}
        >
          <option value="all">全部期限</option>
          <option value="short">短期</option>
          <option value="long">长期</option>
        </select>
      </label>
      <label>
        紧急重要
        <select
          aria-label="筛选紧急重要"
          value={filters.urgency}
          onChange={(event) => onChange({ ...filters, urgency: event.target.value as TodoFilterState['urgency'] })}
        >
          <option value="all">全部</option>
          <option value="urgent">紧急</option>
          <option value="important">重要</option>
          <option value="both">紧急且重要</option>
        </select>
      </label>
      <label>
        类型标签
        <select
          aria-label="筛选类型标签"
          value={filters.typeTagId}
          onChange={(event) => onChange({ ...filters, typeTagId: event.target.value })}
        >
          <option value="all">全部标签</option>
          {typeTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function TypeTagBadges({ todo, typeTags }: { todo: Todo; typeTags: TypeTagView[] }) {
  const tags = getTodoTypeTags(todo, typeTags);
  if (tags.length === 0) return <span className="empty-inline">无</span>;

  return (
    <div className="type-tag-badges">
      {tags.map((tag) => (
        <span key={tag.id} style={{ borderColor: tag.color }}>
          <i style={{ backgroundColor: tag.color }} />
          {tag.name}
        </span>
      ))}
    </div>
  );
}

function CompletedCheckInCount({ todo }: { todo: Todo }) {
  return (
    <span className={todo.term === 'long' ? 'completed-checkin-count' : 'completed-checkin-count empty'}>
      {todo.term === 'long' ? `打卡 ${todo.checkInDates.length} 次` : ''}
    </span>
  );
}

function CompletedTodosPage({
  data,
  onUpdateTodo,
  onSaveReflection,
  onOpenTodoTags
}: {
  data: { todos: Todo[]; reflections: { date: string; content: string }[]; typeTags: TypeTagView[] };
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onSaveReflection: (date: string, content: string) => void;
  onOpenTodoTags: (todoId: string) => void;
}) {
  const [date, setDate] = useState(toDateKey());
  const [filters, setFilters] = useState<TodoFilterState>(defaultTodoFilters);
  const completedGroups = filterCompletedTodoGroups(buildCompletedTodoGroups(data.todos, date), filters);
  const reflection = data.reflections.find((item) => item.date === date)?.content ?? '';
  const typeTagShares = getCompletedTypeTagShares(data.todos, data.typeTags);
  const [completionTagDialogTodo, setCompletionTagDialogTodo] = useState<Todo | null>(null);
  const [expandedCompletedParentIds, setExpandedCompletedParentIds] = useState<Set<string>>(() => new Set());

  function isCompletedGroupExpanded(group: CompletedTodoGroup) {
    return !expandedCompletedParentIds.has(group.parent.id);
  }

  function toggleCompletedGroup(parentId: string) {
    setExpandedCompletedParentIds((current) => {
      const next = new Set(current);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  function expandAllCompletedGroups() {
    setExpandedCompletedParentIds(new Set());
  }

  function collapseAllCompletedGroups() {
    setExpandedCompletedParentIds(new Set(completedGroups.filter((group) => group.children.length > 0).map((group) => group.parent.id)));
  }

  return (
    <section className="page-panel table-page">
      <PageTitle eyebrow="已竟" title="已完成待办" />
      <CompletedTypeChart shares={typeTagShares} />
      <div className="toolbar narrow-toolbar">
        <label>
          日期
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>
      <TodoFilterBar
        filters={filters}
        typeTags={data.typeTags}
        statusOptions={['notStarted', 'active', 'completed']}
        onChange={setFilters}
      />
      {completedGroups.some((group) => group.children.length > 0) && (
        <div className="tree-bulk-actions completed-tree-actions" aria-label="已完成待办子任务显示">
          <button className="ghost-button" type="button" onClick={expandAllCompletedGroups}>
            全部展开
          </button>
          <button className="ghost-button" type="button" onClick={collapseAllCompletedGroups}>
            全部收起
          </button>
        </div>
      )}
      <div className="done-table">
        {completedGroups.length === 0 && <p className="empty-state table-empty">这一天暂无完成记录。</p>}
        {completedGroups.map((group) => {
          const hasChildren = group.children.length > 0;
          const isExpanded = isCompletedGroupExpanded(group);
          return (
            <div className="done-group" key={group.parent.id}>
              <div className="done-row done-parent">
                {hasChildren ? (
                  <button
                    className={isExpanded ? 'tree-toggle expanded' : 'tree-toggle'}
                    type="button"
                    aria-label={`${isExpanded ? '收起' : '展开'} ${group.parent.title} 的子任务`}
                    aria-expanded={isExpanded}
                    title={isExpanded ? '收起子任务' : '展开子任务'}
                    onClick={() => toggleCompletedGroup(group.parent.id)}
                  >
                    <ChevronRight size={17} aria-hidden="true" />
                  </button>
                ) : (
                  <span className="tree-toggle-spacer" aria-hidden="true" />
                )}
                <CheckCircle2 size={18} />
                <strong>{group.parent.title}</strong>
                <div className="done-status-stack">
                  <CompletedStatusSelect todo={group.parent} typeTags={data.typeTags} onUpdateTodo={onUpdateTodo} onCompletionBlocked={setCompletionTagDialogTodo} />
                  {isCompletedLate(group.parent) && <span className="done-status overdue-completed">逾期完成</span>}
                </div>
                <TypeTagBadges todo={group.parent} typeTags={data.typeTags} />
                <CompletedCheckInCount todo={group.parent} />
                <span>{group.parent.pomodoroCount} 个番茄</span>
                <span>{group.parentCompletedOnDate ? completedTime(group.parent) : '-'}</span>
              </div>
              {hasChildren && isExpanded && group.children.map((child) => (
                <div className="done-row done-child" key={child.id}>
                  <span className="tree-toggle-spacer" aria-hidden="true" />
                  <span className="branch-mark">└</span>
                  <strong>{child.title}</strong>
                  <div className="done-status-stack">
                    <CompletedStatusSelect todo={child} typeTags={data.typeTags} onUpdateTodo={onUpdateTodo} onCompletionBlocked={setCompletionTagDialogTodo} />
                    {isCompletedLate(child) && <span className="done-status overdue-completed">逾期完成</span>}
                  </div>
                  <TypeTagBadges todo={child} typeTags={data.typeTags} />
                  <CompletedCheckInCount todo={child} />
                  <span>{child.pomodoroCount} 个番茄</span>
                  <span>{completedTime(child)}</span>
                </div>
              ))}
            </div>
          );
        })}
          </div>
      <label className="reflection-box">
        每日自我反思
        <textarea value={reflection} onChange={(event) => onSaveReflection(date, event.target.value)} />
      </label>
      {completionTagDialogTodo && (
        <CompletionTagDialog
          todoTitle={completionTagDialogTodo.title}
          onClose={() => setCompletionTagDialogTodo(null)}
          onConfirm={() => {
            onOpenTodoTags(completionTagDialogTodo.id);
            setCompletionTagDialogTodo(null);
          }}
        />
      )}
    </section>
  );
}

function CompletedTypeChart({ shares }: { shares: TypeTagShare[] }) {
  if (shares.length === 0) {
    return <p className="empty-state analytics-empty">暂无历史完成待办，完成任务后会在这里显示类型占比。</p>;
  }

  let offset = 0;
  const total = shares.reduce((sum, share) => sum + share.count, 0);
  const stops = shares.map((share) => {
    const start = offset;
    offset += (share.count / total) * 100;
    return `${share.color} ${start}% ${offset}%`;
  });
  const label = shares.map((share) => `${share.name} ${share.percentage}%`).join('，');

  return (
    <section className="completion-analytics" aria-labelledby="completion-chart-title">
      <div className="analytics-heading">
        <div>
          <p className="eyebrow">全历史</p>
          <h2 id="completion-chart-title">完成类型占比</h2>
        </div>
        <ChartPie size={24} aria-hidden="true" />
      </div>
      <div className="completion-chart-content">
        <div className="type-pie-chart" role="img" aria-label={`已完成待办类型占比：${label}`} style={{ backgroundImage: `conic-gradient(${stops.join(', ')})` }}>
          <span>类型分布</span>
        </div>
        <ul className="type-share-legend">
          {shares.map((share) => (
            <li key={share.id}>
              <i style={{ backgroundColor: share.color }} />
              <span>{share.name}</span>
              <strong>{share.count} 项</strong>
              <em>{share.percentage}%</em>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function CompletedStatusSelect({
  todo,
  typeTags,
  onUpdateTodo,
  onCompletionBlocked
}: {
  todo: Todo;
  typeTags: TypeTagView[];
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onCompletionBlocked: (todo: Todo) => void;
}) {
  return (
    <select
      className={todo.status === 'completed' ? 'done-status-select completed' : 'done-status-select active'}
      aria-label={`${todo.title} 已完成页状态`}
      value={todo.status}
      onChange={(event) => {
        const nextStatus = event.target.value as TodoStatus;
        if (nextStatus === 'completed' && !todo.typeTagIds.some((tagId) => typeTags.some((tag) => tag.id === tagId))) {
          onCompletionBlocked(todo);
          return;
        }
        onUpdateTodo(todo, { status: nextStatus });
      }}
    >
      <option value="notStarted">未开始</option>
      <option value="active">进行中</option>
      <option value="completed">已完成</option>
    </select>
  );
}

function WeeklySummaryPage({
  data,
  onSaveReflection
}: {
  data: {
    todos: Todo[];
    typeTags: TypeTagView[];
    pomodoroRecords: PomodoroRecord[];
    weeklyReflections: { weekStart: string; content: string }[];
  };
  onSaveReflection: (weekStart: string, content: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => toDateKey(getWeekStart()));
  const summary = getWeekSummary(data.todos, data.typeTags, data.pomodoroRecords, weekStart);
  const reflection = data.weeklyReflections.find((item) => item.weekStart === weekStart)?.content ?? '';
  const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const maxDailyCompleted = Math.max(...summary.dailyCompletion.map((item) => item.completedCount), 1);
  const weeklyTodoTree = buildWeeklyTodoTree(data.todos, summary.completedTodos);

  function moveWeek(offset: number) {
    const next = new Date(`${weekStart}T12:00:00`);
    next.setDate(next.getDate() + offset * 7);
    setWeekStart(toDateKey(next));
  }

  function formatDate(dateKey: string) {
    return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(`${dateKey}T12:00:00`));
  }

  return (
    <section className="page-panel weekly-summary-page">
      <PageTitle eyebrow="复盘" title="周总结" />
      <div className="week-navigation" aria-label="周次切换">
        <button className="ghost-button icon-button" type="button" onClick={() => moveWeek(-1)} aria-label="上一周" title="上一周">
          <ChevronLeft size={19} />
        </button>
        <strong>{formatDate(summary.weekStart)} - {formatDate(summary.weekEnd)}</strong>
        <button className="ghost-button icon-button" type="button" onClick={() => moveWeek(1)} aria-label="下一周" title="下一周">
          <ChevronRight size={19} />
        </button>
        <button className="ghost-button" type="button" onClick={() => setWeekStart(toDateKey(getWeekStart()))}>
          本周
        </button>
      </div>

      <div className="weekly-metrics" aria-label="本周统计">
        <WeeklyMetric label="完成待办" value={`${summary.completedTodoCount} 项`} />
        <WeeklyMetric label="完成番茄" value={`${summary.completedPomodoroCount} 个`} />
        <WeeklyMetric label="实际专注" value={`${summary.focusMinutes} 分钟`} />
        <WeeklyMetric label="主要类型" value={summary.topTypeName ?? '暂无'} />
      </div>

      <section className="weekly-section weekly-trend" aria-labelledby="weekly-trend-title">
        <div className="analytics-heading">
          <h2 id="weekly-trend-title">每日完成</h2>
          <span>{summary.completedTodoCount} 项</span>
        </div>
        <div className="weekly-bar-chart" role="img" aria-label={`本周每日完成待办：${summary.dailyCompletion.map((item, index) => `${dayLabels[index]} ${item.completedCount} 项`).join('，')}`}>
          {summary.dailyCompletion.map((item, index) => (
            <div className="weekly-bar-item" key={item.date}>
              <span className="weekly-bar-value">{item.completedCount}</span>
              <div className="weekly-bar-track">
                <div className="weekly-bar-fill" style={{ height: `${(item.completedCount / maxDailyCompleted) * 100}%` }} />
              </div>
              <small>{dayLabels[index]}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="weekly-section" aria-labelledby="weekly-todos-title">
        <div className="analytics-heading">
          <h2 id="weekly-todos-title">本周完成任务</h2>
          <span>{summary.completedTodoCount} 项</span>
        </div>
        {summary.completedTodos.length === 0 ? (
          <p className="empty-state">这一周还没有完成待办。</p>
        ) : (
          <div className="weekly-task-list">
            {weeklyTodoTree.map((node) => (
              <WeeklyTodoTreeItem key={node.todo.id} node={node} />
            ))}
          </div>
        )}
      </section>

      <label className="reflection-box weekly-reflection-box">
        本周复盘
        <textarea
          aria-label="本周复盘"
          placeholder="记录这一周的收获与调整"
          value={reflection}
          onChange={(event) => onSaveReflection(weekStart, event.target.value)}
        />
      </label>
    </section>
  );
}

function WeeklyTodoTreeItem({ node, depth = 0 }: { node: WeeklyTodoNode; depth?: number }) {
  const isIncompleteParent = node.children.length > 0 && node.todo.status !== 'completed';

  return (
    <>
      <div className={node.completedThisWeek ? 'weekly-task-item completed' : 'weekly-task-item parent'} style={{ paddingLeft: `${depth * 22}px` }}>
        {node.completedThisWeek ? <CheckCircle2 size={17} aria-hidden="true" /> : <span className="weekly-tree-branch">└</span>}
        <strong>{node.todo.title}</strong>
        {isIncompleteParent && <em className="weekly-parent-status">进行中</em>}
        {node.completedThisWeek && <span>{node.todo.pomodoroCount} 个番茄</span>}
        {node.completedThisWeek && <time dateTime={node.todo.completedAt ?? undefined}>{node.todo.completedAt?.slice(0, 10)}</time>}
      </div>
      {node.children.map((child) => (
        <WeeklyTodoTreeItem key={child.todo.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

function WeeklyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="weekly-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function BacklogPage({
  items,
  tags,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAddTag,
  onDeleteTag,
  onNavigate
}: {
  items: BacklogItem[];
  tags: InspirationTag[];
  onAddItem: (title: string) => void;
  onUpdateItem: (item: BacklogItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddTag: (name: string, color: string) => void;
  onDeleteTag: (tagId: string) => void;
  onNavigate: (page: Page) => void;
}) {
  const [title, setTitle] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#315f4d');
  const [fountainAnimation, setFountainAnimation] = useState<'envelope' | 'glow' | null>(null);
  const [pendingDeleteTagId, setPendingDeleteTagId] = useState<string | null>(null);
  const [blockedDeleteTagId, setBlockedDeleteTagId] = useState<string | null>(null);
  const [completionBlockedItem, setCompletionBlockedItem] = useState<BacklogItem | null>(null);
  const [tagFocusItemId, setTagFocusItemId] = useState<string | null>(null);
  const animationTimer = useRef<number | null>(null);
  const activeItems = items.filter((item) => item.status === 'active');
  const groupedItems = [
    { id: null, name: '待分类', color: '#74634f', items: activeItems.filter((item) => !item.tagId) },
    ...tags.map((tag) => ({ ...tag, items: activeItems.filter((item) => item.tagId === tag.id) }))
  ].filter((group) => group.items.length > 0);

  useEffect(() => {
    return () => {
      if (animationTimer.current) window.clearTimeout(animationTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!tagFocusItemId) return;
    document.getElementById(`inspiration-tag-${tagFocusItemId}`)?.focus();
    setTagFocusItemId(null);
  }, [tagFocusItemId]);

  function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  function playFountainAnimation(animation: 'envelope' | 'glow') {
    if (prefersReducedMotion()) return;
    if (animationTimer.current) window.clearTimeout(animationTimer.current);
    setFountainAnimation(null);
    window.requestAnimationFrame(() => setFountainAnimation(animation));
    animationTimer.current = window.setTimeout(() => setFountainAnimation(null), 1250);
  }

  function addItem() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddItem(trimmed);
    setTitle('');
    playFountainAnimation('envelope');
  }

  function addTag() {
    const trimmed = tagName.trim();
    if (!trimmed || tags.some((tag) => tag.name === trimmed)) return;
    onAddTag(trimmed, tagColor);
    setTagName('');
  }

  function deleteTag(tagId: string) {
    if (items.some((item) => item.tagId === tagId)) {
      setBlockedDeleteTagId(tagId);
      setPendingDeleteTagId(null);
      return;
    }
    onDeleteTag(tagId);
    setPendingDeleteTagId(null);
  }

  function completeItem(item: BacklogItem) {
    const hasValidTag = Boolean(item.tagId && tags.some((tag) => tag.id === item.tagId));
    if (!hasValidTag) {
      setCompletionBlockedItem(item);
      return;
    }
    onUpdateItem({ ...item, status: 'completed', updatedAt: currentIso() });
    playFountainAnimation('glow');
  }

  return (
    <section className="page-panel table-page">
      <div className="backlog-page-heading">
        <PageTitle eyebrow="待思" title="灵感池" />
        <button className="ghost-button" type="button" onClick={() => onNavigate('completedBacklog')}>
          <Archive size={17} />
          已完成灵感
        </button>
      </div>
      <InspirationFountain animation={fountainAnimation} />
      <div className="toolbar">
        <input
          aria-label="新增灵感"
          placeholder="记录事情或问题"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addItem();
          }}
        />
        <button type="button" onClick={addItem}>
          <Plus size={17} />
          新增
        </button>
      </div>
      <div className="toolbar tag-toolbar inspiration-tag-toolbar">
        <input aria-label="新灵感标签名" placeholder="新增灵感标签" value={tagName} onChange={(event) => setTagName(event.target.value)} />
        <input aria-label="灵感标签颜色" type="color" value={tagColor} onChange={(event) => setTagColor(event.target.value)} />
        <button type="button" onClick={addTag}>
          <Tag size={17} />
          加标签
        </button>
      </div>
      <div className="type-tag-library inspiration-tag-library" aria-label="灵感标签库">
        <span>灵感标签</span>
        {tags.length === 0 && <em>暂无标签，可先记录后分类。</em>}
        {tags.map((tag) => {
          const usageCount = items.filter((item) => item.tagId === tag.id).length;
          const isConfirming = pendingDeleteTagId === tag.id;
          const isBlocked = blockedDeleteTagId === tag.id;
          return (
            <div key={tag.id} className={isConfirming ? 'type-tag-chip confirming' : 'type-tag-chip'} style={{ borderColor: tag.color }}>
              <span className="type-tag-chip-name"><i style={{ backgroundColor: tag.color }} />{tag.name}</span>
              <small>{usageCount} 项</small>
              {isBlocked ? (
                <>
                  <small className="type-tag-delete-blocked">仍有灵感使用此标签，无法删除。</small>
                  <button className="ghost-button" type="button" onClick={() => setBlockedDeleteTagId(null)}>知道了</button>
                </>
              ) : isConfirming ? (
                <>
                  <button className="danger-button" type="button" onClick={() => deleteTag(tag.id)}>确认删除</button>
                  <button className="ghost-button" type="button" onClick={() => setPendingDeleteTagId(null)}>取消</button>
                </>
              ) : (
                <button className="ghost-button icon-button" type="button" onClick={() => setPendingDeleteTagId(tag.id)} aria-label={`准备删除灵感标签 ${tag.name}`} title={`删除 ${tag.name}`}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="inspiration-groups">
        {groupedItems.map((group) => (
          <section className="inspiration-group" key={group.id ?? 'unclassified'}>
            <div className="inspiration-group-heading">
              <span style={{ backgroundColor: group.color }} />
              <h2>{group.name}</h2>
              <small>{group.items.length} 项</small>
            </div>
            <div className="backlog-table">
              {group.items.map((item) => (
                <div className="backlog-row inspiration-row" key={item.id}>
                  <button className="inspiration-complete-button" type="button" onClick={() => completeItem(item)} aria-label={`完成灵感 ${item.title}`} title="标记为已完成">
                    <CheckCircle2 size={18} />
                  </button>
                  <input aria-label={`${item.title} 内容`} value={item.title} onChange={(event) => onUpdateItem({ ...item, title: event.target.value, updatedAt: currentIso() })} />
                  <select id={`inspiration-tag-${item.id}`} aria-label={`${item.title} 灵感标签`} value={item.tagId ?? ''} onChange={(event) => onUpdateItem({ ...item, tagId: event.target.value || null, updatedAt: currentIso() })}>
                    <option value="">待分类</option>
                    {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                  </select>
                  <button className="ghost-button icon-button" type="button" onClick={() => onDeleteItem(item.id)} aria-label={`删除 ${item.title}`}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </section>
        ))}
        {activeItems.length === 0 && <p className="empty-state table-empty">灵感池暂时为空，写下一条新的想法吧。</p>}
      </div>
      {completionBlockedItem && (
        <div className="completion-dialog-backdrop" role="presentation">
          <section className="completion-dialog" role="alertdialog" aria-modal="true" aria-labelledby="inspiration-completion-dialog-title">
            <h2 id="inspiration-completion-dialog-title">完成前请选择灵感标签</h2>
            <p>“{completionBlockedItem.title}”尚未分类，无法归档为已完成灵感。</p>
            <div className="completion-dialog-actions">
              <button className="ghost-button" type="button" onClick={() => setCompletionBlockedItem(null)}>取消</button>
              <button type="button" onClick={() => { setTagFocusItemId(completionBlockedItem.id); setCompletionBlockedItem(null); }}>前往选择标签</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function CompletedInspirationPage({
  items,
  tags,
  onUpdateItem,
  onNavigate
}: {
  items: BacklogItem[];
  tags: InspirationTag[];
  onUpdateItem: (item: BacklogItem) => void;
  onNavigate: (page: Page) => void;
}) {
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const completedItems = items.filter((item) => item.status === 'completed');
  const detailItem = completedItems.find((item) => item.id === detailItemId) ?? null;
  const groupedItems = tags
    .map((tag) => ({ ...tag, items: completedItems.filter((item) => item.tagId === tag.id) }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="page-panel table-page completed-inspiration-page">
      <div className="backlog-page-heading">
        <PageTitle eyebrow="已悟" title="已完成灵感" />
        <button className="ghost-button" type="button" onClick={() => onNavigate('backlog')}>返回灵感池</button>
      </div>
      {completedItems.length === 0 ? (
        <p className="empty-state table-empty">还没有已完成灵感。</p>
      ) : (
        <div className="inspiration-groups">
          {groupedItems.map((group) => (
            <section className="inspiration-group" key={group.id}>
              <div className="inspiration-group-heading"><span style={{ backgroundColor: group.color }} /><h2>{group.name}</h2><small>{group.items.length} 项</small></div>
              <div className="completed-inspiration-list">
                {group.items.map((item) => (
                  <div className="completed-inspiration-item" key={item.id}>
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <strong>{item.title}</strong>
                    <button className="ghost-button" type="button" onClick={() => setDetailItemId(item.id)}><Eye size={17} />查看详情</button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {detailItem && (
        <InspirationDetailDialog
          key={detailItem.id}
          item={detailItem}
          onClose={() => setDetailItemId(null)}
          onUpdateItem={onUpdateItem}
          onReopen={() => {
            onUpdateItem({ ...detailItem, status: 'active', updatedAt: currentIso() });
            setDetailItemId(null);
          }}
        />
      )}
    </section>
  );
}

function InspirationDetailDialog({ item, onClose, onUpdateItem, onReopen }: { item: BacklogItem; onClose: () => void; onUpdateItem: (item: BacklogItem) => void; onReopen: () => void }) {
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  return (
    <div className="completion-dialog-backdrop" role="presentation">
      <section className="inspiration-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="inspiration-detail-title">
        <header>
          <div><p className="eyebrow">完成灵感</p><h2 id="inspiration-detail-title">查看详情</h2></div>
          <button className="ghost-button icon-button" type="button" onClick={onClose} aria-label="关闭详情">×</button>
        </header>
        <div className="inspiration-detail-grid">
          <aside><span>灵感标题</span><strong>{item.title}</strong></aside>
          <section>
            <div className="detail-editor-heading"><span>完成细节</span><div><button className={view === 'edit' ? 'detail-tab active' : 'detail-tab'} type="button" onClick={() => setView('edit')}>编辑</button><button className={view === 'preview' ? 'detail-tab active' : 'detail-tab'} type="button" onClick={() => setView('preview')}>预览</button></div></div>
            {view === 'edit' ? (
              <textarea aria-label={`${item.title} 完成细节`} placeholder="支持 Markdown：标题、列表、引用、代码块和链接" value={item.completionDetails} onChange={(event) => onUpdateItem({ ...item, completionDetails: event.target.value, updatedAt: currentIso() })} />
            ) : (
              <div className="markdown-preview">{item.completionDetails.trim() ? <ReactMarkdown>{item.completionDetails}</ReactMarkdown> : <p>暂无完成细节。</p>}</div>
            )}
          </section>
        </div>
        <footer><button className="ghost-button" type="button" onClick={onReopen}>重新打开</button><button type="button" onClick={onClose}>完成</button></footer>
      </section>
    </div>
  );
}

function InspirationFountain({ animation }: { animation: 'envelope' | 'glow' | null }) {
  return (
    <div
      className={`inspiration-fountain${animation ? ` animation-${animation}` : ''}`}
      data-testid="inspiration-fountain"
      aria-hidden="true"
    >
      <img className="fountain-photo" src={inspirationFountainImage} alt="" />
      <div className="fountain-photo-vignette" />
      <div className="pool-ambient-shimmer">
        <span />
        <span />
      </div>
      <span className="water-ripple ripple-one" />
      <span className="water-ripple ripple-two" />
      <div className="fountain-completion-glow" />
      <div className="fountain-sparkles">
        <i /><i /><i /><i />
      </div>
      <div className="inspiration-envelope">
        <Send size={20} fill="currentColor" strokeWidth={1.8} />
        <Sparkles className="envelope-sparkle" size={18} />
      </div>
    </div>
  );
}

function PageTitle({ eyebrow, title, compact = false }: { eyebrow: string; title: string; compact?: boolean }) {
  return (
    <div className={compact ? 'page-title compact' : 'page-title'}>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <ScrollText size={compact ? 18 : 24} />
    </div>
  );
}
