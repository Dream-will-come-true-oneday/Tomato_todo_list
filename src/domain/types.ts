export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak';
export type TodoStatus = 'active' | 'completed' | 'archived';
export type TodoPriority = 'low' | 'medium' | 'high';
export type PomodoroCompletionType = 'completed' | 'skipped' | 'reset';

export type TimerPreset = {
  id: string;
  name: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartNextPhase: boolean;
};

export type Todo = {
  id: string;
  title: string;
  notes: string;
  status: TodoStatus;
  priority: TodoPriority;
  startAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  pomodoroCount: number;
};

export type PomodoroRecord = {
  id: string;
  todoId: string | null;
  presetId: string;
  startedAt: string;
  endedAt: string;
  plannedFocusMinutes: number;
  actualElapsedSeconds: number;
  completionType: PomodoroCompletionType;
};

export type AppData = {
  version: 1;
  presets: TimerPreset[];
  todos: Todo[];
  pomodoroRecords: PomodoroRecord[];
  activePresetId: string;
};
