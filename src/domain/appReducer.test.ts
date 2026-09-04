import { describe, expect, it } from 'vitest';
import {
  createBacklogItem,
  createDefaultAppData,
  createDefaultTodo,
  createInspirationTag,
  createTypeTag
} from './defaultData';
import { appReducer } from './appReducer';
import { initUndoableState, undoableAppReducer, UNDO_STACK_LIMIT } from './undo';
import type { AppData } from './types';

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
});

function initUndoState(overrides: Partial<AppData> = {}) {
  return initUndoableState({ ...createDefaultAppData(), ...overrides });
}

describe('undoableAppReducer', () => {
  it('does not track non-destructive actions on the undo stack', () => {
    let state = initUndoState();

    state = undoableAppReducer(state, { type: 'data', action: { type: 'addTodo', todo: createDefaultTodo('新增待办') } });
    expect(state.undoStack).toHaveLength(0);

    const renamed = { ...state.data.todos[0], title: '改名后的待办' };
    state = undoableAppReducer(state, { type: 'data', action: { type: 'updateTodo', todo: renamed } });
    expect(state.undoStack).toHaveLength(0);

    state = undoableAppReducer(state, {
      type: 'data',
      action: { type: 'addTodayPlanTodo', date: '2026-09-01', todoId: state.data.todos[0].id }
    });
    expect(state.undoStack).toHaveLength(0);
  });

  it('restores a deleted todo through undo', () => {
    const state0 = initUndoState();
    const todoId = state0.data.todos[0].id;

    const next = undoableAppReducer(state0, { type: 'data', action: { type: 'deleteTodo', todoId } });
    expect(next.data.todos).toHaveLength(0);
    expect(next.undoStack).toHaveLength(1);
    expect(next.undoStack[0].label).toContain('已删除待办');

    const undone = undoableAppReducer(next, { type: 'undo' });
    expect(undone.data).toBe(state0.data);
    expect(undone.undoStack).toHaveLength(0);
  });

  it('restores descendant todos deleted together with their parent', () => {
    const data = createDefaultAppData();
    const parent = { ...data.todos[0], id: 'todo-parent', parentId: null };
    const child = { ...data.todos[0], id: 'todo-child', parentId: parent.id };
    const grandchild = { ...data.todos[0], id: 'todo-grandchild', parentId: child.id };
    const sibling = { ...data.todos[0], id: 'todo-sibling', parentId: null };
    const state0 = initUndoState({ todos: [parent, child, grandchild, sibling] });

    const next = undoableAppReducer(state0, { type: 'data', action: { type: 'deleteTodo', todoId: parent.id } });
    expect(next.data.todos.map((todo) => todo.id)).toEqual(['todo-sibling']);
    expect(next.undoStack[0].label).toContain('3 条待办');

    const undone = undoableAppReducer(next, { type: 'undo' });
    expect(undone.data).toBe(state0.data);
    expect(undone.data.todos.map((todo) => todo.id)).toEqual(['todo-parent', 'todo-child', 'todo-grandchild', 'todo-sibling']);
  });

  it('skips the undo stack when a constrained deletion is rejected', () => {
    const data = createDefaultAppData();
    const protectedTagId = data.typeTags[0].id;
    const protectedTodo = {
      ...data.todos[0],
      status: 'completed' as const,
      completedAt: '2026-09-01T08:00:00.000Z',
      typeTagIds: [protectedTagId]
    };
    const deletableTag = createTypeTag('可删除标签');
    const state0 = initUndoState({ todos: [protectedTodo], typeTags: [...data.typeTags, deletableTag] });

    const blocked = undoableAppReducer(state0, { type: 'data', action: { type: 'deleteTypeTag', tagId: protectedTagId } });
    expect(blocked.data).toBe(state0.data);
    expect(blocked.undoStack).toHaveLength(0);

    const allowed = undoableAppReducer(blocked, {
      type: 'data',
      action: { type: 'deleteTypeTag', tagId: deletableTag.id }
    });
    expect(allowed.undoStack).toHaveLength(1);

    const undone = undoableAppReducer(allowed, { type: 'undo' });
    expect(undone.data).toBe(blocked.data);
    expect(undone.data.typeTags.some((tag) => tag.id === deletableTag.id)).toBe(true);
  });

  it('tracks completing a todo and restores the previous status through undo', () => {
    const data = createDefaultAppData();
    const todo = { ...data.todos[0], status: 'active' as const, typeTagIds: [data.typeTags[0].id] };
    const state0 = initUndoState({ todos: [todo] });

    const next = undoableAppReducer(state0, {
      type: 'data',
      action: { type: 'updateTodo', todo: { ...todo, status: 'completed' } }
    });
    expect(next.data.todos[0].status).toBe('completed');
    expect(next.undoStack).toHaveLength(1);

    const undone = undoableAppReducer(next, { type: 'undo' });
    expect(undone.data).toBe(state0.data);
    expect(undone.data.todos[0].status).toBe('active');
    expect(undone.data.todos[0].completedAt).toBeNull();
  });

  it('tracks clearing the daily schedule and restores items through undo', () => {
    const state0 = initUndoState();
    const cleared = { ...state0.data.dailySchedule, items: [] };

    const next = undoableAppReducer(state0, {
      type: 'data',
      action: { type: 'updateDailySchedule', schedule: cleared }
    });
    expect(next.data.dailySchedule.items).toHaveLength(0);
    expect(next.undoStack).toHaveLength(1);
    expect(next.undoStack[0].label).toBe('已清空全部每日安排');

    const undone = undoableAppReducer(next, { type: 'undo' });
    expect(undone.data).toBe(state0.data);
    expect(undone.data.dailySchedule.items).toBe(state0.data.dailySchedule.items);
  });

  it('prefers the explicit undo label provided by the caller', () => {
    const state0 = initUndoState();
    const restored = { ...state0.data.dailySchedule, items: [] };

    const next = undoableAppReducer(state0, {
      type: 'data',
      action: { type: 'updateDailySchedule', schedule: restored },
      undoLabel: '已恢复默认每日安排'
    });

    expect(next.undoStack[0].label).toBe('已恢复默认每日安排');
  });

  it('caps the undo stack and drops the oldest entries beyond the limit', () => {
    const items = Array.from({ length: 25 }, (_, index) => createBacklogItem(`灵感 ${index + 1}`));
    let state = initUndoState({ backlogItems: items });

    for (const item of items.slice(0, 21)) {
      state = undoableAppReducer(state, { type: 'data', action: { type: 'deleteBacklogItem', itemId: item.id } });
    }
    expect(state.undoStack).toHaveLength(UNDO_STACK_LIMIT);
    expect(state.data.backlogItems).toHaveLength(4);

    for (let index = 0; index < UNDO_STACK_LIMIT; index += 1) {
      state = undoableAppReducer(state, { type: 'undo' });
    }
    expect(state.undoStack).toHaveLength(0);
    // 最早的撤销记录（第 1 次删除前的快照）已被丢弃，只能回到第 1 次删除后的状态
    expect(state.data.backlogItems).toHaveLength(24);
    expect(state.data.backlogItems.some((item) => item.id === items[0].id)).toBe(false);
    expect(state.data.backlogItems.some((item) => item.id === items[1].id)).toBe(true);

    expect(undoableAppReducer(state, { type: 'undo' })).toBe(state);
  });

  it('clears the undo stack when data is replaced by an import', () => {
    const tag = createInspirationTag('待删标签');
    let state = initUndoState({ inspirationTags: [tag] });

    state = undoableAppReducer(state, { type: 'data', action: { type: 'deleteInspirationTag', tagId: tag.id } });
    expect(state.undoStack).toHaveLength(1);

    const imported = { ...createDefaultAppData(), todos: [] };
    const replaced = undoableAppReducer(state, { type: 'data', action: { type: 'replaceData', data: imported } });

    expect(replaced.data).toBe(imported);
    expect(replaced.undoStack).toHaveLength(0);
  });

  it('restores an archived todo through undo', () => {
    const data = createDefaultAppData();
    const todo = { ...data.todos[0], status: 'active' as const, typeTagIds: [data.typeTags[0].id] };
    const state0 = initUndoState({ todos: [todo] });

    const next = undoableAppReducer(state0, {
      type: 'data',
      action: { type: 'updateTodo', todo: { ...todo, status: 'archived' } }
    });
    expect(next.data.todos[0].status).toBe('archived');
    expect(next.undoStack).toHaveLength(1);
    expect(next.undoStack[0].label).toContain('已归档待办');

    const undone = undoableAppReducer(next, { type: 'undo' });
    expect(undone.data).toBe(state0.data);
    expect(undone.data.todos[0].status).toBe('active');
  });

  it('restores a deleted pomodoro preset through undo', () => {
    const state0 = initUndoState();
    const presetId = state0.data.presets[0].id;

    const next = undoableAppReducer(state0, { type: 'data', action: { type: 'deletePreset', presetId } });
    expect(next.data.presets.some((preset) => preset.id === presetId)).toBe(false);
    expect(next.undoStack).toHaveLength(1);
    expect(next.undoStack[0].label).toContain('已删除番茄类型');

    const undone = undoableAppReducer(next, { type: 'undo' });
    expect(undone.data).toBe(state0.data);
    expect(undone.data.presets.some((preset) => preset.id === presetId)).toBe(true);
  });

  it('assigns each undo entry a unique monotonically increasing seq', () => {
    const items = Array.from({ length: 3 }, (_, index) => createBacklogItem(`灵感 ${index + 1}`));
    let state = initUndoState({ backlogItems: items });

    for (const item of items) {
      state = undoableAppReducer(state, { type: 'data', action: { type: 'deleteBacklogItem', itemId: item.id } });
    }

    const seqs = state.undoStack.map((entry) => entry.seq);
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(seqs[0]).toBeGreaterThan(seqs[seqs.length - 1]);
  });

  it('redo restores the after snapshot and re-undo returns to the same state', () => {
    const state0 = initUndoState();
    const todoId = state0.data.todos[0].id;

    const deleted = undoableAppReducer(state0, { type: 'data', action: { type: 'deleteTodo', todoId } });
    const undone = undoableAppReducer(deleted, { type: 'undo' });
    expect(undone.data).toBe(state0.data);
    expect(undone.undoStack).toHaveLength(0);
    expect(undone.redoStack).toHaveLength(1);

    const redone = undoableAppReducer(undone, { type: 'redo' });
    expect(redone.data).toBe(deleted.data);
    expect(redone.undoStack[0]).toBe(undone.redoStack[0]);
    expect(redone.redoStack).toHaveLength(0);

    const undoneAgain = undoableAppReducer(redone, { type: 'undo' });
    expect(undoneAgain.data).toBe(state0.data);
    expect(undoneAgain.redoStack[0]).toBe(redone.undoStack[0]);
  });

  it('clears the redo stack when a new action diverges history', () => {
    const state0 = initUndoState();
    const todoId = state0.data.todos[0].id;

    const deleted = undoableAppReducer(state0, { type: 'data', action: { type: 'deleteTodo', todoId } });
    const undone = undoableAppReducer(deleted, { type: 'undo' });
    expect(undone.redoStack).toHaveLength(1);

    // 破坏性新操作：再次删除第一条待办，历史分叉
    const diverged = undoableAppReducer(undone, {
      type: 'data',
      action: { type: 'deleteTodo', todoId: undone.data.todos[0].id }
    });
    expect(diverged.redoStack).toHaveLength(0);
    expect(diverged.undoStack).toHaveLength(1);

    // 非破坏性新操作（重命名）同样使历史分叉，重做栈必须清空且 redo 不再生效
    const undoneAgain = undoableAppReducer(diverged, { type: 'undo' });
    expect(undoneAgain.redoStack).toHaveLength(1);
    const renamed = { ...undoneAgain.data.todos[0], title: '改名后的待办' };
    const renamedState = undoableAppReducer(undoneAgain, { type: 'data', action: { type: 'updateTodo', todo: renamed } });
    expect(renamedState.redoStack).toHaveLength(0);
    expect(renamedState.undoStack).toHaveLength(0);
    expect(undoableAppReducer(renamedState, { type: 'redo' })).toBe(renamedState);
  });

  it('clears both undo and redo stacks when data is replaced by an import', () => {
    const state0 = initUndoState();
    const todoId = state0.data.todos[0].id;

    const deleted = undoableAppReducer(state0, { type: 'data', action: { type: 'deleteTodo', todoId } });
    const undone = undoableAppReducer(deleted, { type: 'undo' });
    expect(undone.redoStack).toHaveLength(1);

    const imported = { ...createDefaultAppData(), todos: [] };
    const replaced = undoableAppReducer(undone, { type: 'data', action: { type: 'replaceData', data: imported } });

    expect(replaced.data).toBe(imported);
    expect(replaced.undoStack).toHaveLength(0);
    expect(replaced.redoStack).toHaveLength(0);
  });

  it('renumbers manual order within a sibling group and leaves other todos untouched', () => {
    const data = createDefaultAppData();
    const first = { ...data.todos[0], id: 'todo-a' };
    const second = { ...data.todos[0], id: 'todo-b' };
    const third = { ...data.todos[0], id: 'todo-c' };

    const next = appReducer({ ...data, todos: [first, second, third] }, {
      type: 'reorderTodos',
      parentId: null,
      orderedIds: ['todo-c', 'todo-a', 'todo-b']
    });

    expect(next.todos.find((todo) => todo.id === 'todo-c')?.order).toBe(0);
    expect(next.todos.find((todo) => todo.id === 'todo-a')?.order).toBe(1);
    expect(next.todos.find((todo) => todo.id === 'todo-b')?.order).toBe(2);
  });

  it('keeps todos unchanged when reordering with an empty id list', () => {
    const data = createDefaultAppData();

    expect(appReducer(data, { type: 'reorderTodos', parentId: null, orderedIds: [] })).toBe(data);
  });

  it('switches todo sort mode and ignores no-op switches', () => {
    const data = createDefaultAppData();

    const manual = appReducer(data, { type: 'setTodoSortMode', mode: 'manual' });
    expect(manual.todoSortMode).toBe('manual');

    expect(appReducer(manual, { type: 'setTodoSortMode', mode: 'manual' })).toBe(manual);

    const schedule = appReducer(manual, { type: 'setTodoSortMode', mode: 'schedule' });
    expect(schedule.todoSortMode).toBe('schedule');
  });

  it('does not push sort mode switches into the undo stack', () => {
    const state0 = initUndoState();

    const switched = undoableAppReducer(state0, { type: 'data', action: { type: 'setTodoSortMode', mode: 'manual' } });

    expect(switched.data.todoSortMode).toBe('manual');
    expect(switched.undoStack).toHaveLength(0);
    expect(switched.redoStack).toHaveLength(0);
  });
});
