import { CalendarDays, CalendarRange, Plus, Trash2 } from 'lucide-react';
import type { RefObject } from 'react';
import pomodoroBackgroundImage from '../assets/longchang-awakening-pomodoro.png';
import { PageTitle } from '../components/PageTitle';
import TimerPanel, { type TimerPanelHandle, type TimerSnapshot } from '../components/TimerPanel';
import type { TimerPreset, Todo } from '../domain/types';
import type { Page } from '../lib/navigation';

export default function PomodoroPage({
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
        <button className="ghost-button" type="button" onClick={() => onNavigate('dailySchedule')}>
          <CalendarRange size={17} />
          每日时间安排
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
        </aside>
      </div>
    </section>
  );
}
