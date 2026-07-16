import type { Todo } from './types';

export type TodoTimeBadge = {
  tone: 'info' | 'warning' | 'danger' | 'neutral';
  label: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function parseLocalDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function parseDueDate(value: string) {
  if (!DATE_ONLY_PATTERN.test(value)) return new Date(value);

  const due = parseLocalDateOnly(value);
  due.setHours(23, 59, 59, 999);
  return due;
}

function parseStartDate(value: string) {
  return DATE_ONLY_PATTERN.test(value) ? parseLocalDateOnly(value) : new Date(value);
}

export function getTodoTimeBadge(todo: Todo, now = new Date()): TodoTimeBadge | null {
  if (todo.status === 'completed') {
    return { tone: 'neutral', label: '已完成' };
  }

  if (todo.dueAt) {
    const due = parseDueDate(todo.dueAt);
    const msUntilDue = due.getTime() - now.getTime();
    if (msUntilDue < 0) return { tone: 'danger', label: '已逾期' };
    if (msUntilDue <= DAY_MS) return { tone: 'warning', label: '即将截止' };
  }

  if (todo.startAt && isSameLocalDay(parseStartDate(todo.startAt), now)) {
    return { tone: 'info', label: '今天开始' };
  }

  return null;
}
