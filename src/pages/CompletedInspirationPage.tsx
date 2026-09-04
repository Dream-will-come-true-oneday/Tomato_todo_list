import { CheckCircle2, Eye } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PageTitle } from '../components/PageTitle';
import type { BacklogItem, InspirationTag } from '../domain/types';
import { currentIso } from '../lib/dateUtils';
import type { Page } from '../lib/navigation';

export default function CompletedInspirationPage({
  items,
  tags,
  onUpdateItem,
  onNavigate
}: {
  items: BacklogItem[];
  tags: InspirationTag[];
  onUpdateItem: (item: BacklogItem) => void;
  onNavigate: (page: Page) => void;
}) {
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const completedItems = items.filter((item) => item.status === 'completed');
  const detailItem = completedItems.find((item) => item.id === detailItemId) ?? null;
  const groupedItems = tags
    .map((tag) => ({ ...tag, items: completedItems.filter((item) => item.tagId === tag.id) }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="page-panel table-page completed-inspiration-page">
      <div className="backlog-page-heading">
        <PageTitle eyebrow="已悟" title="已完成灵感" />
        <button className="ghost-button" type="button" onClick={() => onNavigate('backlog')}>返回灵感池</button>
      </div>
      {completedItems.length === 0 ? (
        <p className="empty-state table-empty">还没有已完成灵感。</p>
      ) : (
        <div className="inspiration-groups">
          {groupedItems.map((group) => (
            <section className="inspiration-group" key={group.id}>
              <div className="inspiration-group-heading"><span style={{ backgroundColor: group.color }} /><h2>{group.name}</h2><small>{group.items.length} 项</small></div>
              <div className="completed-inspiration-list">
                {group.items.map((item) => (
                  <div className="completed-inspiration-item" key={item.id}>
                    <CheckCircle2 size={18} aria-hidden="true" />
                    <strong>{item.title}</strong>
                    <button className="ghost-button" type="button" onClick={() => setDetailItemId(item.id)}><Eye size={17} />查看详情</button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {detailItem && (
        <InspirationDetailDialog
          key={detailItem.id}
          item={detailItem}
          onClose={() => setDetailItemId(null)}
          onUpdateItem={onUpdateItem}
          onReopen={() => {
            onUpdateItem({ ...detailItem, status: 'active', updatedAt: currentIso() });
            setDetailItemId(null);
          }}
        />
      )}
    </section>
  );
}

function InspirationDetailDialog({ item, onClose, onUpdateItem, onReopen }: { item: BacklogItem; onClose: () => void; onUpdateItem: (item: BacklogItem) => void; onReopen: () => void }) {
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  return (
    <div className="completion-dialog-backdrop" role="presentation">
      <section className="inspiration-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="inspiration-detail-title">
        <header>
          <div><p className="eyebrow">完成灵感</p><h2 id="inspiration-detail-title">查看详情</h2></div>
          <button className="ghost-button icon-button" type="button" onClick={onClose} aria-label="关闭详情">×</button>
        </header>
        <div className="inspiration-detail-grid">
          <aside><span>灵感标题</span><strong>{item.title}</strong></aside>
          <section>
            <div className="detail-editor-heading"><span>完成细节</span><div><button className={view === 'edit' ? 'detail-tab active' : 'detail-tab'} type="button" onClick={() => setView('edit')}>编辑</button><button className={view === 'preview' ? 'detail-tab active' : 'detail-tab'} type="button" onClick={() => setView('preview')}>预览</button></div></div>
            {view === 'edit' ? (
              <textarea aria-label={`${item.title} 完成细节`} placeholder="支持 Markdown：标题、列表、引用、代码块和链接" value={item.completionDetails} onChange={(event) => onUpdateItem({ ...item, completionDetails: event.target.value, updatedAt: currentIso() })} />
            ) : (
              <div className="markdown-preview">{item.completionDetails.trim() ? <ReactMarkdown>{item.completionDetails}</ReactMarkdown> : <p>暂无完成细节。</p>}</div>
            )}
          </section>
        </div>
        <footer><button className="ghost-button" type="button" onClick={onReopen}>重新打开</button><button type="button" onClick={onClose}>完成</button></footer>
      </section>
    </div>
  );
}
