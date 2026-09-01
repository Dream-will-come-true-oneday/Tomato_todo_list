import { Archive, CheckCircle2, Plus, Send, Sparkles, Tag, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import inspirationFountainImage from '../assets/inspiration-cupid-fountain.png';
import { PageTitle } from '../components/PageTitle';
import type { BacklogItem, InspirationTag } from '../domain/types';
import { currentIso } from '../lib/dateUtils';
import type { Page } from '../lib/navigation';

export default function BacklogPage({
  items,
  tags,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAddTag,
  onDeleteTag,
  onNavigate
}: {
  items: BacklogItem[];
  tags: InspirationTag[];
  onAddItem: (title: string) => void;
  onUpdateItem: (item: BacklogItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddTag: (name: string, color: string) => void;
  onDeleteTag: (tagId: string) => void;
  onNavigate: (page: Page) => void;
}) {
  const [title, setTitle] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#315f4d');
  const [fountainAnimation, setFountainAnimation] = useState<'envelope' | 'glow' | null>(null);
  const [pendingDeleteTagId, setPendingDeleteTagId] = useState<string | null>(null);
  const [blockedDeleteTagId, setBlockedDeleteTagId] = useState<string | null>(null);
  const [completionBlockedItem, setCompletionBlockedItem] = useState<BacklogItem | null>(null);
  const [tagFocusItemId, setTagFocusItemId] = useState<string | null>(null);
  const animationTimer = useRef<number | null>(null);
  const activeItems = items.filter((item) => item.status === 'active');
  const groupedItems = [
    { id: null, name: '待分类', color: '#74634f', items: activeItems.filter((item) => !item.tagId) },
    ...tags.map((tag) => ({ ...tag, items: activeItems.filter((item) => item.tagId === tag.id) }))
  ].filter((group) => group.items.length > 0);

  useEffect(() => {
    return () => {
      if (animationTimer.current) window.clearTimeout(animationTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!tagFocusItemId) return;
    document.getElementById(`inspiration-tag-${tagFocusItemId}`)?.focus();
    setTagFocusItemId(null);
  }, [tagFocusItemId]);

  function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  function playFountainAnimation(animation: 'envelope' | 'glow') {
    if (prefersReducedMotion()) return;
    if (animationTimer.current) window.clearTimeout(animationTimer.current);
    setFountainAnimation(null);
    window.requestAnimationFrame(() => setFountainAnimation(animation));
    animationTimer.current = window.setTimeout(() => setFountainAnimation(null), 1250);
  }

  function addItem() {
    const trimmed = title.trim();
    if (!trimmed) return;
    onAddItem(trimmed);
    setTitle('');
    playFountainAnimation('envelope');
  }

  function addTag() {
    const trimmed = tagName.trim();
    if (!trimmed || tags.some((tag) => tag.name === trimmed)) return;
    onAddTag(trimmed, tagColor);
    setTagName('');
  }

  function deleteTag(tagId: string) {
    if (items.some((item) => item.tagId === tagId)) {
      setBlockedDeleteTagId(tagId);
      setPendingDeleteTagId(null);
      return;
    }
    onDeleteTag(tagId);
    setPendingDeleteTagId(null);
  }

  function completeItem(item: BacklogItem) {
    const hasValidTag = Boolean(item.tagId && tags.some((tag) => tag.id === item.tagId));
    if (!hasValidTag) {
      setCompletionBlockedItem(item);
      return;
    }
    onUpdateItem({ ...item, status: 'completed', updatedAt: currentIso() });
    playFountainAnimation('glow');
  }

  return (
    <section className="page-panel table-page">
      <div className="backlog-page-heading">
        <PageTitle eyebrow="待思" title="灵感池" />
        <button className="btn-secondary" type="button" onClick={() => onNavigate('completedBacklog')}>
          <Archive size={17} />
          已完成灵感
        </button>
      </div>
      <InspirationFountain animation={fountainAnimation} />
      <div className="toolbar">
        <input
          aria-label="新增灵感"
          placeholder="记录事情或问题"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addItem();
          }}
        />
        <button type="button" onClick={addItem}>
          <Plus size={17} />
          新增
        </button>
      </div>
      <div className="toolbar tag-toolbar inspiration-tag-toolbar">
        <input aria-label="新灵感标签名" placeholder="新增灵感标签" value={tagName} onChange={(event) => setTagName(event.target.value)} />
        <input aria-label="灵感标签颜色" type="color" value={tagColor} onChange={(event) => setTagColor(event.target.value)} />
        <button type="button" onClick={addTag}>
          <Tag size={17} />
          加标签
        </button>
      </div>
      <div className="type-tag-library inspiration-tag-library" aria-label="灵感标签库">
        <span>灵感标签</span>
        {tags.length === 0 && <em>暂无标签，可先记录后分类。</em>}
        {tags.map((tag) => {
          const usageCount = items.filter((item) => item.tagId === tag.id).length;
          const isConfirming = pendingDeleteTagId === tag.id;
          const isBlocked = blockedDeleteTagId === tag.id;
          return (
            <div key={tag.id} className={isConfirming ? 'type-tag-chip confirming' : 'type-tag-chip'} style={{ borderColor: tag.color }}>
              <span className="type-tag-chip-name"><i style={{ backgroundColor: tag.color }} />{tag.name}</span>
              <small>{usageCount} 项</small>
              {isBlocked ? (
                <>
                  <small className="type-tag-delete-blocked">仍有灵感使用此标签，无法删除。</small>
                  <button className="ghost-button" type="button" onClick={() => setBlockedDeleteTagId(null)}>知道了</button>
                </>
              ) : isConfirming ? (
                <>
                  <button className="danger-button" type="button" onClick={() => deleteTag(tag.id)}>确认删除</button>
                  <button className="ghost-button" type="button" onClick={() => setPendingDeleteTagId(null)}>取消</button>
                </>
              ) : (
                <button className="danger-button icon-button" type="button" onClick={() => setPendingDeleteTagId(tag.id)} aria-label={`准备删除灵感标签 ${tag.name}`} title={`删除 ${tag.name}`}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="inspiration-groups">
        {groupedItems.map((group) => (
          <section className="inspiration-group" key={group.id ?? 'unclassified'}>
            <div className="inspiration-group-heading">
              <span style={{ backgroundColor: group.color }} />
              <h2>{group.name}</h2>
              <small>{group.items.length} 项</small>
            </div>
            <div className="backlog-table">
              {group.items.map((item) => (
                <div className="backlog-row inspiration-row" key={item.id}>
                  <button className="inspiration-complete-button" type="button" onClick={() => completeItem(item)} aria-label={`完成灵感 ${item.title}`} title="标记为已完成">
                    <CheckCircle2 size={18} />
                  </button>
                  <input aria-label={`${item.title} 内容`} value={item.title} onChange={(event) => onUpdateItem({ ...item, title: event.target.value, updatedAt: currentIso() })} />
                  <select id={`inspiration-tag-${item.id}`} aria-label={`${item.title} 灵感标签`} value={item.tagId ?? ''} onChange={(event) => onUpdateItem({ ...item, tagId: event.target.value || null, updatedAt: currentIso() })}>
                    <option value="">待分类</option>
                    {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                  </select>
                  <button className="ghost-button icon-button" type="button" onClick={() => onDeleteItem(item.id)} aria-label={`删除 ${item.title}`}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </section>
        ))}
        {activeItems.length === 0 && <p className="empty-state table-empty">灵感池暂时为空，写下一条新的想法吧。</p>}
      </div>
      {completionBlockedItem && (
        <div className="completion-dialog-backdrop" role="presentation">
          <section className="completion-dialog" role="alertdialog" aria-modal="true" aria-labelledby="inspiration-completion-dialog-title">
            <h2 id="inspiration-completion-dialog-title">完成前请选择灵感标签</h2>
            <p>“{completionBlockedItem.title}”尚未分类，无法归档为已完成灵感。</p>
            <div className="completion-dialog-actions">
              <button className="ghost-button" type="button" onClick={() => setCompletionBlockedItem(null)}>取消</button>
              <button type="button" onClick={() => { setTagFocusItemId(completionBlockedItem.id); setCompletionBlockedItem(null); }}>前往选择标签</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function InspirationFountain({ animation }: { animation: 'envelope' | 'glow' | null }) {
  return (
    <div
      className={`inspiration-fountain${animation ? ` animation-${animation}` : ''}`}
      data-testid="inspiration-fountain"
      aria-hidden="true"
    >
      <img className="fountain-photo" src={inspirationFountainImage} alt="" />
      <div className="fountain-photo-vignette" />
      <div className="pool-ambient-shimmer">
        <span />
        <span />
      </div>
      <span className="water-ripple ripple-one" />
      <span className="water-ripple ripple-two" />
      <div className="fountain-completion-glow" />
      <div className="fountain-sparkles">
        <i /><i /><i /><i />
      </div>
      <div className="inspiration-envelope">
        <Send size={20} fill="currentColor" strokeWidth={1.8} />
        <Sparkles className="envelope-sparkle" size={18} />
      </div>
    </div>
  );
}
