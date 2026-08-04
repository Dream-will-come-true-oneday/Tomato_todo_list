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
  achievementCount: number;
};

export type TodoAchievementKind = 'completed' | 'checkIn';

export type TodoAchievement = {
  todoId: string;
  date: string;
  kind: TodoAchievementKind;
};

export type WeekSummary = {
  weekStart: string;
  weekEnd: string;
  achievements: TodoAchievement[];
  achievementTodos: Todo[];
  achievementCount: number;
  completedPomodoroCount: number;
  focusMinutes: number;
  dailyAchievements: WeekDaySummary[];
  topTypeName: string | null;
};

export type WeeklyTodoNode = {
  todo: Todo;
  completedThisWeek: boolean;
  checkInCountThisWeek: number;
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

export function getTodoAchievements(todos: Todo[]): TodoAchievement[] {
  return todos.flatMap((todo) => {
    const completedDate = todo.status === 'completed' ? todo.completedAt?.slice(0, 10) ?? null : null;
    const achievements: TodoAchievement[] = completedDate
      ? [{ todoId: todo.id, date: completedDate, kind: 'completed' }]
      : [];

    for (const date of new Set(todo.checkInDates)) {
      if (date !== completedDate) achievements.push({ todoId: todo.id, date, kind: 'checkIn' });
    }

    return achievements;
  });
}

export function getAchievementsOn(todos: Todo[], date: string) {
  return getTodoAchievements(todos).filter((achievement) => achievement.date === date);
}

export function getAchievementTypeTagShares(
  todos: Todo[],
  typeTags: Array<Pick<TodoTypeTag, 'id' | 'name' | 'color'>>,
  achievements = getTodoAchievements(todos)
): TypeTagShare[] {
  const knownTags = new Map(typeTags.map((tag) => [tag.id, tag]));
  const todoById = new Map(todos.map((todo) => [todo.id, todo]));
  const counts = new Map<string, number>();

  for (const achievement of achievements) {
    const todo = todoById.get(achievement.todoId);
    if (!todo) continue;
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

export function buildWeeklyTodoTree(todos: Todo[], achievements: TodoAchievement[]): WeeklyTodoNode[] {
  const todoById = new Map(todos.map((todo) => [todo.id, todo]));
  const completedIds = new Set(achievements.filter((item) => item.kind === 'completed').map((item) => item.todoId));
  const checkInCounts = new Map<string, number>();
  for (const achievement of achievements.filter((item) => item.kind === 'checkIn')) {
    checkInCounts.set(achievement.todoId, (checkInCounts.get(achievement.todoId) ?? 0) + 1);
  }
  const achievementIds = new Set(achievements.map((item) => item.todoId));
  const includedIds = new Set(achievementIds);

  for (const todoId of achievementIds) {
    const achievementTodo = todoById.get(todoId);
    if (!achievementTodo) continue;
    const visited = new Set<string>();
    let parentId = achievementTodo.parentId;
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
    if (todo) {
      nodeById.set(todoId, {
        todo,
        completedThisWeek: completedIds.has(todoId),
        checkInCountThisWeek: checkInCounts.get(todoId) ?? 0,
        children: []
      });
    }
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
  const achievements = getTodoAchievements(todos).filter((achievement) => dateKeySet.has(achievement.date));
  const achievementTodoIds = new Set(achievements.map((achievement) => achievement.todoId));
  const achievementTodos = todos.filter((todo) => achievementTodoIds.has(todo.id));
  const completedPomodoros = pomodoroRecords.filter(
    (record) => record.completionType === 'completed' && dateKeySet.has(record.endedAt.slice(0, 10))
  );
  const shares = getAchievementTypeTagShares(todos, typeTags, achievements);

  return {
    weekStart: dateKeys[0],
    weekEnd: dateKeys[6],
    achievements,
    achievementTodos,
    achievementCount: achievements.length,
    completedPomodoroCount: completedPomodoros.length,
    focusMinutes: Math.round(completedPomodoros.reduce((sum, record) => sum + record.actualElapsedSeconds, 0) / 60),
    dailyAchievements: dateKeys.map((date) => ({
      date,
      achievementCount: achievements.filter((achievement) => achievement.date === date).length
    })),
    topTypeName: shares[0]?.name ?? null
  };
}
