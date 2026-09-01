import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toDateKey } from '../domain/todoFilters';

const POPUP_WIDTH = 280;
const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DatePicker({
  value,
  onChange,
  clearable = true,
  ariaLabel
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  clearable?: boolean;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
  const [focusedDate, setFocusedDate] = useState<Date>(() => new Date());
  const [position, setPosition] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);

  const today = new Date();
  const selectedKey = value;
  const focusedKey = toDateKey(focusedDate);

  function openPopup() {
    const base = value ? parseDateKey(value) : new Date();
    setView({ year: base.getFullYear(), month: base.getMonth() });
    setFocusedDate(base);
    setOpen(true);
  }

  function closePopup(refocus = true) {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }

  function selectDate(key: string) {
    onChange(key);
    closePopup();
  }

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - POPUP_WIDTH - 8));
    setPosition({ left, top: rect.bottom + 6 });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const popup = popupRef.current;
    const trigger = triggerRef.current;
    if (!popup || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    const height = popup.offsetHeight;
    if (rect.bottom + 6 + height > window.innerHeight && rect.top - height - 6 >= 8) {
      setPosition((current) => ({ ...current, top: rect.top - height - 6 }));
    }
  });

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && popupRef.current?.contains(target)) return;
      if (target instanceof Node && triggerRef.current?.contains(target)) return;
      closePopup(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dayButton = popupRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focusedKey}"]`);
    dayButton?.focus();
  }, [open, focusedKey, view.year, view.month]);

  function moveFocusedDate(days: number) {
    const next = addDays(focusedDate, days);
    if (next.getFullYear() !== view.year || next.getMonth() !== view.month) {
      setView({ year: next.getFullYear(), month: next.getMonth() });
    }
    setFocusedDate(next);
  }

  function handleGridKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePopup();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveFocusedDate(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveFocusedDate(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveFocusedDate(-7);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveFocusedDate(7);
    }
  }

  const firstWeekdayOffset = (new Date(view.year, view.month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const monthLabel = `${view.year} 年 ${view.month + 1} 月`;

  function shiftMonth(delta: number) {
    const next = new Date(view.year, view.month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
    const monthEnd = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    setFocusedDate((current) => {
      const day = Math.min(current.getDate(), monthEnd);
      return new Date(next.getFullYear(), next.getMonth(), day);
    });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={value ? 'date-picker-trigger has-value' : 'date-picker-trigger'}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? closePopup() : openPopup())}
      >
        {value ?? '未设置'}
      </button>
      {open &&
        createPortal(
          <div
            ref={popupRef}
            className="date-picker-popup"
            role="dialog"
            aria-label={`${ariaLabel} 日历`}
            style={{ left: position.left, top: position.top, width: POPUP_WIDTH }}
            onKeyDown={handleGridKeyDown}
          >
            <div className="date-picker-header">
              <button type="button" aria-label="上一月" onClick={() => shiftMonth(-1)}>
                <ChevronLeft size={16} />
              </button>
              <strong>{monthLabel}</strong>
              <button type="button" aria-label="下一月" onClick={() => shiftMonth(1)}>
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="date-picker-weekdays" aria-hidden="true">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="date-picker-grid">
              {Array.from({ length: firstWeekdayOffset }, (_, index) => (
                <span key={`blank-${index}`} className="date-picker-day is-empty" />
              ))}
              {Array.from({ length: daysInMonth }, (_, index) => {
                const dayDate = new Date(view.year, view.month, index + 1);
                const key = toDateKey(dayDate);
                const isSelected = selectedKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    data-date={key}
                    className={[
                      'date-picker-day',
                      isSelected ? 'is-selected' : '',
                      isSameDay(dayDate, today) ? 'is-today' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-label={`选择 ${key}`}
                    aria-pressed={isSelected}
                    onClick={() => selectDate(key)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            {clearable && (
              <div className="date-picker-footer">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    onChange(null);
                    closePopup();
                  }}
                >
                  清除
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
