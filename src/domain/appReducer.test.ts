import { describe, expect, it } from 'vitest';
import { createDefaultAppData } from './defaultData';
import { appReducer } from './appReducer';

describe('appReducer', () => {
  it('increments a todo Pomodoro count when a linked focus session completes', () => {
    const data = createDefaultAppData();
    const todoId = data.todos[0].id;

    const next = appReducer(data, {
      type: 'completeFocusSession',
      todoId,
      startedAt: new Date('2026-07-16T08:00:00.000Z'),
      endedAt: new Date('2026-07-16T08:25:00.000Z'),
      actualElapsedSeconds: 1500,
      completionType: 'completed'
    });

    expect(next.todos[0].pomodoroCount).toBe(1);
    expect(next.pomodoroRecords[0].todoId).toBe(todoId);
  });

  it('records a temporary Pomodoro without incrementing any todo', () => {
    const data = createDefaultAppData();

    const next = appReducer(data, {
      type: 'completeFocusSession',
      todoId: null,
      startedAt: new Date('2026-07-16T08:00:00.000Z'),
      endedAt: new Date('2026-07-16T08:25:00.000Z'),
      actualElapsedSeconds: 1500,
      completionType: 'completed'
    });

    expect(next.todos[0].pomodoroCount).toBe(0);
    expect(next.pomodoroRecords[0].todoId).toBeNull();
  });
});
