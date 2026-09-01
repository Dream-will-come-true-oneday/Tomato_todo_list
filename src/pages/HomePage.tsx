import heroImage from '../assets/longchang-awakening-hero.png';
import type { Page } from './types';

export default function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <section className="hero-page" style={{ backgroundImage: `linear-gradient(90deg, rgba(43, 28, 16, 0.18), rgba(43, 28, 16, 0.04)), url(${heroImage})` }}>
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
    </section>
  );
}
