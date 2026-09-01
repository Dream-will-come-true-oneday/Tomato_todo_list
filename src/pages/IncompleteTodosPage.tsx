import { CalendarDays, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PageTitle } from '../components/PageTitle';
import { CompletionTagDialog } from '../components/todo/CompletionTagDialog';
import { TodoFilterBar } from '../components/todo/TodoFilterBar';
import { TodoTable } from '../components/todo/TodoTable';
import { createDefaultTodo } from '../domain/defaultData';
import { isIncompleteTodo, toDateKey } from '../domain/todoFilters';
import type { Todo, TodoTerm } from '../domain/types';
import { nullableDate } from '../lib/dateUtils';
import { defaultTodoFilters, matchesTodoFilters, matchesTodoSearch, type TodoFilterState } from '../lib/todoView';

export default function IncompleteTodosPage({
  data,
  todayPlanTodos,
  onAddTodo,
  onAddTodayPlanTodos,
  onUpdateTodo,
  onToggleTodoCheckIn,
  onDeleteTodo,
  onAddTypeTag,
  onDeleteTypeTag,
  focusTodoId,
  onFocusHandled
}: {
  data: {
    todos: Todo[];
    typeTags: { id: string; name: string; color: string }[];
  };
  todayPlanTodos: Todo[];
  onAddTodo: (todo: Todo) => void;
  onAddTodayPlanTodos: (todoIds: string[]) => void;
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onToggleTodoCheckIn: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onAddTypeTag: (name: string, color: string) => void;
  onDeleteTypeTag: (tagId: string) => void;
  focusTodoId: string | null;
  onFocusHandled: () => void;
}) {
  const [title, setTitle] = useState('');
  const [term, setTerm] = useState<TodoTerm>('short');
  const [startAt, setStartAt] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#9b2f25');
  const [filters, setFilters] = useState<TodoFilterState>(defaultTodoFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTodayPlanTodoIds, setSelectedTodayPlanTodoIds] = useState<string[]>([]);
  const [pendingDeleteTypeTagId, setPendingDeleteTypeTagId] = useState<string | null>(null);
  const [blockedDeleteTypeTagId, setBlockedDeleteTypeTagId] = useState<string | null>(null);
  const [completionTagDialogTodo, setCompletionTagDialogTodo] = useState<Todo | null>(null);
  const [checkInTagDialogTodo, setCheckInTagDialogTodo] = useState<Todo | null>(null);
  const todayPlanTodoIdSet = new Set(todayPlanTodos.map((todo) => todo.id));
  const incompleteTodos = data.todos
    .filter(isIncompleteTodo)
    .filter((todo) => matchesTodoFilters(todo, filters))
    .filter((todo) => matchesTodoSearch(todo, searchQuery));
  const visibleTodayPlanCandidates = incompleteTodos.filter((todo) => !todayPlanTodoIdSet.has(todo.id));
  const selectedEligibleTodoIds = selectedTodayPlanTodoIds.filter((todoId) =>
    visibleTodayPlanCandidates.some((todo) => todo.id === todoId)
  );
  const allVisibleCandidatesSelected =
    visibleTodayPlanCandidates.length > 0 && visibleTodayPlanCandidates.every((todo) => selectedTodayPlanTodoIds.includes(todo.id));

  useEffect(() => {
    if (!focusTodoId) return;
    const tags = document.getElementById(`todo-type-tags-${focusTodoId}`);
    tags?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const firstTagInput = tags?.querySelector<HTMLInputElement>('input:not(:disabled)');
    firstTagInput?.focus();
    onFocusHandled();
  }, [focusTodoId, onFocusHandled]);

  function addTodo() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddTodo(createDefaultTodo(trimmed, { term, startAt: nullableDate(startAt), dueAt: nullableDate(dueAt) }));
    setTitle('');
  }

  function addTag() {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    onAddTypeTag(trimmed, tagColor);
    setTagName('');
  }

  function deleteTypeTag(tagId: string) {
    const remainingTagIds = new Set(data.typeTags.filter((tag) => tag.id !== tagId).map((tag) => tag.id));
    const wouldLeaveAchievementTodoUntagged = data.todos.some(
      (todo) =>
        (todo.status === 'completed' || todo.checkInDates.length > 0) &&
        todo.typeTagIds.includes(tagId) &&
        !todo.typeTagIds.some((todoTagId) => todoTagId !== tagId && remainingTagIds.has(todoTagId))
    );
    if (wouldLeaveAchievementTodoUntagged) {
      setBlockedDeleteTypeTagId(tagId);
      setPendingDeleteTypeTagId(null);
      return;
    }
    onDeleteTypeTag(tagId);
    setPendingDeleteTypeTagId(null);
    if (filters.typeTagId === tagId) {
      setFilters({ ...filters, typeTagId: 'all' });
    }
  }

  function toggleTodayPlanSelection(todoId: string, checked: boolean) {
    setSelectedTodayPlanTodoIds((current) =>
      checked ? [...new Set([...current, todoId])] : current.filter((selectedId) => selectedId !== todoId)
    );
  }

  function toggleAllVisibleTodayPlanCandidates(checked: boolean) {
    setSelectedTodayPlanTodoIds((current) => {
      const visibleIds = visibleTodayPlanCandidates.map((todo) => todo.id);
      if (checked) return [...new Set([...current, ...visibleIds])];
      return current.filter((todoId) => !visibleIds.includes(todoId));
    });
  }

  function addSelectedToTodayPlan() {
    if (selectedEligibleTodoIds.length === 0) return;
    onAddTodayPlanTodos(selectedEligibleTodoIds);
    setSelectedTodayPlanTodoIds((current) => current.filter((todoId) => !selectedEligibleTodoIds.includes(todoId)));
  }

  function toggleTodoCheckIn(todo: Todo) {
    const hasValidTag = todo.typeTagIds.some((tagId) => data.typeTags.some((tag) => tag.id === tagId));
    if (!hasValidTag) {
      setCheckInTagDialogTodo(todo);
      return;
    }
    onToggleTodoCheckIn(todo.id);
  }

  return (
    <section className="page-panel table-page">
      <PageTitle eyebrow="未竟" title="未完成待办" />
      <div className="toolbar search-toolbar">
        <input
          aria-label="搜索待办"
          type="search"
          placeholder="搜索标题或备注…"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>
      <div className="toolbar">
        <input
          aria-label="新增待办标题"
          placeholder="新增待办"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addTodo();
          }}
        />
        <select aria-label="新增待办期限" value={term} onChange={(event) => setTerm(event.target.value as TodoTerm)}>
          <option value="short">短期</option>
          <option value="long">长期</option>
        </select>
        <input aria-label="新增开始日期" type="date" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
        <input aria-label="新增截止日期" type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        <button type="button" onClick={addTodo}>
          <Plus size={17} />
          新增
        </button>
      </div>
      <div className="toolbar tag-toolbar">
        <input
          aria-label="新类型标签名"
          placeholder="自定义类型标签"
          value={tagName}
          onChange={(event) => setTagName(event.target.value)}
        />
        <input aria-label="类型标签颜色" type="color" value={tagColor} onChange={(event) => setTagColor(event.target.value)} />
        <button type="button" onClick={addTag}>
          <Plus size={17} />
          加标签
        </button>
      </div>
      <div className="type-tag-library" aria-label="类型标签库">
        <span>类型标签库</span>
        {data.typeTags.length === 0 && <em>暂无自定义标签</em>}
        {data.typeTags.map((tag) => {
          const usageCount = data.todos.filter((todo) => todo.typeTagIds.includes(tag.id)).length;
          const isConfirmingDelete = pendingDeleteTypeTagId === tag.id;
          const isDeleteBlocked = blockedDeleteTypeTagId === tag.id;

          return (
            <div key={tag.id} className={isConfirmingDelete ? 'type-tag-chip confirming' : 'type-tag-chip'} style={{ borderColor: tag.color }}>
              <span className="type-tag-chip-name">
                <i style={{ backgroundColor: tag.color }} />
                {tag.name}
              </span>
              <small>{usageCount} 项</small>
              {isDeleteBlocked ? (
                <>
                  <small className="type-tag-delete-blocked">已有完成或打卡成果仍在使用此唯一标签，无法删除。</small>
                  <button className="ghost-button" type="button" onClick={() => setBlockedDeleteTypeTagId(null)}>
                    知道了
                  </button>
                </>
              ) : isConfirmingDelete ? (
                <>
                  <button className="danger-button" type="button" onClick={() => deleteTypeTag(tag.id)}>
                    确认删除
                  </button>
                  <button className="ghost-button" type="button" onClick={() => setPendingDeleteTypeTagId(null)}>
                    取消
                  </button>
                </>
              ) : (
                <button
                  className="ghost-button icon-button"
                  type="button"
                  onClick={() => setPendingDeleteTypeTagId(tag.id)}
                  title={`删除 ${tag.name}`}
                  aria-label={`准备删除标签 ${tag.name}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <TodoFilterBar
        filters={filters}
        typeTags={data.typeTags}
        statusOptions={['notStarted', 'active']}
        onChange={setFilters}
      />
      <div className="today-plan-batchbar" aria-label="今日安排批量操作">
        <label className="today-plan-select-all">
          <input
            type="checkbox"
            checked={allVisibleCandidatesSelected}
            disabled={visibleTodayPlanCandidates.length === 0}
            onChange={(event) => toggleAllVisibleTodayPlanCandidates(event.target.checked)}
          />
          选择当前筛选可加入待办
        </label>
        <span>{selectedEligibleTodoIds.length} 项已选择</span>
        <button type="button" onClick={addSelectedToTodayPlan} disabled={selectedEligibleTodoIds.length === 0}>
          <CalendarDays size={17} />
          加入今日安排
        </button>
      </div>
      <TodoTable
        title="短期待办"
        todos={incompleteTodos.filter((todo) => todo.term === 'short')}
        allTodos={data.todos}
        typeTags={data.typeTags}
        todayPlanTodoIdSet={todayPlanTodoIdSet}
        selectedTodayPlanTodoIds={selectedTodayPlanTodoIds}
        onToggleTodayPlanSelection={toggleTodayPlanSelection}
        onAddTodo={onAddTodo}
        onDeleteTodo={onDeleteTodo}
        onUpdateTodo={onUpdateTodo}
        onToggleTodoCheckIn={toggleTodoCheckIn}
        onCompletionBlocked={setCompletionTagDialogTodo}
      />
      <TodoTable
        title="长期待办"
        todos={incompleteTodos.filter((todo) => todo.term === 'long')}
        allTodos={data.todos}
        typeTags={data.typeTags}
        todayPlanTodoIdSet={todayPlanTodoIdSet}
        selectedTodayPlanTodoIds={selectedTodayPlanTodoIds}
        onToggleTodayPlanSelection={toggleTodayPlanSelection}
        onAddTodo={onAddTodo}
        onDeleteTodo={onDeleteTodo}
        onUpdateTodo={onUpdateTodo}
        onToggleTodoCheckIn={toggleTodoCheckIn}
        onCompletionBlocked={setCompletionTagDialogTodo}
      />
      {completionTagDialogTodo && (
        <CompletionTagDialog
          action="完成"
          todoTitle={completionTagDialogTodo.title}
          onClose={() => setCompletionTagDialogTodo(null)}
          onConfirm={() => {
            const tags = document.getElementById(`todo-type-tags-${completionTagDialogTodo.id}`);
            tags?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
            tags?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
            setCompletionTagDialogTodo(null);
          }}
        />
      )}
      {checkInTagDialogTodo && (
        <CompletionTagDialog
          action="打卡"
          todoTitle={checkInTagDialogTodo.title}
          onClose={() => setCheckInTagDialogTodo(null)}
          onConfirm={() => {
            const tags = document.getElementById(`todo-type-tags-${checkInTagDialogTodo.id}`);
            tags?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
            tags?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
            setCheckInTagDialogTodo(null);
          }}
        />
      )}
    </section>
  );
}
