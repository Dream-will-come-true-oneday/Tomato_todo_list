import { CalendarCheck2, ChartPie, CheckCircle2 } from 'lucide-react';
import type { TodoAchievementKind, TypeTagShare } from '../../domain/reporting';
import { isCompletedLate } from '../../domain/todoStatus';
import type { Todo, TodoStatus } from '../../domain/types';
import { statusLabels, type TypeTagView } from '../../domain/todoView';

export function CompletedCheckInCount({ todo }: { todo: Todo }) {
  return (
    <span className={todo.term === 'long' ? 'completed-checkin-count' : 'completed-checkin-count empty'}>
      {todo.term === 'long' ? `打卡 ${todo.checkInDates.length} 次` : ''}
    </span>
  );
}

export function AchievementStatus({
  todo,
  kind,
  typeTags,
  onUpdateTodo,
  onCompletionBlocked
}: {
  todo: Todo;
  kind: TodoAchievementKind | null;
  typeTags: TypeTagView[];
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onCompletionBlocked: (todo: Todo) => void;
}) {
  if (kind === 'completed') {
    return (
      <div className="done-status-stack">
        <CompletedStatusSelect todo={todo} typeTags={typeTags} onUpdateTodo={onUpdateTodo} onCompletionBlocked={onCompletionBlocked} />
        {isCompletedLate(todo) && <span className="done-status overdue-completed">逾期完成</span>}
      </div>
    );
  }

  const actualStatus = todo.status === 'archived' ? '已归档' : statusLabels[todo.status];
  return (
    <div className="done-status-stack">
      {kind === 'checkIn' && <span className="done-status checked-in">已打卡</span>}
      <span className="done-status actual-status">{actualStatus}</span>
    </div>
  );
}

export function AchievementIcon({ kind }: { kind: TodoAchievementKind | null }) {
  return kind === 'checkIn' ? <CalendarCheck2 size={18} /> : <CheckCircle2 size={18} />;
}

export function CompletedTypeChart({ shares }: { shares: TypeTagShare[] }) {
  if (shares.length === 0) {
    return <p className="empty-state analytics-empty">暂无历史成果，完成任务或打卡后会在这里显示类型占比。</p>;
  }

  let offset = 0;
  const total = shares.reduce((sum, share) => sum + share.count, 0);
  const stops = shares.map((share) => {
    const start = offset;
    offset += (share.count / total) * 100;
    return `${share.color} ${start}% ${offset}%`;
  });
  const label = shares.map((share) => `${share.name} ${share.percentage}%`).join('，');

  return (
    <section className="completion-analytics" aria-labelledby="completion-chart-title">
      <div className="analytics-heading">
        <div>
          <p className="eyebrow">全历史</p>
          <h2 id="completion-chart-title">成果类型占比</h2>
        </div>
        <ChartPie size={24} aria-hidden="true" />
      </div>
      <div className="completion-chart-content">
        <div className="type-pie-chart" role="img" aria-label={`成果类型占比：${label}`} style={{ backgroundImage: `conic-gradient(${stops.join(', ')})` }}>
          <span>类型分布</span>
        </div>
        <ul className="type-share-legend">
          {shares.map((share) => (
            <li key={share.id}>
              <i style={{ backgroundColor: share.color }} />
              <span>{share.name}</span>
              <strong>{share.count} 项</strong>
              <em>{share.percentage}%</em>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CompletedStatusSelect({
  todo,
  typeTags,
  onUpdateTodo,
  onCompletionBlocked
}: {
  todo: Todo;
  typeTags: TypeTagView[];
  onUpdateTodo: (todo: Todo, patch: Partial<Todo>) => void;
  onCompletionBlocked: (todo: Todo) => void;
}) {
  return (
    <select
      className={todo.status === 'completed' ? 'done-status-select completed' : 'done-status-select active'}
      aria-label={`${todo.title} 已完成页状态`}
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
      <option value="notStarted">未开始</option>
      <option value="active">进行中</option>
      <option value="completed">已完成</option>
    </select>
  );
}
