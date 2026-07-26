import { fireEvent, render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimerPanel from './TimerPanel';
import type { TimerPreset } from '../domain/types';

const preset: TimerPreset = {
  id: 'preset-fast-test',
  name: 'Fast test',
  focusMinutes: 1,
  shortBreakMinutes: 1,
  longBreakMinutes: 1,
  longBreakInterval: 4,
  autoStartNextPhase: false,
  soundEnabled: false
};

describe('TimerPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives remaining time from the real deadline instead of interval tick count', () => {
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    act(() => {
      vi.setSystemTime(new Date('2026-07-21T00:00:45.000Z'));
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByText('00:15')).toBeTruthy();
  });

  it('records a completed focus session with the planned elapsed seconds', () => {
    const onSessionComplete = vi.fn();
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={onSessionComplete} />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    expect(onSessionComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        actualElapsedSeconds: 60,
        completionType: 'completed'
      })
    );
    expect(screen.getByText('00:00')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('专注完成，可以休息一下了');
    expect(screen.getByRole('button', { name: /开始休息/ })).toBeTruthy();
  });

  it('can automatically start the next phase after reminding', () => {
    render(<TimerPanel preset={{ ...preset, autoStartNextPhase: true }} selectedTodo={null} onSessionComplete={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('短休')).toBeTruthy();
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();
  });
});
