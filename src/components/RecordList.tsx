import type { PomodoroRecord } from '../domain/types';

type Props = {
  records: PomodoroRecord[];
};

export default function RecordList({ records }: Props) {
  const completedRecords = records.filter((record) => record.completionType === 'completed');

  if (completedRecords.length === 0) {
    return <p className="empty-state">还没有成功完成的番茄记录。</p>;
  }

  return (
    <div className="record-list">
      {completedRecords.slice(0, 8).map((record) => (
        <div className="record-item" key={record.id}>
          <strong>{record.plannedFocusMinutes} 分钟</strong>
          <span>{new Date(record.endedAt).toLocaleString()}</span>
          <em>完成</em>
        </div>
      ))}
    </div>
  );
}
