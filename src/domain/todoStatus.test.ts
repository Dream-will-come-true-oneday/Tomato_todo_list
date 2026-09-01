import { describe, expect, it } from 'vitest';
import type { Todo } from './types';
import { getTodoTimeBadge, isCompletedLate, isOverdue } from './todoStatus';

const baseTodo: Todo = {
  id: 'todo-1',
  title: 'Test',
  notes: '',
  status: 'active',
  priority: 'medium',
  parentId: null,
  term: 'short',
  urgencyTags: [],
  typeTagIds: [],
  startAt: null,
  dueAt: null,
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
  completedAt: null,
  pomodoroCount: 0,
  checkInDates: []
};

describe('getTodoTimeBadge', () => {
  it('marks date-only todos overdue only after the due date has ended', () => {
    const badge = getTodoTimeBadge(
      { ...baseTodo, dueAt: '2026-07-15' },
      new Date('2026-07-16T09:00:00.000Z')
    );

    expect(badge).toEqual({ tone: 'danger', label: '已逾期' });
  });

  it('does not mark a date-only todo overdue on its due date', () => {
    const badge = getTodoTimeBadge(
      { ...baseTodo, dueAt: '2026-07-16' },
      new Date(2026, 6, 16, 23, 30)
    );

    expect(badge).toEqual({ tone: 'warning', label: '即将截止' });
  });

  it('marks todos due soon within 24 hours', () => {
    const badge = getTodoTimeBadge(
      { ...baseTodo, dueAt: '2026-07-16T20:00:00.000Z' },
      new Date('2026-07-16T09:00:00.000Z')
    );

    expect(badge).toEqual({ tone: 'warning', label: '即将截止' });
  });

  it('marks todos starting today', () => {
    const badge = getTodoTimeBadge(
      { ...baseTodo, startAt: '2026-07-16' },
      new Date('2026-07-16T09:00:00.000Z')
    );

    expect(badge).toEqual({ tone: 'info', label: '今天开始' });
  });

  it('recognizes late completion for date-only and timed deadlines', () => {
    expect(
      isCompletedLate({
        ...baseTodo,
        status: 'completed',
        dueAt: '2026-07-16',
        completedAt: '2026-07-17T00:00:00.000Z'
      })
    ).toBe(true);
    expect(
      isCompletedLate({
        ...baseTodo,
        status: 'completed',
        dueAt: '2026-07-16T20:00:00.000Z',
        completedAt: '2026-07-16T19:59:59.000Z'
      })
    ).toBe(false);
  });
});

describe('isOverdue', () => {
  it('marks an incomplete todo overdue after its date-only due date has ended', () => {
    expect(
      isOverdue({ ...baseTodo, dueAt: '2026-07-15' }, new Date('2026-07-16T09:00:00.000Z'))
    ).toBe(true);
  });

  it('does not mark an incomplete todo overdue on its due date', () => {
    expect(
      isOverdue({ ...baseTodo, dueAt: '2026-07-16' }, new Date(2026, 6, 16, 23, 30))
    ).toBe(false);
  });

  it('ignores completed, archived and due-less todos', () => {
    expect(
      isOverdue(
        { ...baseTodo, status: 'completed', dueAt: '2026-07-15' },
        new Date('2026-07-16T09:00:00.000Z')
      )
    ).toBe(false);
    expect(
      isOverdue(
        { ...baseTodo, status: 'archived', dueAt: '2026-07-15' },
        new Date('2026-07-16T09:00:00.000Z')
      )
    ).toBe(false);
    expect(isOverdue(baseTodo, new Date('2026-07-16T09:00:00.000Z'))).toBe(false);
  });
});
