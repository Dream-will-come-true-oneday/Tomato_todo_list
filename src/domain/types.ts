export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak';
export type TodoStatus = 'notStarted' | 'active' | 'completed' | 'archived';
export type TodoPriority = 'low' | 'medium' | 'high';
export type TodoTerm = 'short' | 'long';
export type UrgencyTag = 'urgent' | 'important';
export type PomodoroCompletionType = 'completed' | 'skipped' | 'reset';

export type TimerPreset = {
  id: string;
  name: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartNextPhase: boolean;
  soundEnabled: boolean;
};

export type Todo = {
  id: string;
  title: string;
  notes: string;
  status: TodoStatus;
  priority: TodoPriority;
  parentId: string | null;
  term: TodoTerm;
  urgencyTags: UrgencyTag[];
  typeTagIds: string[];
  startAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  pomodoroCount: number;
};

export type TodoTypeTag = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
};

export type DailyReflection = {
  date: string;
  content: string;
  updatedAt: string;
};

export type WeeklyReflection = {
  weekStart: string;
  content: string;
  updatedAt: string;
};

export type BacklogItem = {
  id: string;
  title: string;
  isPlanned: boolean;
  createdAt: string;
  updatedAt: string;
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

export type DailyPomodoroPlan = {
  addedTodoIds: string[];
  excludedTodoIds: string[];
};

export type AppData = {
  version: 4;
  presets: TimerPreset[];
  todos: Todo[];
  typeTags: TodoTypeTag[];
  reflections: DailyReflection[];
  weeklyReflections: WeeklyReflection[];
  backlogItems: BacklogItem[];
  pomodoroRecords: PomodoroRecord[];
  todayPlans: Record<string, DailyPomodoroPlan>;
  activePresetId: string;
};
