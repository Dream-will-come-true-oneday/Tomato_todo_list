import { ArrowUpRight, CalendarDays, CalendarRange, CheckCircle2, Lightbulb, ListTodo } from 'lucide-react';
import { PageTitle } from '../components/PageTitle';
import { getAchievementsOn, getWeekStart, getWeekSummary } from '../domain/reporting';
import { isIncompleteTodo, toDateKey } from '../domain/todoFilters';
import type { PomodoroRecord, Todo } from '../domain/types';
import { type TypeTagView } from '../lib/todoView';
import type { Page } from './types';

export default function TodoHubPage({
  data,
  todayPlanTodos,
  onNavigate
}: {
  data: { todos: Todo[]; typeTags: TypeTagView[]; pomodoroRecords: PomodoroRecord[] };
  todayPlanTodos: Todo[];
  onNavigate: (page: Page) => void;
}) {
  const today = toDateKey();
  const weekSummary = getWeekSummary(data.todos, data.typeTags, data.pomodoroRecords, getWeekStart());
  const achievementsToday = getAchievementsOn(data.todos, today).length;
  const incompleteTodoCount = data.todos.filter(isIncompleteTodo).length;

  return (
    <section className="page-panel hub-panel">
      <PageTitle eyebrow="案牍" title="待办事项" />
      <div className="todo-hub-summary" aria-label="待办摘要">
        <HubMetric label="今日安排" value={todayPlanTodos.length} />
        <HubMetric label="未完成" value={incompleteTodoCount} />
        <HubMetric label="今日成果" value={achievementsToday} />
        <HubMetric label="本周成果" value={weekSummary.achievementCount} />
      </div>
      <div className="hub-actions">
        <button className="hub-action hub-action-today" type="button" onClick={() => onNavigate('todayPlan')}>
          <CalendarDays size={20} />
          <ArrowUpRight className="hub-action-arrow" size={18} aria-hidden="true" />
          <span>
          今日安排
          </span>
        </button>
        <button className="hub-action hub-action-incomplete" type="button" onClick={() => onNavigate('incomplete')}>
          <ListTodo size={20} />
          <ArrowUpRight className="hub-action-arrow" size={18} aria-hidden="true" />
          <span>
          未完成待办
          </span>
        </button>
        <button className="hub-action hub-action-completed" type="button" onClick={() => onNavigate('completed')}>
          <CheckCircle2 size={20} />
          <ArrowUpRight className="hub-action-arrow" size={18} aria-hidden="true" />
          <span>
          已完成待办
          </span>
        </button>
        <button className="hub-action hub-action-backlog" type="button" onClick={() => onNavigate('backlog')}>
          <Lightbulb size={20} />
          <ArrowUpRight className="hub-action-arrow" size={18} aria-hidden="true" />
          <span>
          灵感池
          </span>
        </button>
        <button className="hub-action hub-action-weekly" type="button" onClick={() => onNavigate('weeklySummary')}>
          <CalendarRange size={20} />
          <ArrowUpRight className="hub-action-arrow" size={18} aria-hidden="true" />
          <span>周总结</span>
        </button>
      </div>
    </section>
  );
}

function HubMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="hub-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
