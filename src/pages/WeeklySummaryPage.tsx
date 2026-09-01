import { CalendarCheck2, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { PageTitle } from '../components/PageTitle';
import { buildWeeklyTodoTree, getWeekStart, getWeekSummary, type WeeklyTodoNode } from '../domain/reporting';
import { toDateKey } from '../domain/todoFilters';
import type { PomodoroRecord, Todo } from '../domain/types';
import { type TypeTagView } from '../domain/todoView';

export default function WeeklySummaryPage({
  data,
  onSaveReflection
}: {
  data: {
    todos: Todo[];
    typeTags: TypeTagView[];
    pomodoroRecords: PomodoroRecord[];
    weeklyReflections: { weekStart: string; content: string }[];
  };
  onSaveReflection: (weekStart: string, content: string) => void;
}) {
  const [weekStart, setWeekStart] = useState(() => toDateKey(getWeekStart()));
  const summary = getWeekSummary(data.todos, data.typeTags, data.pomodoroRecords, weekStart);
  const reflection = data.weeklyReflections.find((item) => item.weekStart === weekStart)?.content ?? '';
  const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const maxDailyAchievements = Math.max(...summary.dailyAchievements.map((item) => item.achievementCount), 1);
  const weeklyTodoTree = buildWeeklyTodoTree(data.todos, summary.achievements);

  function moveWeek(offset: number) {
    const next = new Date(`${weekStart}T12:00:00`);
    next.setDate(next.getDate() + offset * 7);
    setWeekStart(toDateKey(next));
  }

  function formatDate(dateKey: string) {
    return new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric' }).format(new Date(`${dateKey}T12:00:00`));
  }

  return (
    <section className="page-panel weekly-summary-page">
      <PageTitle eyebrow="复盘" title="周总结" />
      <div className="week-navigation" aria-label="周次切换">
        <button className="ghost-button icon-button" type="button" onClick={() => moveWeek(-1)} aria-label="上一周" title="上一周">
          <ChevronLeft size={19} />
        </button>
        <strong>{formatDate(summary.weekStart)} - {formatDate(summary.weekEnd)}</strong>
        <button className="ghost-button icon-button" type="button" onClick={() => moveWeek(1)} aria-label="下一周" title="下一周">
          <ChevronRight size={19} />
        </button>
        <button className="ghost-button" type="button" onClick={() => setWeekStart(toDateKey(getWeekStart()))}>
          本周
        </button>
      </div>

      <div className="weekly-metrics" aria-label="本周统计">
        <WeeklyMetric label="本周成果" value={`${summary.achievementCount} 项`} />
        <WeeklyMetric label="完成番茄" value={`${summary.completedPomodoroCount} 个`} />
        <WeeklyMetric label="实际专注" value={`${summary.focusMinutes} 分钟`} />
        <WeeklyMetric label="主要类型" value={summary.topTypeName ?? '暂无'} />
      </div>

      <section className="weekly-section weekly-trend" aria-labelledby="weekly-trend-title">
        <div className="analytics-heading">
          <h2 id="weekly-trend-title">每日成果</h2>
          <span>{summary.achievementCount} 项</span>
        </div>
        <div className="weekly-bar-chart" role="img" aria-label={`本周每日成果：${summary.dailyAchievements.map((item, index) => `${dayLabels[index]} ${item.achievementCount} 项`).join('，')}`}>
          {summary.dailyAchievements.map((item, index) => (
            <div className="weekly-bar-item" key={item.date}>
              <span className="weekly-bar-value">{item.achievementCount}</span>
              <div className="weekly-bar-track">
                <div className="weekly-bar-fill" style={{ height: `${(item.achievementCount / maxDailyAchievements) * 100}%` }} />
              </div>
              <small>{dayLabels[index]}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="weekly-section" aria-labelledby="weekly-todos-title">
        <div className="analytics-heading">
          <h2 id="weekly-todos-title">本周成果任务</h2>
          <span>{summary.achievementTodos.length} 项任务</span>
        </div>
        {summary.achievementTodos.length === 0 ? (
          <p className="empty-state">这一周还没有完成或打卡成果。</p>
        ) : (
          <div className="weekly-task-list">
            {weeklyTodoTree.map((node) => (
              <WeeklyTodoTreeItem key={node.todo.id} node={node} />
            ))}
          </div>
        )}
      </section>

      <label className="reflection-box weekly-reflection-box">
        本周复盘
        <textarea
          aria-label="本周复盘"
          placeholder="记录这一周的收获与调整"
          value={reflection}
          onChange={(event) => onSaveReflection(weekStart, event.target.value)}
        />
      </label>
    </section>
  );
}

function WeeklyTodoTreeItem({ node, depth = 0 }: { node: WeeklyTodoNode; depth?: number }) {
  const hasAchievement = node.completedThisWeek || node.checkInCountThisWeek > 0;
  const isIncompleteParent = node.children.length > 0 && !hasAchievement && node.todo.status !== 'completed';

  return (
    <>
      <div className={hasAchievement ? 'weekly-task-item completed' : 'weekly-task-item parent'} style={{ paddingLeft: `${depth * 22}px` }}>
        {node.completedThisWeek ? <CheckCircle2 size={17} aria-hidden="true" /> : node.checkInCountThisWeek > 0 ? <CalendarCheck2 size={17} aria-hidden="true" /> : <span className="weekly-tree-branch">└</span>}
        <strong>{node.todo.title}</strong>
        {isIncompleteParent && <em className="weekly-parent-status">进行中</em>}
        {node.checkInCountThisWeek > 0 && <span>本周打卡 {node.checkInCountThisWeek} 次</span>}
        {node.completedThisWeek && <span>{node.todo.pomodoroCount} 个番茄</span>}
        {node.completedThisWeek && <time dateTime={node.todo.completedAt ?? undefined}>{node.todo.completedAt?.slice(0, 10)}</time>}
      </div>
      {node.children.map((child) => (
        <WeeklyTodoTreeItem key={child.todo.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

function WeeklyMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
