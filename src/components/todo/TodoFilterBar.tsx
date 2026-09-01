import type { TodoStatus } from '../../domain/types';
import { statusLabels, type TodoFilterState, type TypeTagView } from '../../domain/todoView';

export function TodoFilterBar({
  filters,
  typeTags,
  statusOptions,
  onChange
}: {
  filters: TodoFilterState;
  typeTags: TypeTagView[];
  statusOptions: Array<Exclude<TodoStatus, 'archived'>>;
  onChange: (filters: TodoFilterState) => void;
}) {
  return (
    <div className="filter-bar" aria-label="待办筛选">
      <label>
        状态
        <select
          aria-label="筛选状态"
          value={filters.status}
          onChange={(event) => onChange({ ...filters, status: event.target.value as TodoFilterState['status'] })}
        >
          <option value="all">全部状态</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>
      </label>
      <label>
        期限
        <select
          aria-label="筛选期限"
          value={filters.term}
          onChange={(event) => onChange({ ...filters, term: event.target.value as TodoFilterState['term'] })}
        >
          <option value="all">全部期限</option>
          <option value="short">短期</option>
          <option value="long">长期</option>
        </select>
      </label>
      <label>
        紧急重要
        <select
          aria-label="筛选紧急重要"
          value={filters.urgency}
          onChange={(event) => onChange({ ...filters, urgency: event.target.value as TodoFilterState['urgency'] })}
        >
          <option value="all">全部</option>
          <option value="urgent">紧急</option>
          <option value="important">重要</option>
          <option value="both">紧急且重要</option>
        </select>
      </label>
      <label>
        类型标签
        <select
          aria-label="筛选类型标签"
          value={filters.typeTagId}
          onChange={(event) => onChange({ ...filters, typeTagId: event.target.value })}
        >
          <option value="all">全部标签</option>
          {typeTags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
