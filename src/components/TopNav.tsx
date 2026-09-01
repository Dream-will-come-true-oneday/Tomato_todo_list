import { CalendarRange, Clock3, Home, ListTodo } from 'lucide-react';
import type { Page } from '../pages/types';

export function TopNav({ page, onNavigate }: { page: Page; onNavigate: (page: Page) => void }) {
  return (
    <nav className="top-nav" aria-label="主导航">
      <button className={page === 'home' ? 'nav-link active' : 'nav-link'} type="button" aria-current={page === 'home' ? 'page' : undefined} onClick={() => onNavigate('home')}>
        <Home size={17} />
        首页
      </button>
      <button
        className={page === 'pomodoro' ? 'nav-link active' : 'nav-link'}
        type="button"
        aria-current={page === 'pomodoro' ? 'page' : undefined}
        onClick={() => onNavigate('pomodoro')}
      >
        <Clock3 size={17} />
        番茄钟
      </button>
      <button
        className={page === 'dailySchedule' ? 'nav-link active' : 'nav-link'}
        type="button"
        aria-current={page === 'dailySchedule' ? 'page' : undefined}
        onClick={() => onNavigate('dailySchedule')}
      >
        <CalendarRange size={17} />
        每日安排
      </button>
      <button
        className={page !== 'pomodoro' && page !== 'dailySchedule' && page !== 'home' ? 'nav-link active' : 'nav-link'}
        type="button"
        aria-current={page !== 'pomodoro' && page !== 'dailySchedule' && page !== 'home' ? 'page' : undefined}
        onClick={() => onNavigate('todoHub')}
      >
        <ListTodo size={17} />
        待办事项
      </button>
    </nav>
  );
}
