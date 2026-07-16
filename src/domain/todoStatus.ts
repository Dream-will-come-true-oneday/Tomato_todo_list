import type { Todo } from './types';

export type TodoTimeBadge = {
  tone: 'info' | 'warning' | 'danger' | 'neutral';
  label: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getTodoTimeBadge(todo: Todo, now = new Date()): TodoTimeBadge | null {
  if (todo.status === 'completed') {
    return { tone: 'neutral', label: '已完成' };
  }

  if (todo.dueAt) {
    const due = new Date(todo.dueAt);
    const msUntilDue = due.getTime() - now.getTime();
    if (msUntilDue < 0) return { tone: 'danger', label: '已逾期' };
    if (msUntilDue <= DAY_MS) return { tone: 'warning', label: '即将截止' };
  }

  if (todo.startAt && isSameLocalDay(new Date(todo.startAt), now)) {
    return { tone: 'info', label: '今天开始' };
  }

  return null;
}
