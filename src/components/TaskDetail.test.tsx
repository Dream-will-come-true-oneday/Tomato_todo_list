import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PomodoroRecord, Todo } from '../domain/types';
import TaskDetail from './TaskDetail';

const todo: Todo = {
  id: 'todo-1',
  title: '写报告',
  notes: '',
  status: 'notStarted',
  priority: 'medium',
  parentId: null,
  term: 'short',
  urgencyTags: [],
  typeTagIds: [],
  startAt: '2026-07-16',
  dueAt: null,
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
  completedAt: null,
  pomodoroCount: 0
};

const records: PomodoroRecord[] = [
  {
    id: 'record-1',
    todoId: 'todo-1',
    presetId: 'preset-study',
    startedAt: '2026-07-16T08:00:00.000Z',
    endedAt: '2026-07-16T08:25:00.000Z',
    plannedFocusMinutes: 25,
    actualElapsedSeconds: 1500,
    completionType: 'completed'
  },
  {
    id: 'record-2',
    todoId: 'todo-1',
    presetId: 'preset-study',
    startedAt: '2026-07-16T09:00:00.000Z',
    endedAt: '2026-07-16T09:03:00.000Z',
    plannedFocusMinutes: 25,
    actualElapsedSeconds: 180,
    completionType: 'reset'
  }
];

describe('TaskDetail', () => {
  it('uses date-only fields for todo start and due dates', () => {
    const onSave = vi.fn();
    render(<TaskDetail todo={todo} records={[]} onSave={onSave} />);

    const startInput = screen.getByLabelText('开始时间') as HTMLInputElement;
    const dueInput = screen.getByLabelText('截止时间') as HTMLInputElement;

    expect(startInput.type).toBe('date');
    expect(startInput.value).toBe('2026-07-16');

    fireEvent.change(dueInput, { target: { value: '2026-07-20' } });

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dueAt: '2026-07-20' }));
  });

  it('offers not started as a todo status', () => {
    render(<TaskDetail todo={todo} records={[]} onSave={vi.fn()} />);

    expect(screen.getByRole('option', { name: '未开始' })).toBeTruthy();
    expect((screen.getByLabelText('状态') as HTMLSelectElement).value).toBe('notStarted');
  });

  it('shows only successfully completed Pomodoro records in task detail', () => {
    render(<TaskDetail todo={todo} records={records} onSave={vi.fn()} />);

    expect(screen.getByText('完成')).toBeTruthy();
    expect(screen.queryByText('重置')).toBeNull();
  });
});
