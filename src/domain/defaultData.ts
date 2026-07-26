import type { AppData, BacklogItem, TimerPreset, Todo, TodoTypeTag } from './types';

const nowIso = () => new Date().toISOString();

export const DEFAULT_PRESETS: TimerPreset[] = [
  {
    id: 'preset-study',
    name: '静读',
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4,
    autoStartNextPhase: false,
    soundEnabled: true
  },
  {
    id: 'preset-coding',
    name: '研习',
    focusMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 25,
    longBreakInterval: 3,
    autoStartNextPhase: false,
    soundEnabled: true
  },
  {
    id: 'preset-writing',
    name: '执笔',
    focusMinutes: 35,
    shortBreakMinutes: 7,
    longBreakMinutes: 20,
    longBreakInterval: 3,
    autoStartNextPhase: false,
    soundEnabled: true
  },
  {
    id: 'preset-light',
    name: '小憩',
    focusMinutes: 15,
    shortBreakMinutes: 3,
    longBreakMinutes: 10,
    longBreakInterval: 4,
    autoStartNextPhase: false,
    soundEnabled: true
  }
];

export function createDefaultTodo(
  title = '整理今日计划',
  options: Partial<
    Pick<Todo, 'parentId' | 'term' | 'urgencyTags' | 'typeTagIds' | 'startAt' | 'dueAt' | 'notes' | 'status'>
  > = {}
): Todo {
  const createdAt = nowIso();
  return {
    id: `todo-${crypto.randomUUID()}`,
    title,
    notes: options.notes ?? '',
    status: options.status ?? 'notStarted',
    priority: 'medium',
    parentId: options.parentId ?? null,
    term: options.term ?? 'short',
    urgencyTags: options.urgencyTags ?? [],
    typeTagIds: options.typeTagIds ?? [],
    startAt: options.startAt ?? null,
    dueAt: options.dueAt ?? null,
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    pomodoroCount: 0
  };
}

export function createTypeTag(name: string, color = '#9b2f25'): TodoTypeTag {
  return {
    id: `tag-${crypto.randomUUID()}`,
    name,
    color,
    createdAt: nowIso()
  };
}

export function createBacklogItem(title: string): BacklogItem {
  const createdAt = nowIso();
  return {
    id: `backlog-${crypto.randomUUID()}`,
    title,
    isPlanned: false,
    createdAt,
    updatedAt: createdAt
  };
}

export function createDefaultAppData(): AppData {
  const presets = DEFAULT_PRESETS.map((preset) => ({ ...preset }));
  return {
    version: 4,
    presets,
    todos: [createDefaultTodo()],
    typeTags: [
      {
        id: 'tag-reading',
        name: '读书',
        color: '#8b5f2a',
        createdAt: nowIso()
      },
      {
        id: 'tag-work',
        name: '事务',
        color: '#315f4d',
        createdAt: nowIso()
      }
    ],
    reflections: [],
    weeklyReflections: [],
    backlogItems: [],
    pomodoroRecords: [],
    todayPlans: {},
    activePresetId: presets[0].id
  };
}
