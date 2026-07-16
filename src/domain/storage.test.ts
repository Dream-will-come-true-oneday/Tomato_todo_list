import { describe, expect, it, vi } from 'vitest';
import { createDefaultAppData } from './defaultData';
import { loadAppData, saveAppData } from './storage';

describe('storage', () => {
  it('loads defaults when storage is empty', () => {
    const storage = new Map<string, string>();
    const getItem = vi.fn((key: string) => storage.get(key) ?? null);

    const result = loadAppData({ getItem } as unknown as Storage);

    expect(result.data.version).toBe(1);
    expect(result.recovered).toBe(false);
  });

  it('recovers to defaults when stored JSON is invalid', () => {
    const getItem = vi.fn(() => '{bad json');

    const result = loadAppData({ getItem } as unknown as Storage);

    expect(result.data.version).toBe(1);
    expect(result.recovered).toBe(true);
  });

  it('saves app data as JSON', () => {
    const setItem = vi.fn();
    const data = createDefaultAppData();

    saveAppData(data, { setItem } as unknown as Storage);

    expect(setItem).toHaveBeenCalledWith('pomodoro-todo-app:v1', JSON.stringify(data));
  });
});
