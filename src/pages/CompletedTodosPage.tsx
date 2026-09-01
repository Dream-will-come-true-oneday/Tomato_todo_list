import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { PageTitle } from '../components/PageTitle';
import {
  AchievementIcon,
  AchievementStatus,
  CompletedCheckInCount,
  CompletedTypeChart
} from '../components/completed/completedParts';
import { CompletionTagDialog } from '../components/todo/CompletionTagDialog';
import { TodoFilterBar } from '../components/todo/TodoFilterBar';
import { TypeTagBadges } from '../components/todo/TypeTagBadges';
import { achievementTime, buildCompletedTodoGroups, filterCompletedTodoGroups, type CompletedTodoGroup } from '../domain/completedGroups';
import { getAchievementTypeTagShares } from '../domain/reporting';
import { toDateKey } from '../domain/todoFilters';
import type { Todo } from '../domain/types';
import { defaultTodoFilters, type TodoFilterState, type TypeTagView } from '../domain/todoView';

export default function CompletedTodosPage({
  data,
  onUpdateTodo,
  onSaveReflection,
  onOpenTodoTags
}: {
  data: { todos: Todo[]; reflections: { date: string; content: string }[]; typeTags: TypeTagView[] };
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onSaveReflection: (date: string, content: string) => void;
  onOpenTodoTags: (todoId: string) => void;
}) {
  const [date, setDate] = useState(toDateKey());
  const [filters, setFilters] = useState<TodoFilterState>(defaultTodoFilters);
  const completedGroups = filterCompletedTodoGroups(buildCompletedTodoGroups(data.todos, date), filters);
  const reflection = data.reflections.find((item) => item.date === date)?.content ?? '';
  const typeTagShares = getAchievementTypeTagShares(data.todos, data.typeTags);
  const [completionTagDialogTodo, setCompletionTagDialogTodo] = useState<Todo | null>(null);
  const [expandedCompletedParentIds, setExpandedCompletedParentIds] = useState<Set<string>>(() => new Set());

  function isCompletedGroupExpanded(group: CompletedTodoGroup) {
    return !expandedCompletedParentIds.has(group.parent.id);
  }

  function toggleCompletedGroup(parentId: string) {
    setExpandedCompletedParentIds((current) => {
      const next = new Set(current);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  }

  function expandAllCompletedGroups() {
    setExpandedCompletedParentIds(new Set());
  }

  function collapseAllCompletedGroups() {
    setExpandedCompletedParentIds(new Set(completedGroups.filter((group) => group.children.length > 0).map((group) => group.parent.id)));
  }

  return (
    <section className="page-panel table-page">
      <PageTitle eyebrow="已竟" title="已完成待办" />
      <CompletedTypeChart shares={typeTagShares} />
      <div className="toolbar narrow-toolbar">
        <label>
          日期
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>
      <TodoFilterBar
        filters={filters}
        typeTags={data.typeTags}
        statusOptions={['notStarted', 'active', 'completed']}
        onChange={setFilters}
      />
      {completedGroups.some((group) => group.children.length > 0) && (
        <div className="tree-bulk-actions completed-tree-actions" aria-label="已完成待办子任务显示">
          <button className="ghost-button" type="button" onClick={expandAllCompletedGroups}>
            全部展开
          </button>
          <button className="ghost-button" type="button" onClick={collapseAllCompletedGroups}>
            全部收起
          </button>
        </div>
      )}
      <div className="done-table">
        {completedGroups.length === 0 && <p className="empty-state table-empty">这一天暂无完成或打卡记录。</p>}
        {completedGroups.map((group) => {
          const hasChildren = group.children.length > 0;
          const isExpanded = isCompletedGroupExpanded(group);
          return (
            <div className="done-group" key={group.parent.id}>
              <div className="done-row done-parent">
                {hasChildren ? (
                  <button
                    className={isExpanded ? 'tree-toggle expanded' : 'tree-toggle'}
                    type="button"
                    aria-label={`${isExpanded ? '收起' : '展开'} ${group.parent.title} 的子任务`}
                    aria-expanded={isExpanded}
                    title={isExpanded ? '收起子任务' : '展开子任务'}
                    onClick={() => toggleCompletedGroup(group.parent.id)}
                  >
                    <ChevronRight size={17} aria-hidden="true" />
                  </button>
                ) : (
                  <span className="tree-toggle-spacer" aria-hidden="true" />
                )}
                <AchievementIcon kind={group.parentAchievementKind} />
                <strong>{group.parent.title}</strong>
                <AchievementStatus
                  todo={group.parent}
                  kind={group.parentAchievementKind}
                  typeTags={data.typeTags}
                  onUpdateTodo={onUpdateTodo}
                  onCompletionBlocked={setCompletionTagDialogTodo}
                />
                <TypeTagBadges todo={group.parent} typeTags={data.typeTags} />
                <CompletedCheckInCount todo={group.parent} />
                <span>{group.parent.pomodoroCount} 个番茄</span>
                <span>{achievementTime(group.parent, group.parentAchievementKind)}</span>
              </div>
              {hasChildren && isExpanded && group.children.map(({ todo: child, achievementKind }) => (
                <div className="done-row done-child" key={child.id}>
                  <span className="tree-toggle-spacer" aria-hidden="true" />
                  <span className="branch-mark">└</span>
                  <strong>{child.title}</strong>
                  <AchievementStatus
                    todo={child}
                    kind={achievementKind}
                    typeTags={data.typeTags}
                    onUpdateTodo={onUpdateTodo}
                    onCompletionBlocked={setCompletionTagDialogTodo}
                  />
                  <TypeTagBadges todo={child} typeTags={data.typeTags} />
                  <CompletedCheckInCount todo={child} />
                  <span>{child.pomodoroCount} 个番茄</span>
                  <span>{achievementTime(child, achievementKind)}</span>
                </div>
              ))}
            </div>
          );
        })}
          </div>
      <label className="reflection-box">
        每日自我反思
        <textarea value={reflection} onChange={(event) => onSaveReflection(date, event.target.value)} />
      </label>
      {completionTagDialogTodo && (
        <CompletionTagDialog
          action="完成"
          todoTitle={completionTagDialogTodo.title}
          onClose={() => setCompletionTagDialogTodo(null)}
          onConfirm={() => {
            onOpenTodoTags(completionTagDialogTodo.id);
            setCompletionTagDialogTodo(null);
          }}
        />
      )}
    </section>
  );
}
