import type { Todo, TodoStatus, TodoTerm, UrgencyTag } from './types';

export type TodoFilterState = {
  status: 'all' | Exclude<TodoStatus, 'archived'>;
  term: 'all' | TodoTerm;
  urgency: 'all' | UrgencyTag | 'both';
  typeTagId: 'all' | string;
};

export type TypeTagView = {
  id: string;
  name: string;
  color: string;
};

export const defaultTodoFilters: TodoFilterState = {
  status: 'all',
  term: 'all',
  urgency: 'all',
  typeTagId: 'all'
};

export const statusLabels: Record<Exclude<TodoStatus, 'archived'>, string> = {
  notStarted: '未开始',
  active: '进行中',
  completed: '已完成'
};

export const termLabels: Record<TodoTerm, string> = {
  short: '短期',
  long: '长期'
};

export const urgencyLabels: Record<UrgencyTag, string> = {
  urgent: '紧急',
  important: '重要'
};

export function matchesTodoFilters(todo: Todo, filters: TodoFilterState) {
  if (filters.status !== 'all' && todo.status !== filters.status) return false;
  if (filters.term !== 'all' && todo.term !== filters.term) return false;
  if (filters.urgency === 'urgent' && !todo.urgencyTags.includes('urgent')) return false;
  if (filters.urgency === 'important' && !todo.urgencyTags.includes('important')) return false;
  if (filters.urgency === 'both' && (!todo.urgencyTags.includes('urgent') || !todo.urgencyTags.includes('important'))) {
    return false;
  }
  if (filters.typeTagId !== 'all' && !todo.typeTagIds.includes(filters.typeTagId)) return false;
  return true;
}

/** 标题/备注模糊搜索：按空白拆词，全部词命中（不区分大小写）才算匹配；空查询匹配全部。 */
export function matchesTodoSearch(todo: Todo, query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = `${todo.title}\n${todo.notes}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function getTodoTypeTags(todo: Todo, typeTags: TypeTagView[]) {
  return typeTags.filter((tag) => todo.typeTagIds.includes(tag.id));
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

/**
 * 手动排序：已手动排（order 非空）按 order 升序且排在未排成员之前；
 * 未手动排的成员之间沿用日程序，保证切换模式时未拖拽过的分组不跳动。
 */
export function compareTodosManual(a: Todo, b: Todo) {
  const aOrder = a.order ?? null;
  const bOrder = b.order ?? null;
  if (aOrder !== null && bOrder !== null && aOrder !== bOrder) return aOrder - bOrder;
  if (aOrder !== null && bOrder === null) return -1;
  if (aOrder === null && bOrder !== null) return 1;
  return compareTodosBySchedule(a, b);
}
