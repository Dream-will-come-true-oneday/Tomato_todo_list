import type { Todo } from '../../domain/types';
import { getTodoTypeTags, type TypeTagView } from '../../lib/todoView';

export function TypeTagBadges({ todo, typeTags }: { todo: Todo; typeTags: TypeTagView[] }) {
  const tags = getTodoTypeTags(todo, typeTags);
  if (tags.length === 0) return <span className="empty-inline">无</span>;

  return (
    <div className="type-tag-badges">
      {tags.map((tag) => (
        <span key={tag.id} style={{ borderColor: tag.color }}>
          <i style={{ backgroundColor: tag.color }} />
          {tag.name}
        </span>
      ))}
    </div>
  );
}
