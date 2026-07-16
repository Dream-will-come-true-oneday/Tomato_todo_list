import type { PomodoroRecord } from '../domain/types';

type Props = {
  records: PomodoroRecord[];
};

export default function RecordList({ records }: Props) {
  if (records.length === 0) {
    return <p className="empty-state">还没有番茄记录。</p>;
  }

  return (
    <div className="record-list">
      {records.slice(0, 8).map((record) => (
        <div className="record-item" key={record.id}>
          <strong>{record.plannedFocusMinutes} 分钟</strong>
          <span>{new Date(record.endedAt).toLocaleString()}</span>
          <em>{record.completionType === 'completed' ? '完成' : record.completionType === 'skipped' ? '跳过' : '重置'}</em>
        </div>
      ))}
    </div>
  );
}
