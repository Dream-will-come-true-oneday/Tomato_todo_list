import { compareTodosBySchedule, matchesTodoFilters, type TodoFilterState } from './todoView';
import { getAchievementsOn, type TodoAchievementKind } from './reporting';
import type { Todo } from './types';

export type CompletedTodoGroup = {
  parent: Todo;
  parentAchievementKind: TodoAchievementKind | null;
  children: Array<{ todo: Todo; achievementKind: TodoAchievementKind }>;
};

export function buildCompletedTodoGroups(todos: Todo[], dateKey: string): CompletedTodoGroup[] {
  const todoById = new Map(todos.map((todo) => [todo.id, todo]));
  const achievements = getAchievementsOn(todos, dateKey);
  const achievementKindByTodoId = new Map(achievements.map((achievement) => [achievement.todoId, achievement.kind]));
  const groups = new Map<string, CompletedTodoGroup>();

  for (const achievement of achievements) {
    const todo = todoById.get(achievement.todoId);
    if (!todo) continue;
    const parent = todo.parentId ? todoById.get(todo.parentId) : null;
    const groupParent = parent ?? todo;
    const existing = groups.get(groupParent.id);
    const group =
      existing ??
      {
        parent: groupParent,
        parentAchievementKind: achievementKindByTodoId.get(groupParent.id) ?? null,
        children: []
      };

    if (todo.id !== groupParent.id) {
      group.children.push({ todo, achievementKind: achievement.kind });
    }

    groups.set(groupParent.id, group);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      parentAchievementKind: achievementKindByTodoId.get(group.parent.id) ?? group.parentAchievementKind,
      children: [...group.children].sort((a, b) => compareTodosBySchedule(a.todo, b.todo))
    }))
    .sort((a, b) => compareTodosBySchedule(a.parent, b.parent));
}

export function filterCompletedTodoGroups(groups: CompletedTodoGroup[], filters: TodoFilterState) {
  return groups
    .map((group) => {
      const parentMatches = matchesTodoFilters(group.parent, filters);
      const children = group.children.filter((child) => matchesTodoFilters(child.todo, filters));
      if (!parentMatches && children.length === 0) return null;
      return { ...group, children: parentMatches ? group.children : children };
    })
    .filter((group): group is CompletedTodoGroup => Boolean(group));
}

export function completedTime(todo: Todo) {
  return todo.completedAt ? new Date(todo.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
}

export function achievementTime(todo: Todo, kind: TodoAchievementKind | null) {
  if (kind === 'completed') return completedTime(todo);
  if (kind === 'checkIn') return '当日打卡';
  return '-';
}
