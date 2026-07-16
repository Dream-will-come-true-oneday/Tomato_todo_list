import { describe, expect, it } from 'vitest';
import type { Todo } from './types';
import { getTodoTimeBadge } from './todoStatus';

const baseTodo: Todo = {
  id: 'todo-1',
  title: 'Test',
  notes: '',
  status: 'active',
  priority: 'medium',
  startAt: null,
  dueAt: null,
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
  completedAt: null,
  pomodoroCount: 0
};

describe('getTodoTimeBadge', () => {
  it('marks overdue active todos', () => {
    const badge = getTodoTimeBadge(
      { ...baseTodo, dueAt: '2026-07-15T10:00:00.000Z' },
      new Date('2026-07-16T09:00:00.000Z')
    );

    expect(badge).toEqual({ tone: 'danger', label: '已逾期' });
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
      { ...baseTodo, startAt: '2026-07-16T14:00:00.000Z' },
      new Date('2026-07-16T09:00:00.000Z')
    );

    expect(badge).toEqual({ tone: 'info', label: '今天开始' });
  });
});
