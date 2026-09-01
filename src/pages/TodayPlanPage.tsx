import { Trash2 } from 'lucide-react';
import { PageTitle } from '../components/PageTitle';
import type { Todo, TodoStatus } from '../domain/types';
import { asInputDate } from '../lib/dateUtils';
import { statusLabels } from '../domain/todoView';

export default function TodayPlanPage({
  dateKey,
  todayPlanTodos,
  onRemoveTodo
}: {
  dateKey: string;
  todayPlanTodos: Todo[];
  onRemoveTodo: (todo: Todo) => void;
}) {
  return (
    <section className="page-panel table-page today-plan-page">
      <PageTitle eyebrow={dateKey} title="今日安排" />
      <p className="page-note">在未完成待办中勾选任务，可以批量加入今日安排。</p>
      <div className="today-plan-list">
        <div className="today-plan-row table-head">
          <span>事项</span>
          <span>日期</span>
          <span>状态</span>
          <span>番茄</span>
          <span>操作</span>
        </div>
        {todayPlanTodos.map((todo) => (
          <div className="today-plan-row" key={todo.id}>
            <strong>{todo.title}</strong>
            <span>{asInputDate(todo.startAt) || '-'} / {asInputDate(todo.dueAt) || '-'}</span>
            <span>{statusLabels[todo.status as Exclude<TodoStatus, 'archived'>]}</span>
            <span>{todo.pomodoroCount} 个</span>
            <button className="ghost-button" type="button" onClick={() => onRemoveTodo(todo)}>
              <Trash2 size={16} />
              移除
            </button>
          </div>
        ))}
        {todayPlanTodos.length === 0 && <p className="empty-state table-empty">今日安排暂无待办。</p>}
      </div>
    </section>
  );
}
