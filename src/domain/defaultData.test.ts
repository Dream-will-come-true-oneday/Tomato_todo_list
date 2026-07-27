import { describe, expect, it } from 'vitest';
import { createDefaultAppData } from './defaultData';

describe('createDefaultAppData', () => {
  it('creates v6 app data with timer presets and planning collections', () => {
    const data = createDefaultAppData();

    expect(data.version).toBe(6);
    expect(data.presets.length).toBeGreaterThanOrEqual(4);
    expect(data.activePresetId).toBe(data.presets[0].id);
    expect(data.presets[0]).toMatchObject({
      name: '静读',
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakInterval: 4,
      soundEnabled: true
    });
    expect(data.typeTags.length).toBeGreaterThan(0);
    expect(data.reflections).toEqual([]);
    expect(data.backlogItems).toEqual([]);
    expect(data.inspirationTags).toEqual([]);
    expect(data.todayPlans).toEqual({});
    expect(data.weeklyReflections).toEqual([]);
  });

  it('creates todos with hierarchy, term, urgency, custom tag and date-only fields', () => {
    const data = createDefaultAppData();

    expect(data.todos[0]).toMatchObject({
      parentId: null,
      term: 'short',
      urgencyTags: [],
      typeTagIds: [],
      startAt: null,
      dueAt: null,
      status: 'notStarted',
      pomodoroCount: 0,
      checkInDates: []
    });
  });
});
