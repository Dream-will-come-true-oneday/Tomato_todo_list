import { describe, expect, it } from 'vitest';
import { createDefaultTodo } from './defaultData';
import { buildWeeklyTodoTree, getCompletedTypeTagShares, getWeekDateKeys, getWeekSummary } from './reporting';

describe('reporting', () => {
  it('uses Monday through Sunday for a natural week', () => {
    expect(getWeekDateKeys('2026-07-22')).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26'
    ]);
  });

  it('counts only known tags from completed tasks', () => {
    const tags = [
      { id: 'study', name: '学习', color: '#315f4d' },
      { id: 'work', name: '事务', color: '#9b2f25' }
    ];
    const todos = [
      { ...createDefaultTodo('多标签', { status: 'completed', typeTagIds: ['study', 'work'] }), completedAt: '2026-07-20T09:00:00.000Z' },
      { ...createDefaultTodo('无标签', { status: 'completed' }), completedAt: '2026-07-20T10:00:00.000Z' },
      { ...createDefaultTodo('未完成', { typeTagIds: ['study'] }), completedAt: null }
    ];

    expect(getCompletedTypeTagShares(todos, tags)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'study', count: 1 }),
        expect.objectContaining({ id: 'work', count: 1 })
      ])
    );
    expect(getCompletedTypeTagShares(todos, tags).some((share) => share.name === '未分类')).toBe(false);
  });

  it('summarizes only completed tasks and Pomodoros inside the selected week', () => {
    const todos = [
      { ...createDefaultTodo('本周', { status: 'completed' }), completedAt: '2026-07-22T09:00:00.000Z' },
      { ...createDefaultTodo('上周', { status: 'completed' }), completedAt: '2026-07-19T09:00:00.000Z' }
    ];
    const records = [
      { id: 'in-week', todoId: todos[0].id, presetId: 'preset', startedAt: '2026-07-22T09:00:00.000Z', endedAt: '2026-07-22T09:25:00.000Z', plannedFocusMinutes: 25, actualElapsedSeconds: 1500, completionType: 'completed' as const },
      { id: 'skipped', todoId: todos[0].id, presetId: 'preset', startedAt: '2026-07-22T09:00:00.000Z', endedAt: '2026-07-22T09:05:00.000Z', plannedFocusMinutes: 25, actualElapsedSeconds: 300, completionType: 'skipped' as const }
    ];

    const summary = getWeekSummary(todos, [], records, '2026-07-20');
    expect(summary.completedTodoCount).toBe(1);
    expect(summary.completedPomodoroCount).toBe(1);
    expect(summary.focusMinutes).toBe(25);
    expect(summary.dailyCompletion[2].completedCount).toBe(1);
  });

  it('keeps the full parent chain for completed weekly tasks', () => {
    const root = createDefaultTodo('根任务', { status: 'active' });
    const parent = createDefaultTodo('父任务', { parentId: root.id, status: 'notStarted' });
    const child = {
      ...createDefaultTodo('完成子任务', { parentId: parent.id, status: 'completed' }),
      completedAt: '2026-07-22T09:00:00.000Z'
    };

    const tree = buildWeeklyTodoTree([root, parent, child], [child]);
    expect(tree[0].todo.id).toBe(root.id);
    expect(tree[0].children[0].todo.id).toBe(parent.id);
    expect(tree[0].children[0].children[0].todo.id).toBe(child.id);
    expect(tree[0].children[0].children[0].completedThisWeek).toBe(true);
  });
});
