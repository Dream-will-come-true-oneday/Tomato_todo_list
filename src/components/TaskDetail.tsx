import type { PomodoroRecord, Todo, TodoPriority, TodoStatus } from '../domain/types';
import RecordList from './RecordList';

type Props = {
  todo: Todo | null;
  records: PomodoroRecord[];
  onSave: (todo: Todo) => void;
};

function toInputDate(value: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function fromInputDate(value: string) {
  return value || null;
}

export default function TaskDetail({ todo, records, onSave }: Props) {
  if (!todo) {
    return (
      <aside className="panel detail-panel">
        <p className="empty-state">选择一个待办来编辑日期、备注和状态。</p>
        <RecordList records={records.filter((record) => record.completionType === 'completed')} />
      </aside>
    );
  }

  const todoRecords = records.filter((record) => record.todoId === todo.id && record.completionType === 'completed');

  return (
    <aside className="panel detail-panel">
      <p className="eyebrow">Task Detail</p>
      <label>
        标题
        <input value={todo.title} onChange={(event) => onSave({ ...todo, title: event.target.value })} />
      </label>
      <label>
        备注
        <textarea value={todo.notes} onChange={(event) => onSave({ ...todo, notes: event.target.value })} />
      </label>
      <div className="form-grid">
        <label>
          优先级
          <select value={todo.priority} onChange={(event) => onSave({ ...todo, priority: event.target.value as TodoPriority })}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </label>
        <label>
          状态
          <select
            value={todo.status}
            onChange={(event) => {
              const status = event.target.value as TodoStatus;
              onSave({
                ...todo,
                status,
                completedAt: status === 'completed' ? new Date().toISOString() : null
              });
            }}
          >
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
            <option value="archived">已归档</option>
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          开始时间
          <input
            type="date"
            value={toInputDate(todo.startAt)}
            onChange={(event) => onSave({ ...todo, startAt: fromInputDate(event.target.value) })}
          />
        </label>
        <label>
          截止时间
          <input
            type="date"
            value={toInputDate(todo.dueAt)}
            onChange={(event) => onSave({ ...todo, dueAt: fromInputDate(event.target.value) })}
          />
        </label>
      </div>
      <div className="task-stats">
        <span>{todo.pomodoroCount}</span>
        <small>累计番茄</small>
      </div>
      <h2>关联记录</h2>
      <RecordList records={todoRecords} />
    </aside>
  );
}
