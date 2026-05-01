import { describe, expect, it, vi } from 'vitest';
import { createDefaultAppData } from './defaultData';
import { loadAppData, saveAppData } from './storage';

describe('storage', () => {
  it('loads v3 defaults when storage is empty', () => {
    const storage = new Map<string, string>();
    const getItem = vi.fn((key: string) => storage.get(key) ?? null);

    const result = loadAppData({ getItem } as unknown as Storage);

    expect(result.data.version).toBe(3);
    expect(result.recovered).toBe(false);
  });

  it('recovers to v3 defaults when stored JSON is invalid', () => {
    const getItem = vi.fn(() => '{bad json');

    const result = loadAppData({ getItem } as unknown as Storage);

    expect(result.data.version).toBe(3);
    expect(result.recovered).toBe(true);
  });

  it('migrates old todos by filling new v3 fields', () => {
    const base = createDefaultAppData();
    const stored = {
      ...base,
      version: 1,
      typeTags: undefined,
      reflections: undefined,
      backlogItems: undefined,
      todayPlans: undefined,
      presets: base.presets.map(({ soundEnabled: _soundEnabled, ...preset }) => preset),
      todos: [
        {
          id: 'todo-old',
          title: '旧待办',
          notes: '',
          status: 'active',
          priority: 'high',
          startAt: '2026-07-17T08:00:00.000Z',
          dueAt: '2026-07-17T18:00:00.000Z',
          createdAt: '2026-07-16T00:00:00.000Z',
          updatedAt: '2026-07-16T00:00:00.000Z',
          completedAt: null,
          pomodoroCount: 0
        }
      ]
    };
    const getItem = vi.fn(() => JSON.stringify(stored));

    const result = loadAppData({ getItem } as unknown as Storage);

    expect(result.recovered).toBe(false);
    expect(result.data.version).toBe(3);
    expect(result.data.todos[0]).toMatchObject({
      parentId: null,
      term: 'short',
      urgencyTags: [],
      typeTagIds: [],
      startAt: '2026-07-17',
      dueAt: '2026-07-17'
    });
    expect(result.data.presets[0].soundEnabled).toBe(true);
    expect(result.data.todayPlans).toEqual({});
    expect(result.data.weeklyReflections).toEqual([]);
  });

  it('saves app data as JSON', () => {
    const setItem = vi.fn();
    const data = createDefaultAppData();

    saveAppData(data, { setItem } as unknown as Storage);

    expect(setItem).toHaveBeenCalledWith('pomodoro-todo-app:v1', JSON.stringify(data));
  });
});
