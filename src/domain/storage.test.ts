import { describe, expect, it, vi } from 'vitest';
import { createDefaultAppData } from './defaultData';
import { loadAppData, saveAppData } from './storage';

describe('storage', () => {
  it('loads v4 defaults when storage is empty', () => {
    const storage = new Map<string, string>();
    const getItem = vi.fn((key: string) => storage.get(key) ?? null);

    const result = loadAppData({ getItem } as unknown as Storage);

    expect(result.data.version).toBe(4);
    expect(result.recovered).toBe(false);
  });

  it('recovers to v4 defaults when stored JSON is invalid', () => {
    const getItem = vi.fn(() => '{bad json');

    const result = loadAppData({ getItem } as unknown as Storage);

    expect(result.data.version).toBe(4);
    expect(result.recovered).toBe(true);
  });

  it('migrates old todos by filling new v4 fields', () => {
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
    expect(result.data.version).toBe(4);
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

  it('adds the IT tag to completed tasks that have no valid type tag', () => {
    const base = createDefaultAppData();
    const stored = {
      ...base,
      version: 3,
      todos: [
        {
          ...base.todos[0],
          status: 'completed',
          completedAt: '2026-07-26T08:00:00.000Z',
          typeTagIds: []
        }
      ]
    };
    const result = loadAppData({ getItem: vi.fn(() => JSON.stringify(stored)) } as unknown as Storage);
    const itTag = result.data.typeTags.find((tag) => tag.name === 'IT');

    expect(itTag).toBeDefined();
    expect(result.data.todos[0].typeTagIds).toEqual([itTag!.id]);
  });

  it('keeps compatible legacy data when Pomodoro records or the active preset are absent', () => {
    const base = createDefaultAppData();
    const stored = {
      ...base,
      version: 1,
      pomodoroRecords: undefined,
      activePresetId: undefined
    };

    const result = loadAppData({ getItem: vi.fn(() => JSON.stringify(stored)) } as unknown as Storage);

    expect(result.recovered).toBe(false);
    expect(result.data.todos).toHaveLength(base.todos.length);
    expect(result.data.pomodoroRecords).toEqual([]);
    expect(result.data.activePresetId).toBe(base.presets[0].id);
  });

  it('saves app data as JSON', () => {
    const setItem = vi.fn();
    const data = createDefaultAppData();

    saveAppData(data, { setItem } as unknown as Storage);

    expect(setItem).toHaveBeenCalledWith('pomodoro-todo-app:v1', JSON.stringify(data));
  });
});
