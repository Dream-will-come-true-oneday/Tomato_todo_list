import type { PomodoroRecord, Todo, TodoStatus } from '../domain/types';
import RecordList from './RecordList';

type Props = {
  todo: Todo | null;
  records: PomodoroRecord[];
  onSave: (todo: Todo) => void;
};

function toInputDate(value: string | null) {
  return value ?? '';
}

function fromInputDate(value: string) {
  return value || null;
}

export default function TaskDetail({ todo, records, onSave }: Props) {
  if (!todo) {
    return (
      <aside className="detail-panel">
        <p className="empty-state">选择一个待办来编辑日期、备注和状态。</p>
        <RecordList records={records} />
      </aside>
    );
  }

  const todoRecords = records.filter((record) => record.todoId === todo.id);

  return (
    <aside className="detail-panel">
      <p className="eyebrow">详情</p>
      <label>
        标题
        <input aria-label="标题" value={todo.title} onChange={(event) => onSave({ ...todo, title: event.target.value })} />
      </label>
      <label>
        备注
        <textarea value={todo.notes} onChange={(event) => onSave({ ...todo, notes: event.target.value })} />
      </label>
      <div className="form-grid">
        <label>
          状态
          <select
            aria-label="状态"
            value={todo.status}
            onChange={(event) => onSave({ ...todo, status: event.target.value as TodoStatus })}
          >
            <option value="notStarted">未开始</option>
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
          </select>
        </label>
        <label>
          期限
          <select value={todo.term} onChange={(event) => onSave({ ...todo, term: event.target.value as Todo['term'] })}>
            <option value="short">短期</option>
            <option value="long">长期</option>
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
