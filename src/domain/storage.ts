import { createDefaultAppData } from './defaultData';
import type { AppData } from './types';

export const STORAGE_KEY = 'pomodoro-todo-app:v1';

type LoadResult = {
  data: AppData;
  recovered: boolean;
};

function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false;
  const data = value as AppData;
  return (
    data.version === 1 &&
    Array.isArray(data.presets) &&
    Array.isArray(data.todos) &&
    Array.isArray(data.pomodoroRecords) &&
    typeof data.activePresetId === 'string'
  );
}

export function loadAppData(storage: Storage = window.localStorage): LoadResult {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return { data: createDefaultAppData(), recovered: false };
  }

  try {
    const parsed = JSON.parse(raw);
    if (isAppData(parsed)) {
      return { data: parsed, recovered: false };
    }
  } catch {
    return { data: createDefaultAppData(), recovered: true };
  }

  return { data: createDefaultAppData(), recovered: true };
}

export function saveAppData(data: AppData, storage: Storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(data));
}
