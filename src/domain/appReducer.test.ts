import { describe, expect, it } from 'vitest';
import { createDefaultAppData } from './defaultData';
import { appReducer } from './appReducer';

describe('appReducer', () => {
  it('increments a todo Pomodoro count when a linked focus session completes', () => {
    const data = createDefaultAppData();
    const todoId = data.todos[0].id;

    const next = appReducer(data, {
      type: 'completeFocusSession',
      todoId,
      startedAt: new Date('2026-07-16T08:00:00.000Z'),
      endedAt: new Date('2026-07-16T08:25:00.000Z'),
      actualElapsedSeconds: 1500,
      completionType: 'completed'
    });

    expect(next.todos[0].pomodoroCount).toBe(1);
    expect(next.pomodoroRecords[0].todoId).toBe(todoId);
  });

  it('records a temporary Pomodoro without incrementing any todo', () => {
    const data = createDefaultAppData();

    const next = appReducer(data, {
      type: 'completeFocusSession',
      todoId: null,
      startedAt: new Date('2026-07-16T08:00:00.000Z'),
      endedAt: new Date('2026-07-16T08:25:00.000Z'),
      actualElapsedSeconds: 1500,
      completionType: 'completed'
    });

    expect(next.todos[0].pomodoroCount).toBe(0);
    expect(next.pomodoroRecords[0].todoId).toBeNull();
  });

  it('stamps completedAt when a todo becomes completed', () => {
    const data = createDefaultAppData();
    const todo = data.todos[0];

    const next = appReducer(data, {
      type: 'updateTodo',
      todo: { ...todo, status: 'completed' }
    });

    expect(next.todos[0].completedAt).toEqual(expect.any(String));
  });

  it('deletes a type tag and removes it from todos that used it', () => {
    const data = createDefaultAppData();
    const tagId = data.typeTags[0].id;
    const todo = { ...data.todos[0], typeTagIds: [tagId] };

    const next = appReducer({ ...data, todos: [todo] }, { type: 'deleteTypeTag', tagId });

    expect(next.typeTags.some((tag) => tag.id === tagId)).toBe(false);
    expect(next.todos[0].typeTagIds).toEqual([]);
  });

  it('deletes nested descendant todos when deleting a parent todo', () => {
    const data = createDefaultAppData();
    const parent = { ...data.todos[0], id: 'todo-parent', parentId: null };
    const child = { ...data.todos[0], id: 'todo-child', parentId: parent.id };
    const grandchild = { ...data.todos[0], id: 'todo-grandchild', parentId: child.id };
    const sibling = { ...data.todos[0], id: 'todo-sibling', parentId: null };

    const next = appReducer({ ...data, todos: [parent, child, grandchild, sibling] }, { type: 'deleteTodo', todoId: parent.id });

    expect(next.todos.map((todo) => todo.id)).toEqual(['todo-sibling']);
  });

  it('adds and removes todos from a daily Pomodoro plan', () => {
    const data = createDefaultAppData();
    const date = '2026-07-22';
    const todoId = data.todos[0].id;

    const added = appReducer(data, { type: 'addTodayPlanTodo', date, todoId });
    expect(added.todayPlans[date]).toEqual({
      addedTodoIds: [todoId],
      excludedTodoIds: []
    });

    const removedManual = appReducer(added, { type: 'removeTodayPlanTodo', date, todoId, isDefaultTodo: false });
    expect(removedManual.todayPlans[date]).toEqual({
      addedTodoIds: [],
      excludedTodoIds: []
    });

    const removedDefault = appReducer(added, { type: 'removeTodayPlanTodo', date, todoId, isDefaultTodo: true });
    expect(removedDefault.todayPlans[date]).toEqual({
      addedTodoIds: [],
      excludedTodoIds: [todoId]
    });
  });

  it('adds and replaces weekly reflections by their week start date', () => {
    const data = createDefaultAppData();
    const first = appReducer(data, {
      type: 'upsertWeeklyReflection',
      reflection: { weekStart: '2026-07-20', content: '第一版', updatedAt: '2026-07-26T09:00:00.000Z' }
    });
    const second = appReducer(first, {
      type: 'upsertWeeklyReflection',
      reflection: { weekStart: '2026-07-20', content: '更新版', updatedAt: '2026-07-26T10:00:00.000Z' }
    });

    expect(second.weeklyReflections).toEqual([
      { weekStart: '2026-07-20', content: '更新版', updatedAt: '2026-07-26T10:00:00.000Z' }
    ]);
  });
});
