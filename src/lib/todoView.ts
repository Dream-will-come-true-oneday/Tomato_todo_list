import type { Todo, TodoStatus, TodoTerm, UrgencyTag } from '../domain/types';

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

export function getTodoTypeTags(todo: Todo, typeTags: TypeTagView[]) {
  return typeTags.filter((tag) => todo.typeTagIds.includes(tag.id));
}
