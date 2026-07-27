import { createDefaultAppData } from './defaultData';
import type {
  AppData,
  BacklogItem,
  DailyPomodoroPlan,
  InspirationTag,
  TimerPreset,
  Todo,
  TodoStatus,
  TodoTypeTag,
  WeeklyReflection
} from './types';

export const STORAGE_KEY = 'pomodoro-todo-app:v1';

type LoadResult = {
  data: AppData;
  recovered: boolean;
};

type StoredAppData = Partial<AppData> & {
  version?: number;
  todos?: Array<Partial<Todo>>;
  presets?: Array<Partial<TimerPreset>>;
};

type StoredBacklogItem = Partial<BacklogItem> & { isPlanned?: unknown };

const validStatuses: TodoStatus[] = ['notStarted', 'active', 'completed', 'archived'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function migrateTodo(todo: Partial<Todo>): Todo {
  const now = new Date().toISOString();
  const status = validStatuses.includes(todo.status as TodoStatus) ? (todo.status as TodoStatus) : 'notStarted';
  const checkInDates = Array.isArray(todo.checkInDates)
    ? [...new Set(todo.checkInDates.filter((date): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)))]
    : [];
  return {
    id: typeof todo.id === 'string' ? todo.id : `todo-${crypto.randomUUID()}`,
    title: typeof todo.title === 'string' ? todo.title : '未命名待办',
    notes: typeof todo.notes === 'string' ? todo.notes : '',
    status,
    priority: todo.priority ?? 'medium',
    parentId: typeof todo.parentId === 'string' ? todo.parentId : null,
    term: todo.term === 'long' ? 'long' : 'short',
    urgencyTags: Array.isArray(todo.urgencyTags) ? todo.urgencyTags : [],
    typeTagIds: Array.isArray(todo.typeTagIds) ? todo.typeTagIds : [],
    startAt: typeof todo.startAt === 'string' ? todo.startAt : null,
    dueAt: typeof todo.dueAt === 'string' ? todo.dueAt : null,
    createdAt: todo.createdAt ?? now,
    updatedAt: todo.updatedAt ?? now,
    completedAt: todo.completedAt ?? (status === 'completed' ? now : null),
    pomodoroCount: todo.pomodoroCount ?? 0,
    checkInDates
  };
}

function migratePreset(preset: Partial<TimerPreset>): TimerPreset {
  return {
    id: typeof preset.id === 'string' ? preset.id : `preset-${crypto.randomUUID()}`,
    name: typeof preset.name === 'string' ? preset.name : '鐣寗',
    focusMinutes: typeof preset.focusMinutes === 'number' ? preset.focusMinutes : 25,
    shortBreakMinutes: typeof preset.shortBreakMinutes === 'number' ? preset.shortBreakMinutes : 5,
    longBreakMinutes: typeof preset.longBreakMinutes === 'number' ? preset.longBreakMinutes : 15,
    longBreakInterval: typeof preset.longBreakInterval === 'number' ? preset.longBreakInterval : 4,
    autoStartNextPhase: Boolean(preset.autoStartNextPhase),
    soundEnabled: typeof preset.soundEnabled === 'boolean' ? preset.soundEnabled : true
  };
}

function migrateTodayPlans(value: unknown): Record<string, DailyPomodoroPlan> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, Record<string, unknown>] => /^\d{4}-\d{2}-\d{2}$/.test(entry[0]) && isRecord(entry[1]))
      .map(([dateKey, plan]) => {
        const addedTodoIds = plan.addedTodoIds;
        const excludedTodoIds = plan.excludedTodoIds;
        return [
          dateKey,
          {
            addedTodoIds: Array.isArray(addedTodoIds)
              ? addedTodoIds.filter((id): id is string => typeof id === 'string')
              : [],
            excludedTodoIds: Array.isArray(excludedTodoIds)
              ? excludedTodoIds.filter((id): id is string => typeof id === 'string')
              : []
          }
        ];
      })
  );
}

function migrateWeeklyReflections(value: unknown): WeeklyReflection[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .filter((item) => typeof item.weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.weekStart))
    .map((item) => ({
      weekStart: item.weekStart as string,
      content: typeof item.content === 'string' ? item.content : '',
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()
    }));
}

function migrateTypeTags(value: unknown): TodoTypeTag[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((tag): tag is Record<string, unknown> => isRecord(tag))
    .filter((tag) => typeof tag.id === 'string' && typeof tag.name === 'string' && typeof tag.color === 'string')
    .map((tag) => ({
      id: tag.id as string,
      name: tag.name as string,
      color: tag.color as string,
      createdAt: typeof tag.createdAt === 'string' ? tag.createdAt : new Date().toISOString()
    }));
}

function migrateInspirationTags(value: unknown): InspirationTag[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((tag): tag is Record<string, unknown> => isRecord(tag))
    .filter((tag) => typeof tag.id === 'string' && typeof tag.name === 'string' && typeof tag.color === 'string')
    .map((tag) => ({
      id: tag.id as string,
      name: tag.name as string,
      color: tag.color as string,
      createdAt: typeof tag.createdAt === 'string' ? tag.createdAt : new Date().toISOString()
    }));
}

function migrateBacklogItems(value: unknown, validTagIds: Set<string>): BacklogItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is StoredBacklogItem => isRecord(item))
    .filter((item) => typeof item.id === 'string' && typeof item.title === 'string')
    .map((item) => {
      const status = item.status === 'completed' || item.isPlanned === true ? 'completed' : 'active';
      const tagId = typeof item.tagId === 'string' && validTagIds.has(item.tagId) ? item.tagId : null;
      const now = new Date().toISOString();
      return {
        id: item.id as string,
        title: item.title as string,
        status,
        tagId,
        completionDetails: typeof item.completionDetails === 'string' ? item.completionDetails : '',
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : now,
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : now
      };
    });
}

function ensureCompletedInspirationTags(items: BacklogItem[], tags: InspirationTag[]) {
  const needsLegacyTag = items.some((item) => item.status === 'completed' && !item.tagId);
  if (!needsLegacyTag) return { items, tags };

  const legacyTag = tags.find((tag) => tag.name === '旧灵感') ?? {
    id: 'inspiration-tag-legacy',
    name: '旧灵感',
    color: '#765a25',
    createdAt: new Date().toISOString()
  };
  const nextTags = tags.some((tag) => tag.id === legacyTag.id) ? tags : [...tags, legacyTag];

  return {
    tags: nextTags,
    items: items.map((item) => (item.status === 'completed' && !item.tagId ? { ...item, tagId: legacyTag.id } : item))
  };
}

function ensureCompletedTodosHaveTypeTag(todos: Todo[], typeTags: TodoTypeTag[]) {
  const validTagIds = new Set(typeTags.map((tag) => tag.id));
  const needsItTag = todos.some(
    (todo) => todo.status === 'completed' && !todo.typeTagIds.some((tagId) => validTagIds.has(tagId))
  );
  if (!needsItTag) return { todos, typeTags };

  const itTag = typeTags.find((tag) => tag.name === 'IT') ?? {
    id: 'tag-it',
    name: 'IT',
    color: '#3f5e77',
    createdAt: new Date().toISOString()
  };
  const nextTypeTags = typeTags.some((tag) => tag.id === itTag.id) ? typeTags : [...typeTags, itTag];
  const nextValidTagIds = new Set(nextTypeTags.map((tag) => tag.id));

  return {
    typeTags: nextTypeTags,
    todos: todos.map((todo) => {
      if (todo.status !== 'completed') return todo;
      const validIds = [...new Set(todo.typeTagIds.filter((tagId) => nextValidTagIds.has(tagId)))];
      return validIds.length > 0 ? { ...todo, typeTagIds: validIds } : { ...todo, typeTagIds: [itTag.id] };
    })
  };
}

function migrateAppData(value: StoredAppData): AppData | null {
  if (
    !Array.isArray(value.presets) ||
    !Array.isArray(value.todos)
  ) {
    return null;
  }

  const presets = value.presets.map(migratePreset);
  const typeTags = migrateTypeTags(value.typeTags);
  const completedTagMigration = ensureCompletedTodosHaveTypeTag(value.todos.map(migrateTodo), typeTags);
  const inspirationTags = migrateInspirationTags(value.inspirationTags);
  const backlogItems = migrateBacklogItems(value.backlogItems, new Set(inspirationTags.map((tag) => tag.id)));
  const completedInspirationMigration = ensureCompletedInspirationTags(backlogItems, inspirationTags);

  return {
    version: 6,
    presets,
    todos: completedTagMigration.todos,
    typeTags: completedTagMigration.typeTags,
    reflections: Array.isArray(value.reflections) ? value.reflections : [],
    weeklyReflections: migrateWeeklyReflections(value.weeklyReflections),
    backlogItems: completedInspirationMigration.items,
    inspirationTags: completedInspirationMigration.tags,
    pomodoroRecords: Array.isArray(value.pomodoroRecords) ? value.pomodoroRecords : [],
    todayPlans: migrateTodayPlans(value.todayPlans),
    activePresetId:
      typeof value.activePresetId === 'string' && presets.some((preset) => preset.id === value.activePresetId)
        ? value.activePresetId
        : presets[0]?.id ?? ''
  };
}

export function loadAppData(storage: Storage = window.localStorage): LoadResult {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return { data: createDefaultAppData(), recovered: false };
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { data: createDefaultAppData(), recovered: true };

    const migrated = migrateAppData(parsed as StoredAppData);
    return migrated ? { data: migrated, recovered: false } : { data: createDefaultAppData(), recovered: true };
  } catch {
    return { data: createDefaultAppData(), recovered: true };
  }
}

export function saveAppData(data: AppData, storage: Storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}
