import type { Todo } from './types';

export function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isIncompleteTodo(todo: Todo) {
  return todo.status !== 'completed' && todo.status !== 'archived';
}

export function isTodayPomodoroTodo(todo: Todo, today = toDateKey()) {
  return isIncompleteTodo(todo) && todo.startAt?.slice(0, 10) === today && todo.dueAt?.slice(0, 10) === today;
}

export function isCompletedOn(todo: Todo, dateKey: string) {
  return todo.status === 'completed' && todo.completedAt?.slice(0, 10) === dateKey;
}
