import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DatePicker } from './DatePicker';
import { toDateKey } from '../domain/todoFilters';

function DatePickerHarness({
  clearable = true,
  onChange
}: {
  clearable?: boolean;
  onChange: (value: string | null) => void;
}) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <DatePicker
      ariaLabel="测试日期"
      value={value}
      clearable={clearable}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('DatePicker', () => {
  it('opens a calendar popup and selects a date through it', () => {
    const selections: (string | null)[] = [];
    render(<DatePickerHarness onChange={(next) => selections.push(next)} />);

    const trigger = screen.getByRole('button', { name: '测试日期' });
    expect(trigger.textContent).toBe('未设置');

    fireEvent.click(trigger);
    const popup = screen.getByRole('dialog', { name: '测试日期 日历' });
    expect(popup).toBeTruthy();

    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth(), 15);
    const dayButton = screen.getByRole('button', { name: `选择 ${toDateKey(target)}` });
    fireEvent.click(dayButton);

    expect(selections).toEqual([toDateKey(target)]);
    expect(trigger.textContent).toBe(toDateKey(target));
    expect(screen.queryByRole('dialog', { name: '测试日期 日历' })).toBeNull();
  });

  it('clears the value when clearable and omits the clear action otherwise', () => {
    const selections: (string | null)[] = [];
    const { rerender } = render(<DatePickerHarness onChange={(next) => selections.push(next)} />);

    fireEvent.click(screen.getByRole('button', { name: '测试日期' }));
    fireEvent.click(screen.getByRole('button', { name: '清除' }));
    expect(selections).toEqual([null]);

    rerender(<DatePickerHarness clearable={false} onChange={(next) => selections.push(next)} />);
    fireEvent.click(screen.getByRole('button', { name: '测试日期' }));
    expect(screen.queryByRole('button', { name: '清除' })).toBeNull();
  });

  it('closes on Escape and moves the focused day with arrow keys', () => {
    render(<DatePickerHarness onChange={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: '测试日期' }));
    const today = new Date();
    const todayButton = screen.getByRole('button', { name: `选择 ${toDateKey(today)}` });
    expect(document.activeElement).toBe(todayButton);

    fireEvent.keyDown(screen.getByRole('dialog', { name: '测试日期 日历' }), { key: 'ArrowRight' });
    expect(document.activeElement?.getAttribute('aria-label')).toBe(`选择 ${toDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))}`);

    fireEvent.keyDown(screen.getByRole('dialog', { name: '测试日期 日历' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '测试日期 日历' })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '测试日期' }));
  });
});
