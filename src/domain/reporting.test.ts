import { describe, expect, it } from 'vitest';
import { createDefaultTodo } from './defaultData';
import {
  buildWeeklyTodoTree,
  getAchievementTypeTagShares,
  getTodoAchievements,
  getWeekDateKeys,
  getWeekSummary
} from './reporting';

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

  it('derives check-ins and completions as achievements with same-day completion taking precedence', () => {
    const todo = {
      ...createDefaultTodo('长期成果', { term: 'long', status: 'completed' }),
      completedAt: '2026-07-22T09:00:00.000Z',
      checkInDates: ['2026-07-21', '2026-07-22', '2026-07-21']
    };

    expect(getTodoAchievements([todo])).toEqual([
      { todoId: todo.id, date: '2026-07-22', kind: 'completed' },
      { todoId: todo.id, date: '2026-07-21', kind: 'checkIn' }
    ]);
  });

  it('counts every tagged achievement in type shares without an unclassified group', () => {
    const tags = [
      { id: 'study', name: '学习', color: '#315f4d' },
      { id: 'work', name: '事务', color: '#9b2f25' }
    ];
    const todos = [
      {
        ...createDefaultTodo('多标签成果', { status: 'completed', typeTagIds: ['study', 'work'] }),
        completedAt: '2026-07-22T09:00:00.000Z',
        checkInDates: ['2026-07-21']
      },
      { ...createDefaultTodo('无标签完成', { status: 'completed' }), completedAt: '2026-07-20T10:00:00.000Z' }
    ];

    const shares = getAchievementTypeTagShares(todos, tags);
    expect(shares).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'study', count: 2 }),
        expect.objectContaining({ id: 'work', count: 2 })
      ])
    );
    expect(shares.some((share) => share.name === '未分类')).toBe(false);
  });

  it('summarizes completion and check-in achievements inside the selected week', () => {
    const completed = {
      ...createDefaultTodo('本周完成', { status: 'completed' }),
      completedAt: '2026-07-22T09:00:00.000Z'
    };
    const checked = {
      ...createDefaultTodo('本周打卡', { term: 'long', status: 'active' }),
      checkInDates: ['2026-07-21', '2026-07-27']
    };
    const records = [
      { id: 'in-week', todoId: completed.id, presetId: 'preset', startedAt: '2026-07-22T09:00:00.000Z', endedAt: '2026-07-22T09:25:00.000Z', plannedFocusMinutes: 25, actualElapsedSeconds: 1500, completionType: 'completed' as const },
      { id: 'skipped', todoId: completed.id, presetId: 'preset', startedAt: '2026-07-22T09:00:00.000Z', endedAt: '2026-07-22T09:05:00.000Z', plannedFocusMinutes: 25, actualElapsedSeconds: 300, completionType: 'skipped' as const }
    ];

    const summary = getWeekSummary([completed, checked], [], records, '2026-07-20');
    expect(summary.achievementCount).toBe(2);
    expect(summary.achievementTodos).toHaveLength(2);
    expect(summary.completedPomodoroCount).toBe(1);
    expect(summary.focusMinutes).toBe(25);
    expect(summary.dailyAchievements[1].achievementCount).toBe(1);
    expect(summary.dailyAchievements[2].achievementCount).toBe(1);
  });

  it('keeps the full parent chain and aggregates weekly check-ins by task', () => {
    const root = createDefaultTodo('根任务', { status: 'active' });
    const parent = createDefaultTodo('父任务', { parentId: root.id, status: 'notStarted' });
    const child = {
      ...createDefaultTodo('成果子任务', { parentId: parent.id, term: 'long', status: 'active' }),
      checkInDates: ['2026-07-21', '2026-07-22']
    };

    const tree = buildWeeklyTodoTree([root, parent, child], getTodoAchievements([root, parent, child]));
    expect(tree[0].todo.id).toBe(root.id);
    expect(tree[0].children[0].todo.id).toBe(parent.id);
    expect(tree[0].children[0].children[0].todo.id).toBe(child.id);
    expect(tree[0].children[0].children[0].completedThisWeek).toBe(false);
    expect(tree[0].children[0].children[0].checkInCountThisWeek).toBe(2);
  });
});
