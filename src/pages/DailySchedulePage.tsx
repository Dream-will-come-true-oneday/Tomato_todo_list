import { Clock3, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageTitle } from '../components/PageTitle';
import {
  getCurrentScheduleItem,
  getNextScheduleItem,
  isValidScheduleTime,
  scheduleTimeToMinutes,
  sortScheduleItems
} from '../domain/dailySchedule';
import { createDefaultDailySchedule } from '../domain/defaultData';
import type { DailyScheduleItem, DailyScheduleSettings } from '../domain/types';
import { shortenUndoTitle } from '../domain/undo';

export default function DailySchedulePage({
  settings,
  onUpdate
}: {
  settings: DailyScheduleSettings;
  onUpdate: (settings: DailyScheduleSettings, undoLabel?: string) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [resetConfirm, setResetConfirm] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sortedItems = useMemo(() => sortScheduleItems(settings.items), [settings.items]);
  const currentItem = useMemo(() => getCurrentScheduleItem(settings.items, now), [now, settings.items]);
  const nextItem = useMemo(() => getNextScheduleItem(settings.items, now), [now, settings.items]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(interval);
  }, []);

  function updateItem(item: DailyScheduleItem, patch: Partial<DailyScheduleItem>) {
    const nextItemValue = { ...item, ...patch };
    if (!isValidScheduleTime(nextItemValue.startTime)) {
      setMessage('开始时间格式不正确');
      return;
    }
    if (
      nextItemValue.endTime &&
      (!isValidScheduleTime(nextItemValue.endTime) ||
        scheduleTimeToMinutes(nextItemValue.endTime) <= scheduleTimeToMinutes(nextItemValue.startTime))
    ) {
      setMessage('结束时间必须晚于开始时间');
      return;
    }
    if (
      nextItemValue.enabled &&
      settings.items.some(
        (candidate) =>
          candidate.id !== item.id && candidate.enabled && candidate.startTime === nextItemValue.startTime
      )
    ) {
      setMessage('该开始时间已有启用的安排');
      return;
    }

    setMessage(null);
    onUpdate({
      ...settings,
      items: sortScheduleItems(settings.items.map((candidate) => (candidate.id === item.id ? nextItemValue : candidate)))
    });
  }

  function addItem() {
    const usedTimes = new Set(settings.items.filter((item) => item.enabled).map((item) => item.startTime));
    let startMinutes = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 5) * 5;
    for (let offset = 0; offset < 24 * 12; offset += 1) {
      const candidateMinutes = (startMinutes + offset * 5) % (24 * 60);
      const candidate = `${Math.floor(candidateMinutes / 60).toString().padStart(2, '0')}:${(candidateMinutes % 60)
        .toString()
        .padStart(2, '0')}`;
      if (usedTimes.has(candidate)) continue;
      const item: DailyScheduleItem = {
        id: `schedule-${crypto.randomUUID()}`,
        startTime: candidate,
        endTime: null,
        title: '新安排',
        rule: '',
        enabled: true
      };
      onUpdate({ ...settings, items: sortScheduleItems([...settings.items, item]) });
      setMessage(null);
      return;
    }
    setMessage('当前没有可用的提醒时间');
  }

  function deleteItem(itemId: string) {
    const target = settings.items.find((item) => item.id === itemId);
    onUpdate(
      { ...settings, items: settings.items.filter((item) => item.id !== itemId) },
      `已删除每日安排「${target?.title ? shortenUndoTitle(target.title) : '未命名安排'}」`
    );
  }

  function restoreDefaults() {
    onUpdate({ ...settings, items: createDefaultDailySchedule().items }, '已恢复默认每日安排');
    setResetConfirm(false);
    setMessage('已恢复默认每日安排');
  }

  function clearAllItems() {
    onUpdate({ ...settings, items: [] }, '已清空全部每日安排');
    setClearConfirm(false);
    setMessage('已清空全部每日安排');
  }

  return (
    <section className="page-panel daily-schedule-page">
      <header className="daily-schedule-header">
        <PageTitle eyebrow="作息" title="每日时间安排" />
        <div className="daily-current-time" aria-label="当前时间">
          <Clock3 size={20} />
          <strong>{now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })}</strong>
          <span>{now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
        </div>
      </header>

      {message && <p className="daily-schedule-message" role="status">{message}</p>}

      <div className="daily-schedule-overview">
        <div>
          <span>当前安排</span>
          <strong>{currentItem?.title ?? '当前没有启用的安排'}</strong>
          <small>{currentItem?.rule || '暂无硬性规则'}</small>
        </div>
        <div>
          <span>下一安排</span>
          <strong>{nextItem?.title ?? '今天没有后续安排'}</strong>
          <small>{nextItem ? `${nextItem.startTime}${nextItem.endTime ? ` - ${nextItem.endTime}` : ' 之后'}` : '-'}</small>
        </div>
      </div>

      <div className="daily-timeline-toolbar">
        <div>
          <h2>今日时间轴</h2>
          <span>{settings.items.length} 项安排</span>
        </div>
        <div>
          <button type="button" onClick={addItem}>
            <Plus size={17} />
            新增安排
          </button>
          <button className="btn-secondary" type="button" onClick={() => setResetConfirm(true)}>
            <RotateCcw size={17} />
            恢复默认
          </button>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => setClearConfirm(true)}
            disabled={settings.items.length === 0}
          >
            <Trash2 size={17} />
            一键清空
          </button>
        </div>
      </div>

      {resetConfirm && (
        <div className="inline-confirmation" role="alert">
          <span>恢复默认安排会替换当前全部时间段，是否继续？</span>
          <button type="button" onClick={restoreDefaults}>确认恢复</button>
          <button className="ghost-button" type="button" onClick={() => setResetConfirm(false)}>取消</button>
        </div>
      )}

      {clearConfirm && (
        <div className="inline-confirmation" role="alert">
          <span>将清空当前全部 {settings.items.length} 项安排且无法撤销，是否继续？</span>
          <button type="button" onClick={clearAllItems}>确认清空</button>
          <button className="ghost-button" type="button" onClick={() => setClearConfirm(false)}>取消</button>
        </div>
      )}

      <div className="daily-timeline">
        {sortedItems.map((item) => (
          <article
            key={item.id}
            className={`daily-timeline-item${currentItem?.id === item.id ? ' current' : ''}${item.enabled ? '' : ' disabled'}`}
          >
            <div className="daily-time-marker">
              <strong>{item.startTime}</strong>
              <span>{item.endTime ? item.endTime : '之后'}</span>
              <i aria-hidden="true" />
            </div>
            <div className="daily-item-fields">
              <label>
                开始
                <input
                  type="time"
                  aria-label={`${item.title || '未命名安排'} 开始时间`}
                  value={item.startTime}
                  onChange={(event) => updateItem(item, { startTime: event.target.value })}
                />
              </label>
              <label>
                结束
                <input
                  type="time"
                  aria-label={`${item.title || '未命名安排'} 结束时间`}
                  value={item.endTime ?? ''}
                  onChange={(event) => updateItem(item, { endTime: event.target.value || null })}
                />
              </label>
              <label className="daily-title-field">
                标题
                <input
                  aria-label={`${item.startTime} 安排标题`}
                  value={item.title}
                  onChange={(event) => updateItem(item, { title: event.target.value })}
                  onBlur={() => {
                    if (!item.title.trim()) updateItem(item, { title: '未命名安排' });
                  }}
                />
              </label>
              <label className="daily-rule-field">
                硬性规则
                <input
                  aria-label={`${item.title || item.startTime} 硬性规则`}
                  value={item.rule}
                  onChange={(event) => updateItem(item, { rule: event.target.value })}
                />
              </label>
              <label className="toggle-row daily-item-toggle">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(event) => updateItem(item, { enabled: event.target.checked })}
                />
                提醒
              </label>
              <button
                className="icon-button danger-icon"
                type="button"
                title={`删除 ${item.title || '未命名安排'}`}
                aria-label={`删除安排 ${item.title || '未命名安排'}`}
                onClick={() => deleteItem(item.id)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
        {sortedItems.length === 0 && <p className="empty-state">尚未添加每日安排。</p>}
      </div>
    </section>
  );
}
