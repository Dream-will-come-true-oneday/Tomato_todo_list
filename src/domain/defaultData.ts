import type { AppData, TimerPreset, Todo } from './types';

const nowIso = () => new Date().toISOString();

export const DEFAULT_PRESETS: TimerPreset[] = [
  {
    id: 'preset-study',
    name: '学习',
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4,
    autoStartNextPhase: false
  },
  {
    id: 'preset-coding',
    name: '编程',
    focusMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 25,
    longBreakInterval: 3,
    autoStartNextPhase: false
  },
  {
    id: 'preset-writing',
    name: '写作',
    focusMinutes: 35,
    shortBreakMinutes: 7,
    longBreakMinutes: 20,
    longBreakInterval: 3,
    autoStartNextPhase: false
  },
  {
    id: 'preset-light',
    name: '轻量',
    focusMinutes: 15,
    shortBreakMinutes: 3,
    longBreakMinutes: 10,
    longBreakInterval: 4,
    autoStartNextPhase: false
  }
];

export function createDefaultTodo(title = '整理今日计划'): Todo {
  const createdAt = nowIso();
  return {
    id: `todo-${crypto.randomUUID()}`,
    title,
    notes: '',
    status: 'active',
    priority: 'medium',
    startAt: null,
    dueAt: null,
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    pomodoroCount: 0
  };
}

export function createDefaultAppData(): AppData {
  const presets = DEFAULT_PRESETS.map((preset) => ({ ...preset }));
  return {
    version: 1,
    presets,
    todos: [createDefaultTodo()],
    pomodoroRecords: [],
    activePresetId: presets[0].id
  };
}
