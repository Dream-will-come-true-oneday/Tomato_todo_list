import type { PomodoroRecord, Todo, TodoTypeTag } from './types';
import { toDateKey } from './todoFilters';

export type TypeTagShare = {
  id: string;
  name: string;
  color: string;
  count: number;
  percentage: number;
};

export type WeekDaySummary = {
  date: string;
  completedCount: number;
};

export type WeekSummary = {
  weekStart: string;
  weekEnd: string;
  completedTodos: Todo[];
  completedTodoCount: number;
  completedPomodoroCount: number;
  focusMinutes: number;
  dailyCompletion: WeekDaySummary[];
  topTypeName: string | null;
};

const UNCLASSIFIED_TAG = { id: 'unclassified', name: '未分类', color: '#74634f' };

function dateFromKey(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`);
}

export function getWeekStart(date = new Date()) {
  const result = new Date(date);
  result.setHours(12, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

export function getWeekDateKeys(weekStart: Date | string) {
  const start = getWeekStart(typeof weekStart === 'string' ? dateFromKey(weekStart) : weekStart);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return toDateKey(date);
  });
}

export function getCompletedTypeTagShares(
  todos: Todo[],
  typeTags: Array<Pick<TodoTypeTag, 'id' | 'name' | 'color'>>
): TypeTagShare[] {
  const knownTags = new Map(typeTags.map((tag) => [tag.id, tag]));
  const counts = new Map<string, number>();

  for (const todo of todos.filter((item) => item.status === 'completed')) {
    const uniqueTagIds = [...new Set(todo.typeTagIds)];
    const knownTagIds = uniqueTagIds.filter((tagId) => knownTags.has(tagId));
    const hasUnknownTag = uniqueTagIds.some((tagId) => !knownTags.has(tagId));

    for (const tagId of knownTagIds) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }

    if (knownTagIds.length === 0 || hasUnknownTag) {
      counts.set(UNCLASSIFIED_TAG.id, (counts.get(UNCLASSIFIED_TAG.id) ?? 0) + 1);
    }
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .map(([id, count]) => {
      const tag = knownTags.get(id) ?? UNCLASSIFIED_TAG;
      return { ...tag, count, percentage: Math.round((count / total) * 100) };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function getWeekSummary(
  todos: Todo[],
  typeTags: Array<Pick<TodoTypeTag, 'id' | 'name' | 'color'>>,
  pomodoroRecords: PomodoroRecord[],
  weekStart: Date | string
): WeekSummary {
  const dateKeys = getWeekDateKeys(weekStart);
  const dateKeySet = new Set(dateKeys);
  const completedTodos = todos.filter(
    (todo) => todo.status === 'completed' && Boolean(todo.completedAt) && dateKeySet.has(todo.completedAt!.slice(0, 10))
  );
  const completedPomodoros = pomodoroRecords.filter(
    (record) => record.completionType === 'completed' && dateKeySet.has(record.endedAt.slice(0, 10))
  );
  const shares = getCompletedTypeTagShares(completedTodos, typeTags);

  return {
    weekStart: dateKeys[0],
    weekEnd: dateKeys[6],
    completedTodos,
    completedTodoCount: completedTodos.length,
    completedPomodoroCount: completedPomodoros.length,
    focusMinutes: Math.round(completedPomodoros.reduce((sum, record) => sum + record.actualElapsedSeconds, 0) / 60),
    dailyCompletion: dateKeys.map((date) => ({
      date,
      completedCount: completedTodos.filter((todo) => todo.completedAt?.slice(0, 10) === date).length
    })),
    topTypeName: shares[0]?.name ?? null
  };
}
