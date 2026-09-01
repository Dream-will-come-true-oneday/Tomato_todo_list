import type { Todo } from '../domain/types';

export function currentIso() {
  return new Date().toISOString();
}

export function asInputDate(value: string | null) {
  return value?.slice(0, 10) ?? '';
}

export function nullableDate(value: string) {
  return value || null;
}

export function compareNullableDate(a: string | null, b: string | null) {
  const aValue = a ?? '9999-12-31';
  const bValue = b ?? '9999-12-31';
  return aValue.localeCompare(bValue);
}

export function compareTodosBySchedule(a: Todo, b: Todo) {
  const dueCompare = compareNullableDate(a.dueAt, b.dueAt);
  if (dueCompare !== 0) return dueCompare;

  const startCompare = compareNullableDate(a.startAt, b.startAt);
  if (startCompare !== 0) return startCompare;

  return a.createdAt.localeCompare(b.createdAt) || a.title.localeCompare(b.title);
}
