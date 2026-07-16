import { describe, expect, it } from 'vitest';
import type { TimerPreset } from './types';
import { createPomodoroRecord, getNextPhase } from './pomodoro';

const preset: TimerPreset = {
  id: 'preset-study',
  name: '学习',
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
  autoStartNextPhase: false
};

describe('pomodoro helpers', () => {
  it('creates a completed temporary Pomodoro record without a todo id', () => {
    const record = createPomodoroRecord({
      preset,
      todoId: null,
      startedAt: new Date('2026-07-16T08:00:00.000Z'),
      endedAt: new Date('2026-07-16T08:25:00.000Z'),
      actualElapsedSeconds: 1500,
      completionType: 'completed'
    });

    expect(record.todoId).toBeNull();
    expect(record.plannedFocusMinutes).toBe(25);
    expect(record.completionType).toBe('completed');
  });

  it('uses a long break after the configured interval', () => {
    expect(getNextPhase(3, preset)).toBe('shortBreak');
    expect(getNextPhase(4, preset)).toBe('longBreak');
  });
});
