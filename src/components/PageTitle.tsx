import { ScrollText } from 'lucide-react';

export function PageTitle({ eyebrow, title, compact = false }: { eyebrow: string; title: string; compact?: boolean }) {
  return (
    <div className={compact ? 'page-title compact' : 'page-title'}>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      <ScrollText size={compact ? 18 : 24} />
    </div>
  );
}
