import { CalendarCheck2, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { createDefaultTodo } from '../../domain/defaultData';
import { toDateKey } from '../../domain/todoFilters';
import { getTodoTimeBadge, isOverdue } from '../../domain/todoStatus';
import type { Todo, TodoStatus, TodoTerm, UrgencyTag } from '../../domain/types';
import { asInputDate, nullableDate } from '../../lib/dateUtils';
import { compareTodosBySchedule, statusLabels, urgencyLabels } from '../../domain/todoView';

export function TodoTable({
  title,
  todos,
  typeTags,
  todayPlanTodoIdSet,
  selectedTodayPlanTodoIds,
  onToggleTodayPlanSelection,
  onAddTodo,
  onUpdateTodo,
  onToggleTodoCheckIn,
  onDeleteTodo,
  onCompletionBlocked,
  showCheckIn,
  focusTodoId,
  guideTodoId = null,
  guideMessage = null
}: {
  title: string;
  todos: Todo[];
  typeTags: { id: string; name: string; color: string }[];
  todayPlanTodoIdSet: Set<string>;
  selectedTodayPlanTodoIds: string[];
  onToggleTodayPlanSelection: (todoId: string, checked: boolean) => void;
  onAddTodo: (todo: Todo) => void;
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onToggleTodoCheckIn: (todo: Todo) => void;
  onDeleteTodo: (todoId: string) => void;
  onCompletionBlocked: (todo: Todo) => void;
  showCheckIn: boolean;
  focusTodoId: string | null;
  guideTodoId?: string | null;
  guideMessage?: string | null;
}) {
  const [expandedTodoIds, setExpandedTodoIds] = useState<Set<string>>(() => new Set(todos.map((todo) => todo.id)));
  const [detailTodoIds, setDetailTodoIds] = useState<Set<string>>(() => new Set());
  const visibleTodoIds = new Set(todos.map((todo) => todo.id));
  const roots = todos.filter((todo) => !todo.parentId || !visibleTodoIds.has(todo.parentId));
  const childrenByParent = new Map<string, Todo[]>();
  for (const child of todos.filter((todo) => todo.parentId && visibleTodoIds.has(todo.parentId))) {
    childrenByParent.set(child.parentId!, [...(childrenByParent.get(child.parentId!) ?? []), child]);
  }
  const sortedRoots = [...roots].sort(compareTodosBySchedule);
  const parentTodoIds = [...childrenByParent.keys()];

  // 斑马纹按“可见事项行”序号计算，详情行不计入；展平结果同时供后续拖拽排序复用
  const flatRows: Array<{ todo: Todo; depth: number }> = [];
  const collectRows = (todo: Todo, depth: number) => {
    flatRows.push({ todo, depth });
    if (expandedTodoIds.has(todo.id)) {
      for (const child of [...(childrenByParent.get(todo.id) ?? [])].sort(compareTodosBySchedule)) {
        collectRows(child, depth + 1);
      }
    }
  };
  for (const root of sortedRoots) collectRows(root, 0);

  // 标签聚焦流（从未完成页其他入口跳来补标签）要求详情行与聚焦渲染在同一帧展开，
  // 故在渲染期同步调整状态；否则父级 effect 查询标签输入时详情行尚未挂载
  const [prevFocusTodoId, setPrevFocusTodoId] = useState<string | null>(null);
  if (focusTodoId !== prevFocusTodoId) {
    setPrevFocusTodoId(focusTodoId);
    if (focusTodoId && todos.some((todo) => todo.id === focusTodoId)) {
      setDetailTodoIds((current) => new Set(current).add(focusTodoId));
    }
  }

  function toggleTodoChildren(todoId: string) {
    setExpandedTodoIds((current) => {
      const next = new Set(current);
      if (next.has(todoId)) next.delete(todoId);
      else next.add(todoId);
      return next;
    });
  }

  function toggleTodoDetail(todoId: string) {
    setDetailTodoIds((current) => {
      const next = new Set(current);
      if (next.has(todoId)) next.delete(todoId);
      else next.add(todoId);
      return next;
    });
  }

  function expandAllTodoChildren() {
    setExpandedTodoIds((current) => new Set([...current, ...parentTodoIds]));
  }

  function collapseAllTodoChildren() {
    setExpandedTodoIds((current) => {
      const next = new Set(current);
      parentTodoIds.forEach((todoId) => next.delete(todoId));
      return next;
    });
  }

  return (
    <section className="table-section">
      <div className="table-section-heading">
        <h2>{title}</h2>
        {parentTodoIds.length > 0 && (
          <div className="tree-bulk-actions" aria-label={`${title} 子任务显示`}>
            <button className="btn-secondary" type="button" onClick={expandAllTodoChildren}>
              全部展开
            </button>
            <button className="btn-secondary" type="button" onClick={collapseAllTodoChildren}>
              全部收起
            </button>
          </div>
        )}
      </div>
      <div className="todo-table" role="table" aria-label={title}>
        <div className={showCheckIn ? 'todo-row table-head has-checkin' : 'todo-row table-head'} role="row">
          <span>事项</span>
          <span>日期</span>
          <span>状态</span>
          <span>期限</span>
          {showCheckIn && <span>打卡</span>}
          <span>操作</span>
        </div>
        {flatRows.map(({ todo, depth }, index) => (
          <TodoRow
            key={todo.id}
            todo={todo}
            depth={depth}
            zebraEven={index % 2 === 1}
            typeTags={typeTags}
            showCheckIn={showCheckIn}
            isInTodayPlan={todayPlanTodoIdSet.has(todo.id)}
            isSelectedForTodayPlan={selectedTodayPlanTodoIds.includes(todo.id)}
            onToggleTodayPlanSelection={onToggleTodayPlanSelection}
            onAddTodo={onAddTodo}
            onDeleteTodo={onDeleteTodo}
            onUpdateTodo={onUpdateTodo}
            onToggleTodoCheckIn={onToggleTodoCheckIn}
            onCompletionBlocked={onCompletionBlocked}
            hasChildren={(childrenByParent.get(todo.id)?.length ?? 0) > 0}
            isExpanded={expandedTodoIds.has(todo.id)}
            onToggleChildren={toggleTodoChildren}
            isDetailExpanded={detailTodoIds.has(todo.id)}
            onToggleDetail={toggleTodoDetail}
            showGuide={guideTodoId === todo.id && guideMessage !== null}
            guideMessage={guideMessage}
          />
        ))}
        {todos.length === 0 && <p className="empty-state table-empty">暂无待办。</p>}
      </div>
    </section>
  );
}

function TodoRow({
  todo,
  depth = 0,
  zebraEven = false,
  typeTags,
  showCheckIn,
  isInTodayPlan,
  isSelectedForTodayPlan,
  onToggleTodayPlanSelection,
  onAddTodo,
  onUpdateTodo,
  onToggleTodoCheckIn,
  onDeleteTodo,
  onCompletionBlocked,
  hasChildren,
  isExpanded,
  onToggleChildren,
  isDetailExpanded,
  onToggleDetail,
  showGuide = false,
  guideMessage = null
}: {
  todo: Todo;
  depth?: number;
  zebraEven?: boolean;
  typeTags: { id: string; name: string; color: string }[];
  showCheckIn: boolean;
  isInTodayPlan: boolean;
  isSelectedForTodayPlan: boolean;
  onToggleTodayPlanSelection: (todoId: string, checked: boolean) => void;
  onAddTodo: (todo: Todo) => void;
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onToggleTodoCheckIn: (todo: Todo) => void;
  onDeleteTodo: (todoId: string) => void;
  onCompletionBlocked: (todo: Todo) => void;
  hasChildren: boolean;
  isExpanded: boolean;
  onToggleChildren: (todoId: string) => void;
  isDetailExpanded: boolean;
  onToggleDetail: (todoId: string) => void;
  showGuide?: boolean;
  guideMessage?: string | null;
}) {
  const badge = getTodoTimeBadge(todo);
  // 引导条只在待办仍缺有效标签时显示：补上标签后自动消失，无需手动清理
  const hasValidTypeTag = todo.typeTagIds.some((tagId) => typeTags.some((tag) => tag.id === tagId));
  const guideVisible = showGuide && !hasValidTypeTag;

  function toggleUrgency(tag: UrgencyTag) {
    const hasTag = todo.urgencyTags.includes(tag);
    onUpdateTodo(todo, {
      urgencyTags: hasTag ? todo.urgencyTags.filter((item) => item !== tag) : [...todo.urgencyTags, tag]
    });
  }

  function toggleTypeTag(tagId: string) {
    const hasTag = todo.typeTagIds.includes(tagId);
    onUpdateTodo(todo, {
      typeTagIds: hasTag ? todo.typeTagIds.filter((item) => item !== tagId) : [...todo.typeTagIds, tagId]
    });
  }

  const rowClassName = [
    'todo-row',
    showCheckIn ? 'has-checkin' : '',
    depth > 0 ? 'child-row' : '',
    zebraEven ? 'todo-row-even' : '',
    isOverdue(todo) ? 'row-overdue' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={rowClassName} role="row">
      <div
        className="title-cell"
        style={{ gridTemplateColumns: `${30 + Math.min(depth, 6) * 24}px auto minmax(0, 1fr) auto` }}
      >
        <span className="tree-gutter">
          {hasChildren ? (
            <button
              className={isExpanded ? 'tree-toggle expanded' : 'tree-toggle'}
              type="button"
              aria-label={`${isExpanded ? '收起' : '展开'} ${todo.title} 的子任务`}
              aria-expanded={isExpanded}
              title={isExpanded ? '收起子任务' : '展开子任务'}
              onClick={() => onToggleChildren(todo.id)}
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          ) : depth > 0 ? (
            <span className="branch-mark">└</span>
          ) : null}
        </span>
        <label className={isInTodayPlan ? 'today-plan-picker joined' : 'today-plan-picker'}>
          <input
            type="checkbox"
            aria-label={`${todo.title} 加入今日安排`}
            checked={isInTodayPlan || isSelectedForTodayPlan}
            disabled={isInTodayPlan}
            onChange={(event) => onToggleTodayPlanSelection(todo.id, event.target.checked)}
          />
          <span>{isInTodayPlan ? '已加入' : '待安排'}</span>
        </label>
        <input aria-label={`${todo.title} 标题`} value={todo.title} onChange={(event) => onUpdateTodo(todo, { title: event.target.value })} />
        {badge && <em className={`badge ${badge.tone}`}>{badge.label}</em>}
      </div>
      <div className="date-cell">
        <input
          aria-label={`${todo.title} 开始日期`}
          type="date"
          value={asInputDate(todo.startAt)}
          onChange={(event) => onUpdateTodo(todo, { startAt: nullableDate(event.target.value) })}
        />
        <input
          aria-label={`${todo.title} 截止日期`}
          type="date"
          value={asInputDate(todo.dueAt)}
          onChange={(event) => onUpdateTodo(todo, { dueAt: nullableDate(event.target.value) })}
        />
      </div>
      <select
        aria-label={`${todo.title} 状态`}
        value={todo.status}
        onChange={(event) => {
          const nextStatus = event.target.value as TodoStatus;
          if (nextStatus === 'completed' && !todo.typeTagIds.some((tagId) => typeTags.some((tag) => tag.id === tagId))) {
            onCompletionBlocked(todo);
            return;
          }
          onUpdateTodo(todo, { status: nextStatus });
        }}
      >
        <option value="notStarted">{statusLabels.notStarted}</option>
        <option value="active">{statusLabels.active}</option>
        <option value="completed">{statusLabels.completed}</option>
      </select>
      <select aria-label={`${todo.title} 长短期`} value={todo.term} onChange={(event) => onUpdateTodo(todo, { term: event.target.value as TodoTerm })}>
        <option value="short">短期</option>
        <option value="long">长期</option>
      </select>
      {showCheckIn && <TodoCheckInCell todo={todo} onToggle={() => onToggleTodoCheckIn(todo)} />}
      <div className="row-actions">
        <button
          className={isDetailExpanded ? 'ghost-button icon-button detail-toggle expanded' : 'ghost-button icon-button detail-toggle'}
          type="button"
          aria-label={`${isDetailExpanded ? '收起' : '展开'} ${todo.title} 的详情`}
          aria-expanded={isDetailExpanded}
          title={isDetailExpanded ? '收起详情' : '展开详情'}
          onClick={() => onToggleDetail(todo.id)}
        >
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        <button className="danger-button icon-button" type="button" onClick={() => onDeleteTodo(todo.id)} aria-label={`删除 ${todo.title}`}>
          <Trash2 size={16} />
        </button>
      </div>
      {isDetailExpanded && (
        <div className="todo-detail-row">
          {guideVisible && (
            <p className="detail-guide" role="status">
              {guideMessage}
            </p>
          )}
          <div className="detail-group">
            <span className="detail-label">紧急 / 重要</span>
            <div className="mini-checks">
              {(Object.keys(urgencyLabels) as UrgencyTag[]).map((tag) => (
                <label key={tag}>
                  <input type="checkbox" checked={todo.urgencyTags.includes(tag)} onChange={() => toggleUrgency(tag)} />
                  {urgencyLabels[tag]}
                </label>
              ))}
            </div>
          </div>
          <div className="detail-group">
            <span className="detail-label">类型标签</span>
            <div className="type-tags" id={`todo-type-tags-${todo.id}`}>
              {typeTags.length === 0 && <em>暂无标签</em>}
              {typeTags.map((tag) => (
                <label key={tag.id} style={{ borderColor: tag.color }}>
                  <input
                    type="checkbox"
                    aria-label={`${todo.title} 类型标签 ${tag.name}`}
                    checked={todo.typeTagIds.includes(tag.id)}
                    onChange={() => toggleTypeTag(tag.id)}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          </div>
          <button
            className="ghost-button"
            type="button"
            aria-label={`创建子项 ${todo.title}`}
            onClick={() => onAddTodo(createDefaultTodo('子待办', { parentId: todo.id, term: todo.term }))}
          >
            <Plus size={14} />
            子项
          </button>
        </div>
      )}
    </div>
  );
}

function TodoCheckInCell({ todo, onToggle }: { todo: Todo; onToggle: () => void }) {
  if (todo.term !== 'long') return <span className="checkin-cell checkin-empty">-</span>;

  const checkedInToday = todo.checkInDates.includes(toDateKey());
  return (
    <div className="checkin-cell">
      <span>累计 {todo.checkInDates.length} 次</span>
      <button
        className={checkedInToday ? 'checkin-button checked' : 'checkin-button'}
        type="button"
        aria-label={`${checkedInToday ? '撤销' : ''}${todo.title} 今日打卡`}
        aria-pressed={checkedInToday}
        onClick={onToggle}
      >
        <CalendarCheck2 size={16} />
        {checkedInToday ? '今日已打卡' : '今日打卡'}
      </button>
    </div>
  );
}
