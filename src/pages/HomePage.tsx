import heroImage from '../assets/longchang-awakening-hero.png';
import type { Page } from '../lib/navigation';

export type HomeOverview = {
  todayTodoCount: number;
  todayPomodoroCount: number;
  currentScheduleItem: { startTime: string; title: string } | null;
};

export default function HomePage({ overview, onNavigate }: { overview: HomeOverview; onNavigate: (page: Page) => void }) {
  return (
    <section
      className="hero-page"
      style={{ backgroundImage: `linear-gradient(90deg, rgba(43, 28, 16, 0.18), rgba(43, 28, 16, 0.04)), url(${heroImage})` }}
    >
      <nav className="hero-nav" aria-label="首页导航">
        <button type="button" onClick={() => onNavigate('pomodoro')}>
          番茄钟
        </button>
        <button type="button" onClick={() => onNavigate('todoHub')}>
          待办事项
        </button>
      </nav>
      <div className="hero-copy">
        <p>龙场静修</p>
        <h1>知行合一</h1>
        <span>一念收束，一事笃行</span>
      </div>
      <div className="home-overview" aria-label="今日概览">
        <div className="metric-card home-metric">
          <span>今日待办</span>
          <strong>{overview.todayTodoCount} 项</strong>
        </div>
        <div className="metric-card home-metric">
          <span>今日番茄</span>
          <strong>{overview.todayPomodoroCount} 个</strong>
        </div>
        <div className="metric-card home-metric">
          <span>当前时段</span>
          {overview.currentScheduleItem ? (
            <strong>
              {overview.currentScheduleItem.title}
              <small>{overview.currentScheduleItem.startTime} 起</small>
            </strong>
          ) : (
            <strong>暂无安排</strong>
          )}
        </div>
      </div>
    </section>
  );
}
