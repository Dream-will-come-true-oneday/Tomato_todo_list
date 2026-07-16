import { createDefaultTodo } from './defaultData';
import { createPomodoroRecord } from './pomodoro';
import type { AppData, PomodoroCompletionType, TimerPreset, Todo } from './types';

export type AppAction =
  | {
      type: 'completeFocusSession';
      todoId: string | null;
      startedAt: Date;
      endedAt: Date;
      actualElapsedSeconds: number;
      completionType: PomodoroCompletionType;
    }
  | { type: 'addTodo'; title: string }
  | { type: 'updateTodo'; todo: Todo }
  | { type: 'setActivePreset'; presetId: string }
  | { type: 'upsertPreset'; preset: TimerPreset }
  | { type: 'deletePreset'; presetId: string };

export function appReducer(data: AppData, action: AppAction): AppData {
  switch (action.type) {
    case 'completeFocusSession': {
      const preset = data.presets.find((item) => item.id === data.activePresetId) ?? data.presets[0];
      const record = createPomodoroRecord({ preset, ...action });
      const shouldIncrement = action.completionType === 'completed' && Boolean(action.todoId);
      return {
        ...data,
        todos: shouldIncrement
          ? data.todos.map((todo) =>
              todo.id === action.todoId
                ? { ...todo, pomodoroCount: todo.pomodoroCount + 1, updatedAt: action.endedAt.toISOString() }
                : todo
            )
          : data.todos,
        pomodoroRecords: [record, ...data.pomodoroRecords]
      };
    }
    case 'addTodo': {
      return { ...data, todos: [createDefaultTodo(action.title), ...data.todos] };
    }
    case 'updateTodo': {
      return {
        ...data,
        todos: data.todos.map((todo) => (todo.id === action.todo.id ? action.todo : todo))
      };
    }
    case 'setActivePreset': {
      return data.presets.some((preset) => preset.id === action.presetId)
        ? { ...data, activePresetId: action.presetId }
        : data;
    }
    case 'upsertPreset': {
      const exists = data.presets.some((preset) => preset.id === action.preset.id);
      return {
        ...data,
        presets: exists
          ? data.presets.map((preset) => (preset.id === action.preset.id ? action.preset : preset))
          : [...data.presets, action.preset],
        activePresetId: action.preset.id
      };
    }
    case 'deletePreset': {
      if (data.presets.length <= 1) return data;
      const presets = data.presets.filter((preset) => preset.id !== action.presetId);
      return {
        ...data,
        presets,
        activePresetId: data.activePresetId === action.presetId ? presets[0].id : data.activePresetId
      };
    }
    default:
      return data;
  }
}
