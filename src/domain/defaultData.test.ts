import { describe, expect, it } from 'vitest';
import { createDefaultAppData } from './defaultData';

describe('createDefaultAppData', () => {
  it('creates versioned app data with multiple timer presets', () => {
    const data = createDefaultAppData();

    expect(data.version).toBe(1);
    expect(data.presets.length).toBeGreaterThanOrEqual(4);
    expect(data.activePresetId).toBe(data.presets[0].id);
    expect(data.presets[0]).toMatchObject({
      name: '学习',
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakInterval: 4
    });
  });

  it('creates todos that support optional start and due times', () => {
    const data = createDefaultAppData();

    expect(data.todos[0]).toHaveProperty('startAt');
    expect(data.todos[0]).toHaveProperty('dueAt');
    expect(data.todos[0].status).toBe('notStarted');
    expect(data.todos[0].pomodoroCount).toBe(0);
  });
});
