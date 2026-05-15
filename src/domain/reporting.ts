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

export type WeeklyTodoNode = {
  todo: Todo;
  completedThisWeek: boolean;
  children: WeeklyTodoNode[];
};

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
    for (const tagId of knownTagIds) {
      counts.set(tagId, (counts.get(tagId) ?? 0) + 1);
    }
  }

  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0) return [];

  return [...counts.entries()]
    .map(([id, count]) => ({ ...knownTags.get(id)!, count, percentage: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function buildWeeklyTodoTree(todos: Todo[], completedTodos: Todo[]): WeeklyTodoNode[] {
  const todoById = new Map(todos.map((todo) => [todo.id, todo]));
  const completedIds = new Set(completedTodos.map((todo) => todo.id));
  const includedIds = new Set(completedIds);

  for (const completedTodo of completedTodos) {
    const visited = new Set<string>();
    let parentId = completedTodo.parentId;
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId);
      const parent = todoById.get(parentId);
      if (!parent) break;
      includedIds.add(parent.id);
      parentId = parent.parentId;
    }
  }

  const nodeById = new Map<string, WeeklyTodoNode>();
  for (const todoId of includedIds) {
    const todo = todoById.get(todoId);
    if (todo) nodeById.set(todoId, { todo, completedThisWeek: completedIds.has(todoId), children: [] });
  }

  const roots: WeeklyTodoNode[] = [];
  for (const node of nodeById.values()) {
    const parent = node.todo.parentId ? nodeById.get(node.todo.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortNodes = (nodes: WeeklyTodoNode[]) => {
    nodes.sort((a, b) => a.todo.createdAt.localeCompare(b.todo.createdAt) || a.todo.title.localeCompare(b.todo.title));
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);
  return roots;
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
