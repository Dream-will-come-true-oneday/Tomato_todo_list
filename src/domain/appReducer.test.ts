import { describe, expect, it } from 'vitest';
import { createBacklogItem, createDefaultAppData, createInspirationTag } from './defaultData';
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
    const todo = { ...data.todos[0], typeTagIds: [data.typeTags[0].id] };

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

  it('toggles one daily check-in for an incomplete long-term todo', () => {
    const data = createDefaultAppData();
    const todo = {
      ...data.todos[0],
      term: 'long' as const,
      status: 'active' as const,
      typeTagIds: [data.typeTags[0].id]
    };
    const input = { ...data, todos: [todo] };

    const firstDay = appReducer(input, { type: 'toggleTodoCheckIn', todoId: todo.id, date: '2026-07-27' });
    const secondDay = appReducer(firstDay, { type: 'toggleTodoCheckIn', todoId: todo.id, date: '2026-07-28' });
    const undone = appReducer(secondDay, { type: 'toggleTodoCheckIn', todoId: todo.id, date: '2026-07-27' });

    expect(firstDay.todos[0].checkInDates).toEqual(['2026-07-27']);
    expect(secondDay.todos[0].checkInDates).toEqual(['2026-07-27', '2026-07-28']);
    expect(undone.todos[0].checkInDates).toEqual(['2026-07-28']);
  });

  it('refuses to check in a long-term todo without a valid type tag', () => {
    const data = createDefaultAppData();
    const todo = { ...data.todos[0], term: 'long' as const, status: 'active' as const, typeTagIds: [] as string[] };
    const input = { ...data, todos: [todo] };

    expect(appReducer(input, { type: 'toggleTodoCheckIn', todoId: todo.id, date: '2026-07-27' })).toBe(input);
  });

  it('rejects check-ins for short, completed, archived and invalid todos', () => {
    const data = createDefaultAppData();
    const shortTodo = data.todos[0];
    const completedTodo = { ...shortTodo, id: 'long-completed', term: 'long' as const, status: 'completed' as const };
    const archivedTodo = { ...shortTodo, id: 'long-archived', term: 'long' as const, status: 'archived' as const };
    const input = { ...data, todos: [shortTodo, completedTodo, archivedTodo] };

    expect(appReducer(input, { type: 'toggleTodoCheckIn', todoId: shortTodo.id, date: '2026-07-27' })).toBe(input);
    expect(appReducer(input, { type: 'toggleTodoCheckIn', todoId: completedTodo.id, date: '2026-07-27' })).toBe(input);
    expect(appReducer(input, { type: 'toggleTodoCheckIn', todoId: archivedTodo.id, date: '2026-07-27' })).toBe(input);
    expect(appReducer(input, { type: 'toggleTodoCheckIn', todoId: completedTodo.id, date: 'bad-date' })).toBe(input);
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

  it('refuses to complete a todo without a valid type tag', () => {
    const data = createDefaultAppData();
    const todo = { ...data.todos[0], status: 'active' as const, typeTagIds: [] as string[] };
    const input = { ...data, todos: [todo] };
    const next = appReducer(input, { type: 'updateTodo', todo: { ...todo, status: 'completed' } });

    expect(next).toBe(input);
  });

  it('refuses to delete the last valid type tag from a completed todo', () => {
    const data = createDefaultAppData();
    const tagId = data.typeTags[0].id;
    const todo = { ...data.todos[0], status: 'completed' as const, completedAt: '2026-07-26T08:00:00.000Z', typeTagIds: [tagId] };
    const input = { ...data, todos: [todo] };
    const next = appReducer(input, { type: 'deleteTypeTag', tagId });

    expect(next).toBe(input);
  });

  it('refuses to delete the last valid type tag from a checked-in todo', () => {
    const data = createDefaultAppData();
    const tagId = data.typeTags[0].id;
    const todo = { ...data.todos[0], term: 'long' as const, typeTagIds: [tagId], checkInDates: ['2026-07-26'] };
    const input = { ...data, todos: [todo] };

    expect(appReducer(input, { type: 'deleteTypeTag', tagId })).toBe(input);
  });

  it('refuses to add a completed todo without a valid type tag', () => {
    const data = createDefaultAppData();
    const todo = { ...data.todos[0], id: 'completed-without-type', status: 'completed' as const };

    expect(appReducer(data, { type: 'addTodo', todo })).toBe(data);
  });

  it('requires an inspiration tag before completion and protects referenced inspiration tags', () => {
    const data = createDefaultAppData();
    const tag = createInspirationTag('研究');
    const untagged = createBacklogItem('未分类灵感');
    const input = { ...data, inspirationTags: [tag], backlogItems: [untagged] };

    expect(appReducer(input, { type: 'updateBacklogItem', item: { ...untagged, status: 'completed' } })).toBe(input);

    const tagged = { ...untagged, tagId: tag.id };
    const withTag = { ...input, backlogItems: [tagged] };
    const completed = appReducer(withTag, { type: 'updateBacklogItem', item: { ...tagged, status: 'completed' } });
    expect(completed.backlogItems[0].status).toBe('completed');
    expect(appReducer(completed, { type: 'deleteInspirationTag', tagId: tag.id })).toBe(completed);
  });
});

  it('updates the daily schedule settings as one persisted configuration', () => {
    const data = createDefaultAppData();
    const schedule = { ...data.dailySchedule, enabled: false, soundEnabled: false };

    const next = appReducer(data, { type: 'updateDailySchedule', schedule });

    expect(next.dailySchedule).toBe(schedule);
    expect(next.todos).toBe(data.todos);
  });

  it('replaces the complete data set after a validated import', () => {
    const data = createDefaultAppData();
    const imported = { ...createDefaultAppData(), todos: [], backlogItems: [] };

    const next = appReducer(data, { type: 'replaceData', data: imported });

    expect(next).toBe(imported);
  });
