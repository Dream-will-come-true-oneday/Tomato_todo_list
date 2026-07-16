# Pomodoro Todo App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vite + React desktop-style local web app with customizable Pomodoro presets, task-bound or temporary focus sessions, todo start/due times, and local persistence.

**Architecture:** The app is split into focused modules: domain types, default data, storage parsing, app state reducers/actions, timer calculations, and React UI components. `localStorage` owns persistence for versioned app data, while pure functions own behavior that needs test coverage.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, CSS modules via plain CSS, `localStorage`.

---

## File Structure

- `package.json`: npm scripts and dependencies for Vite, React, TypeScript, and Vitest.
- `index.html`: Vite entry HTML.
- `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`: TypeScript and Vite configuration.
- `src/main.tsx`: React root bootstrap.
- `src/App.tsx`: Top-level app composition and state wiring.
- `src/styles.css`: Desktop-style layout and component styling.
- `src/domain/types.ts`: Shared app data types.
- `src/domain/defaultData.ts`: Default presets, sample todos, and empty app data factory.
- `src/domain/storage.ts`: Safe load/save helpers for `localStorage`.
- `src/domain/todoStatus.ts`: Time-sensitive todo labels such as starts today, due soon, and overdue.
- `src/domain/pomodoro.ts`: Pure Pomodoro session record and phase transition helpers.
- `src/domain/appReducer.ts`: Pure state transitions for presets, todos, and Pomodoro completion.
- `src/domain/*.test.ts`: Unit tests for defaults, storage, todo scheduling, and Pomodoro record behavior.
- `src/components/TimerPanel.tsx`: Center timer UI and controls.
- `src/components/Sidebar.tsx`: Preset selector/editor and todo list.
- `src/components/TaskDetail.tsx`: Todo editing panel and related records.
- `src/components/RecordList.tsx`: Recent Pomodoro record display.
- `src/vite-env.d.ts`: Vite type reference.

---

### Task 1: Scaffold Vite React Project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `src/vite-env.d.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Create project configuration files**

Create `package.json`:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "vite": "^6.0.0",
    "typescript": "^5.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.468.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "jsdom": "^25.0.1",
    "vitest": "^2.1.8"
  }
}
```

Create `index.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>番茄时钟与待办</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  }
});
```

Create `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 2: Create minimal React shell**

Create `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="app-shell">
      <section className="panel">
        <h1>番茄时钟与待办</h1>
        <p>应用正在搭建中。</p>
      </section>
    </main>
  );
}
```

Create `src/styles.css`:

```css
:root {
  font-family: Inter, "Microsoft YaHei", "PingFang SC", system-ui, sans-serif;
  color: #18201c;
  background: #eef1ed;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

button,
input,
select,
textarea {
  font: inherit;
}

.app-shell {
  min-height: 100vh;
  padding: 24px;
}

.panel {
  border: 1px solid #d1d8d0;
  border-radius: 8px;
  background: #fbfcf8;
  padding: 24px;
}
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`

Expected: `node_modules` is created and npm exits successfully.

- [ ] **Step 4: Run initial build**

Run: `npm run build`

Expected: TypeScript compiles and Vite creates `dist`.

---

### Task 2: Domain Types And Default Data

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/defaultData.test.ts`
- Create: `src/domain/defaultData.ts`

- [ ] **Step 1: Write failing tests for default data**

Create `src/domain/defaultData.test.ts`:

```ts
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
    expect(data.todos[0].pomodoroCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/domain/defaultData.test.ts`

Expected: FAIL because `src/domain/defaultData.ts` does not exist.

- [ ] **Step 3: Add domain types**

Create `src/domain/types.ts`:

```ts
export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak';
export type TodoStatus = 'active' | 'completed' | 'archived';
export type TodoPriority = 'low' | 'medium' | 'high';
export type PomodoroCompletionType = 'completed' | 'skipped' | 'reset';

export type TimerPreset = {
  id: string;
  name: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  autoStartNextPhase: boolean;
};

export type Todo = {
  id: string;
  title: string;
  notes: string;
  status: TodoStatus;
  priority: TodoPriority;
  startAt: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  pomodoroCount: number;
};

export type PomodoroRecord = {
  id: string;
  todoId: string | null;
  presetId: string;
  startedAt: string;
  endedAt: string;
  plannedFocusMinutes: number;
  actualElapsedSeconds: number;
  completionType: PomodoroCompletionType;
};

export type AppData = {
  version: 1;
  presets: TimerPreset[];
  todos: Todo[];
  pomodoroRecords: PomodoroRecord[];
  activePresetId: string;
};
```

- [ ] **Step 4: Add default data factory**

Create `src/domain/defaultData.ts`:

```ts
import type { AppData, TimerPreset, Todo } from './types';

const nowIso = () => new Date().toISOString();

export const DEFAULT_PRESETS: TimerPreset[] = [
  {
    id: 'preset-study',
    name: '学习',
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakInterval: 4,
    autoStartNextPhase: false
  },
  {
    id: 'preset-coding',
    name: '编程',
    focusMinutes: 50,
    shortBreakMinutes: 10,
    longBreakMinutes: 25,
    longBreakInterval: 3,
    autoStartNextPhase: false
  },
  {
    id: 'preset-writing',
    name: '写作',
    focusMinutes: 35,
    shortBreakMinutes: 7,
    longBreakMinutes: 20,
    longBreakInterval: 3,
    autoStartNextPhase: false
  },
  {
    id: 'preset-light',
    name: '轻量',
    focusMinutes: 15,
    shortBreakMinutes: 3,
    longBreakMinutes: 10,
    longBreakInterval: 4,
    autoStartNextPhase: false
  }
];

export function createDefaultTodo(title = '整理今日计划'): Todo {
  const createdAt = nowIso();
  return {
    id: `todo-${crypto.randomUUID()}`,
    title,
    notes: '',
    status: 'active',
    priority: 'medium',
    startAt: null,
    dueAt: null,
    createdAt,
    updatedAt: createdAt,
    completedAt: null,
    pomodoroCount: 0
  };
}

export function createDefaultAppData(): AppData {
  const presets = DEFAULT_PRESETS.map((preset) => ({ ...preset }));
  return {
    version: 1,
    presets,
    todos: [createDefaultTodo()],
    pomodoroRecords: [],
    activePresetId: presets[0].id
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/domain/defaultData.test.ts`

Expected: PASS.

---

### Task 3: Persistence And Scheduling Helpers

**Files:**
- Create: `src/domain/storage.test.ts`
- Create: `src/domain/storage.ts`
- Create: `src/domain/todoStatus.test.ts`
- Create: `src/domain/todoStatus.ts`

- [ ] **Step 1: Write failing storage tests**

Create `src/domain/storage.test.ts`:

```ts
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
```

- [ ] **Step 2: Write failing todo scheduling tests**

Create `src/domain/todoStatus.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Todo } from './types';
import { getTodoTimeBadge } from './todoStatus';

const baseTodo: Todo = {
  id: 'todo-1',
  title: 'Test',
  notes: '',
  status: 'active',
  priority: 'medium',
  startAt: null,
  dueAt: null,
  createdAt: '2026-07-16T00:00:00.000Z',
  updatedAt: '2026-07-16T00:00:00.000Z',
  completedAt: null,
  pomodoroCount: 0
};

describe('getTodoTimeBadge', () => {
  it('marks overdue active todos', () => {
    const badge = getTodoTimeBadge(
      { ...baseTodo, dueAt: '2026-07-15T10:00:00.000Z' },
      new Date('2026-07-16T09:00:00.000Z')
    );

    expect(badge).toEqual({ tone: 'danger', label: '已逾期' });
  });

  it('marks todos due soon within 24 hours', () => {
    const badge = getTodoTimeBadge(
      { ...baseTodo, dueAt: '2026-07-16T20:00:00.000Z' },
      new Date('2026-07-16T09:00:00.000Z')
    );

    expect(badge).toEqual({ tone: 'warning', label: '即将截止' });
  });

  it('marks todos starting today', () => {
    const badge = getTodoTimeBadge(
      { ...baseTodo, startAt: '2026-07-16T14:00:00.000Z' },
      new Date('2026-07-16T09:00:00.000Z')
    );

    expect(badge).toEqual({ tone: 'info', label: '今天开始' });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/domain/storage.test.ts src/domain/todoStatus.test.ts`

Expected: FAIL because `storage.ts` and `todoStatus.ts` do not exist.

- [ ] **Step 4: Add storage helpers**

Create `src/domain/storage.ts`:

```ts
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
```

- [ ] **Step 5: Add todo scheduling helper**

Create `src/domain/todoStatus.ts`:

```ts
import type { Todo } from './types';

export type TodoTimeBadge = {
  tone: 'info' | 'warning' | 'danger' | 'neutral';
  label: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isSameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function getTodoTimeBadge(todo: Todo, now = new Date()): TodoTimeBadge | null {
  if (todo.status === 'completed') {
    return { tone: 'neutral', label: '已完成' };
  }

  if (todo.dueAt) {
    const due = new Date(todo.dueAt);
    const msUntilDue = due.getTime() - now.getTime();
    if (msUntilDue < 0) return { tone: 'danger', label: '已逾期' };
    if (msUntilDue <= DAY_MS) return { tone: 'warning', label: '即将截止' };
  }

  if (todo.startAt && isSameLocalDay(new Date(todo.startAt), now)) {
    return { tone: 'info', label: '今天开始' };
  }

  return null;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/domain/storage.test.ts src/domain/todoStatus.test.ts`

Expected: PASS.

---

### Task 4: Pomodoro Records And App Reducer

**Files:**
- Create: `src/domain/pomodoro.test.ts`
- Create: `src/domain/pomodoro.ts`
- Create: `src/domain/appReducer.test.ts`
- Create: `src/domain/appReducer.ts`

- [ ] **Step 1: Write failing Pomodoro record tests**

Create `src/domain/pomodoro.test.ts`:

```ts
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
```

- [ ] **Step 2: Write failing app reducer tests**

Create `src/domain/appReducer.test.ts`:

```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/domain/pomodoro.test.ts src/domain/appReducer.test.ts`

Expected: FAIL because `pomodoro.ts` and `appReducer.ts` do not exist.

- [ ] **Step 4: Add Pomodoro helpers**

Create `src/domain/pomodoro.ts`:

```ts
import type { PomodoroCompletionType, PomodoroRecord, TimerPhase, TimerPreset } from './types';

type CreateRecordInput = {
  preset: TimerPreset;
  todoId: string | null;
  startedAt: Date;
  endedAt: Date;
  actualElapsedSeconds: number;
  completionType: PomodoroCompletionType;
};

export function createPomodoroRecord(input: CreateRecordInput): PomodoroRecord {
  return {
    id: `record-${crypto.randomUUID()}`,
    todoId: input.todoId,
    presetId: input.preset.id,
    startedAt: input.startedAt.toISOString(),
    endedAt: input.endedAt.toISOString(),
    plannedFocusMinutes: input.preset.focusMinutes,
    actualElapsedSeconds: input.actualElapsedSeconds,
    completionType: input.completionType
  };
}

export function getNextPhase(completedFocusCount: number, preset: TimerPreset): TimerPhase {
  return completedFocusCount > 0 && completedFocusCount % preset.longBreakInterval === 0
    ? 'longBreak'
    : 'shortBreak';
}

export function getPhaseDurationSeconds(phase: TimerPhase, preset: TimerPreset): number {
  if (phase === 'focus') return preset.focusMinutes * 60;
  if (phase === 'shortBreak') return preset.shortBreakMinutes * 60;
  return preset.longBreakMinutes * 60;
}
```

- [ ] **Step 5: Add app reducer**

Create `src/domain/appReducer.ts`:

```ts
import { createDefaultTodo } from './defaultData';
import { createPomodoroRecord } from './pomodoro';
import type { AppData, PomodoroCompletionType, TimerPreset, Todo } from './types';

export type AppAction =
  | {
      type: 'completeFocusSession';
      todoId: string | null;
      startedAt: Date;
      endedAt: Date;
      actualElapsedSeconds: number;
      completionType: PomodoroCompletionType;
    }
  | { type: 'addTodo'; title: string }
  | { type: 'updateTodo'; todo: Todo }
  | { type: 'setActivePreset'; presetId: string }
  | { type: 'upsertPreset'; preset: TimerPreset }
  | { type: 'deletePreset'; presetId: string };

export function appReducer(data: AppData, action: AppAction): AppData {
  switch (action.type) {
    case 'completeFocusSession': {
      const preset = data.presets.find((item) => item.id === data.activePresetId) ?? data.presets[0];
      const record = createPomodoroRecord({ preset, ...action });
      const shouldIncrement = action.completionType === 'completed' && Boolean(action.todoId);
      return {
        ...data,
        todos: shouldIncrement
          ? data.todos.map((todo) =>
              todo.id === action.todoId
                ? { ...todo, pomodoroCount: todo.pomodoroCount + 1, updatedAt: action.endedAt.toISOString() }
                : todo
            )
          : data.todos,
        pomodoroRecords: [record, ...data.pomodoroRecords]
      };
    }
    case 'addTodo': {
      return { ...data, todos: [createDefaultTodo(action.title), ...data.todos] };
    }
    case 'updateTodo': {
      return {
        ...data,
        todos: data.todos.map((todo) => (todo.id === action.todo.id ? action.todo : todo))
      };
    }
    case 'setActivePreset': {
      return data.presets.some((preset) => preset.id === action.presetId)
        ? { ...data, activePresetId: action.presetId }
        : data;
    }
    case 'upsertPreset': {
      const exists = data.presets.some((preset) => preset.id === action.preset.id);
      return {
        ...data,
        presets: exists
          ? data.presets.map((preset) => (preset.id === action.preset.id ? action.preset : preset))
          : [...data.presets, action.preset],
        activePresetId: action.preset.id
      };
    }
    case 'deletePreset': {
      if (data.presets.length <= 1) return data;
      const presets = data.presets.filter((preset) => preset.id !== action.presetId);
      return {
        ...data,
        presets,
        activePresetId: data.activePresetId === action.presetId ? presets[0].id : data.activePresetId
      };
    }
    default:
      return data;
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- src/domain/pomodoro.test.ts src/domain/appReducer.test.ts`

Expected: PASS.

---

### Task 5: Compose Application UI And Timer Behavior

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/TimerPanel.tsx`
- Create: `src/components/TaskDetail.tsx`
- Create: `src/components/RecordList.tsx`

- [ ] **Step 1: Replace `App.tsx` with persisted state wiring**

Modify `src/App.tsx`:

```tsx
import { useEffect, useMemo, useReducer, useState } from 'react';
import { appReducer } from './domain/appReducer';
import { loadAppData, saveAppData } from './domain/storage';
import type { Todo } from './domain/types';
import Sidebar from './components/Sidebar';
import TimerPanel from './components/TimerPanel';
import TaskDetail from './components/TaskDetail';

const initialLoad = loadAppData();

export default function App() {
  const [data, dispatch] = useReducer(appReducer, initialLoad.data);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(initialLoad.data.todos[0]?.id ?? null);
  const [recovered, setRecovered] = useState(initialLoad.recovered);

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  const activePreset = useMemo(
    () => data.presets.find((preset) => preset.id === data.activePresetId) ?? data.presets[0],
    [data.activePresetId, data.presets]
  );
  const selectedTodo = data.todos.find((todo) => todo.id === selectedTodoId) ?? null;

  function handleTodoSaved(todo: Todo) {
    dispatch({ type: 'updateTodo', todo: { ...todo, updatedAt: new Date().toISOString() } });
  }

  return (
    <main className="app-shell">
      {recovered && (
        <div className="recovery-banner">
          本地数据读取失败，已载入默认数据。
          <button type="button" onClick={() => setRecovered(false)}>
            知道了
          </button>
        </div>
      )}

      <Sidebar
        data={data}
        selectedTodoId={selectedTodoId}
        onSelectTodo={setSelectedTodoId}
        onAddTodo={(title) => dispatch({ type: 'addTodo', title })}
        onSetActivePreset={(presetId) => dispatch({ type: 'setActivePreset', presetId })}
        onUpsertPreset={(preset) => dispatch({ type: 'upsertPreset', preset })}
        onDeletePreset={(presetId) => dispatch({ type: 'deletePreset', presetId })}
      />

      <TimerPanel
        preset={activePreset}
        selectedTodo={selectedTodo}
        onSessionComplete={(payload) => dispatch({ type: 'completeFocusSession', ...payload })}
      />

      <TaskDetail
        todo={selectedTodo}
        records={data.pomodoroRecords}
        onSave={handleTodoSaved}
      />
    </main>
  );
}
```

- [ ] **Step 2: Create sidebar component**

Create `src/components/Sidebar.tsx`:

```tsx
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getTodoTimeBadge } from '../domain/todoStatus';
import type { AppData, TimerPreset } from '../domain/types';

type Props = {
  data: AppData;
  selectedTodoId: string | null;
  onSelectTodo: (todoId: string) => void;
  onAddTodo: (title: string) => void;
  onSetActivePreset: (presetId: string) => void;
  onUpsertPreset: (preset: TimerPreset) => void;
  onDeletePreset: (presetId: string) => void;
};

export default function Sidebar(props: Props) {
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const activePreset = props.data.presets.find((preset) => preset.id === props.data.activePresetId)!;

  function addTodo() {
    const title = newTodoTitle.trim();
    if (!title) return;
    props.onAddTodo(title);
    setNewTodoTitle('');
  }

  function updatePreset(field: keyof TimerPreset, value: string | number | boolean) {
    props.onUpsertPreset({ ...activePreset, [field]: value });
  }

  function createPreset() {
    props.onUpsertPreset({
      ...activePreset,
      id: `preset-${crypto.randomUUID()}`,
      name: `${activePreset.name} 副本`
    });
  }

  const activeTodos = props.data.todos.filter((todo) => todo.status !== 'archived');

  return (
    <aside className="panel sidebar">
      <div className="section-header">
        <div>
          <p className="eyebrow">Preset</p>
          <h2>番茄预设</h2>
        </div>
        <button className="icon-button" type="button" onClick={createPreset} title="新增预设">
          <Plus size={18} />
        </button>
      </div>

      <select value={props.data.activePresetId} onChange={(event) => props.onSetActivePreset(event.target.value)}>
        {props.data.presets.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {preset.name}
          </option>
        ))}
      </select>

      <div className="preset-grid">
        <label>
          名称
          <input value={activePreset.name} onChange={(event) => updatePreset('name', event.target.value)} />
        </label>
        <label>
          专注
          <input type="number" min="1" value={activePreset.focusMinutes} onChange={(event) => updatePreset('focusMinutes', Number(event.target.value))} />
        </label>
        <label>
          短休
          <input type="number" min="1" value={activePreset.shortBreakMinutes} onChange={(event) => updatePreset('shortBreakMinutes', Number(event.target.value))} />
        </label>
        <label>
          长休
          <input type="number" min="1" value={activePreset.longBreakMinutes} onChange={(event) => updatePreset('longBreakMinutes', Number(event.target.value))} />
        </label>
        <label>
          间隔
          <input type="number" min="1" value={activePreset.longBreakInterval} onChange={(event) => updatePreset('longBreakInterval', Number(event.target.value))} />
        </label>
      </div>

      <label className="toggle-row">
        <input type="checkbox" checked={activePreset.autoStartNextPhase} onChange={(event) => updatePreset('autoStartNextPhase', event.target.checked)} />
        自动开始下一段
      </label>

      <button className="ghost-button" type="button" onClick={() => props.onDeletePreset(activePreset.id)}>
        <Trash2 size={16} />
        删除当前预设
      </button>

      <div className="section-header todos-header">
        <div>
          <p className="eyebrow">Todos</p>
          <h2>待办记录</h2>
        </div>
      </div>

      <div className="add-row">
        <input
          placeholder="新增待办"
          value={newTodoTitle}
          onChange={(event) => setNewTodoTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addTodo();
          }}
        />
        <button className="icon-button" type="button" onClick={addTodo} title="新增待办">
          <Plus size={18} />
        </button>
      </div>

      <div className="todo-list">
        {activeTodos.map((todo) => {
          const badge = getTodoTimeBadge(todo);
          return (
            <button
              key={todo.id}
              className={`todo-item ${todo.id === props.selectedTodoId ? 'selected' : ''}`}
              type="button"
              onClick={() => props.onSelectTodo(todo.id)}
            >
              <span>{todo.title}</span>
              <small>{todo.pomodoroCount} 个番茄</small>
              {badge && <em className={`badge ${badge.tone}`}>{badge.label}</em>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Create timer panel component**

Create `src/components/TimerPanel.tsx`:

```tsx
import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getNextPhase, getPhaseDurationSeconds } from '../domain/pomodoro';
import type { PomodoroCompletionType, TimerPhase, TimerPreset, Todo } from '../domain/types';

type Props = {
  preset: TimerPreset;
  selectedTodo: Todo | null;
  onSessionComplete: (payload: {
    todoId: string | null;
    startedAt: Date;
    endedAt: Date;
    actualElapsedSeconds: number;
    completionType: PomodoroCompletionType;
  }) => void;
};

const phaseLabels: Record<TimerPhase, string> = {
  focus: '专注',
  shortBreak: '短休',
  longBreak: '长休'
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.max(0, seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function TimerPanel({ preset, selectedTodo, onSessionComplete }: Props) {
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [remainingSeconds, setRemainingSeconds] = useState(() => getPhaseDurationSeconds('focus', preset));
  const [isRunning, setIsRunning] = useState(false);
  const [completedFocusCount, setCompletedFocusCount] = useState(0);
  const sessionStartedAt = useRef<Date | null>(null);
  const sessionPlannedSeconds = useRef(remainingSeconds);

  const totalSeconds = useMemo(() => getPhaseDurationSeconds(phase, preset), [phase, preset]);
  const progress = totalSeconds === 0 ? 0 : 1 - remainingSeconds / totalSeconds;

  useEffect(() => {
    setIsRunning(false);
    setPhase('focus');
    setRemainingSeconds(getPhaseDurationSeconds('focus', preset));
    sessionStartedAt.current = null;
  }, [preset.id]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(interval);
          finishPhase('completed');
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning, phase, preset, selectedTodo?.id]);

  function start() {
    if (!sessionStartedAt.current) {
      sessionStartedAt.current = new Date();
      sessionPlannedSeconds.current = remainingSeconds;
    }
    setIsRunning(true);
  }

  function pause() {
    setIsRunning(false);
  }

  function reset() {
    if (phase === 'focus' && sessionStartedAt.current) {
      onSessionComplete({
        todoId: selectedTodo?.id ?? null,
        startedAt: sessionStartedAt.current,
        endedAt: new Date(),
        actualElapsedSeconds: sessionPlannedSeconds.current - remainingSeconds,
        completionType: 'reset'
      });
    }
    setIsRunning(false);
    sessionStartedAt.current = null;
    setRemainingSeconds(getPhaseDurationSeconds(phase, preset));
  }

  function skip() {
    finishPhase('skipped');
  }

  function finishPhase(completionType: PomodoroCompletionType) {
    setIsRunning(false);
    const endedAt = new Date();
    if (phase === 'focus' && sessionStartedAt.current) {
      onSessionComplete({
        todoId: selectedTodo?.id ?? null,
        startedAt: sessionStartedAt.current,
        endedAt,
        actualElapsedSeconds: sessionPlannedSeconds.current - remainingSeconds,
        completionType
      });
    }

    const nextCompletedFocusCount = phase === 'focus' && completionType === 'completed' ? completedFocusCount + 1 : completedFocusCount;
    const nextPhase = phase === 'focus' ? getNextPhase(nextCompletedFocusCount, preset) : 'focus';
    setCompletedFocusCount(nextCompletedFocusCount);
    setPhase(nextPhase);
    setRemainingSeconds(getPhaseDurationSeconds(nextPhase, preset));
    sessionStartedAt.current = null;
    if (preset.autoStartNextPhase) {
      window.setTimeout(() => {
        sessionStartedAt.current = new Date();
        sessionPlannedSeconds.current = getPhaseDurationSeconds(nextPhase, preset);
        setIsRunning(true);
      }, 0);
    }
  }

  return (
    <section className="panel timer-panel">
      <p className="eyebrow">{phaseLabels[phase]}</p>
      <h1>{formatTime(remainingSeconds)}</h1>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <p className="current-task">{selectedTodo ? selectedTodo.title : '临时番茄'}</p>
      <div className="timer-actions">
        {isRunning ? (
          <button type="button" onClick={pause}>
            <Pause size={18} />
            暂停
          </button>
        ) : (
          <button type="button" onClick={start}>
            <Play size={18} />
            开始
          </button>
        )}
        <button type="button" onClick={reset}>
          <RotateCcw size={18} />
          重置
        </button>
        <button type="button" onClick={skip}>
          <SkipForward size={18} />
          跳过
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create task detail and record components**

Create `src/components/RecordList.tsx`:

```tsx
import type { PomodoroRecord } from '../domain/types';

type Props = {
  records: PomodoroRecord[];
};

export default function RecordList({ records }: Props) {
  if (records.length === 0) {
    return <p className="empty-state">还没有番茄记录。</p>;
  }

  return (
    <div className="record-list">
      {records.slice(0, 8).map((record) => (
        <div className="record-item" key={record.id}>
          <strong>{record.plannedFocusMinutes} 分钟</strong>
          <span>{new Date(record.endedAt).toLocaleString()}</span>
          <em>{record.completionType === 'completed' ? '完成' : record.completionType === 'skipped' ? '跳过' : '重置'}</em>
        </div>
      ))}
    </div>
  );
}
```

Create `src/components/TaskDetail.tsx`:

```tsx
import type { PomodoroRecord, Todo, TodoPriority, TodoStatus } from '../domain/types';
import RecordList from './RecordList';

type Props = {
  todo: Todo | null;
  records: PomodoroRecord[];
  onSave: (todo: Todo) => void;
};

function toInputDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromInputDateTime(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function TaskDetail({ todo, records, onSave }: Props) {
  if (!todo) {
    return (
      <aside className="panel detail-panel">
        <p className="empty-state">选择一个待办来编辑时间、备注和状态。</p>
        <RecordList records={records} />
      </aside>
    );
  }

  const todoRecords = records.filter((record) => record.todoId === todo.id);

  return (
    <aside className="panel detail-panel">
      <p className="eyebrow">Task Detail</p>
      <label>
        标题
        <input value={todo.title} onChange={(event) => onSave({ ...todo, title: event.target.value })} />
      </label>
      <label>
        备注
        <textarea value={todo.notes} onChange={(event) => onSave({ ...todo, notes: event.target.value })} />
      </label>
      <div className="form-grid">
        <label>
          优先级
          <select value={todo.priority} onChange={(event) => onSave({ ...todo, priority: event.target.value as TodoPriority })}>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </label>
        <label>
          状态
          <select
            value={todo.status}
            onChange={(event) => {
              const status = event.target.value as TodoStatus;
              onSave({
                ...todo,
                status,
                completedAt: status === 'completed' ? new Date().toISOString() : null
              });
            }}
          >
            <option value="active">进行中</option>
            <option value="completed">已完成</option>
            <option value="archived">已归档</option>
          </select>
        </label>
      </div>
      <div className="form-grid">
        <label>
          开始时间
          <input type="datetime-local" value={toInputDateTime(todo.startAt)} onChange={(event) => onSave({ ...todo, startAt: fromInputDateTime(event.target.value) })} />
        </label>
        <label>
          截止时间
          <input type="datetime-local" value={toInputDateTime(todo.dueAt)} onChange={(event) => onSave({ ...todo, dueAt: fromInputDateTime(event.target.value) })} />
        </label>
      </div>
      <div className="task-stats">
        <span>{todo.pomodoroCount}</span>
        <small>累计番茄</small>
      </div>
      <h2>关联记录</h2>
      <RecordList records={todoRecords} />
    </aside>
  );
}
```

- [ ] **Step 5: Replace stylesheet with desktop UI**

Modify `src/styles.css` with the full stylesheet from Task 1 plus these rules:

```css
.app-shell {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(360px, 1fr) minmax(300px, 380px);
  gap: 16px;
  min-height: 100vh;
  padding: 18px;
}

.panel {
  min-width: 0;
  border: 1px solid #d5ddd4;
  border-radius: 8px;
  background: rgba(251, 252, 248, 0.96);
  box-shadow: 0 18px 40px rgba(32, 44, 38, 0.08);
  padding: 18px;
}

.sidebar,
.detail-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
}

.section-header,
.add-row,
.timer-actions,
.form-grid,
.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-header {
  justify-content: space-between;
}

.todos-header {
  margin-top: 16px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #5d6f65;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

h1,
h2 {
  margin: 0;
}

h2 {
  font-size: 18px;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid #cbd5ca;
  border-radius: 6px;
  background: #ffffff;
  color: #18201c;
  padding: 10px 11px;
}

textarea {
  min-height: 96px;
  resize: vertical;
}

label {
  display: grid;
  gap: 6px;
  color: #405148;
  font-size: 13px;
  font-weight: 700;
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 6px;
  background: #1f7a54;
  color: #ffffff;
  padding: 10px 14px;
  cursor: pointer;
}

button:hover {
  background: #186544;
}

.icon-button {
  width: 40px;
  height: 40px;
  padding: 0;
}

.ghost-button {
  background: #edf2ec;
  color: #315041;
}

.ghost-button:hover {
  background: #dfe9de;
}

.preset-grid,
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.toggle-row {
  grid-template-columns: auto 1fr;
  justify-content: start;
}

.toggle-row input {
  width: auto;
}

.add-row {
  align-items: stretch;
}

.todo-list,
.record-list {
  display: grid;
  gap: 8px;
}

.todo-item {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  width: 100%;
  background: #f4f7f2;
  color: #223229;
  text-align: left;
}

.todo-item.selected {
  outline: 2px solid #1f7a54;
  background: #e9f4ed;
}

.todo-item small {
  color: #607166;
}

.badge {
  width: fit-content;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-style: normal;
}

.badge.info {
  background: #e4efff;
  color: #24538e;
}

.badge.warning {
  background: #fff1cf;
  color: #845d00;
}

.badge.danger {
  background: #ffe1dc;
  color: #9d2d1b;
}

.badge.neutral {
  background: #e8ece7;
  color: #526058;
}

.timer-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  text-align: center;
}

.timer-panel h1 {
  font-size: clamp(68px, 10vw, 136px);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.current-task {
  margin: 0;
  color: #405148;
  font-size: 20px;
  font-weight: 700;
}

.progress-track {
  width: min(520px, 100%);
  height: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: #dde5dc;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #1f7a54;
  transition: width 180ms ease;
}

.detail-panel h2 {
  margin-top: 8px;
}

.task-stats {
  display: grid;
  place-items: center;
  border: 1px solid #d8e0d7;
  border-radius: 8px;
  padding: 16px;
  background: #f6f8f4;
}

.task-stats span {
  font-size: 36px;
  font-weight: 800;
}

.record-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  border-bottom: 1px solid #e2e8e1;
  padding: 10px 0;
  color: #405148;
  font-size: 13px;
}

.record-item em {
  font-style: normal;
  font-weight: 700;
}

.empty-state {
  margin: 0;
  color: #6d7c72;
}

.recovery-banner {
  position: fixed;
  top: 14px;
  left: 50%;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  transform: translateX(-50%);
  border: 1px solid #f2d38a;
  border-radius: 8px;
  background: #fff6dd;
  color: #674b00;
  padding: 10px 12px;
  box-shadow: 0 12px 30px rgba(69, 52, 0, 0.12);
}

@media (max-width: 980px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .timer-panel {
    min-height: 420px;
  }
}
```

- [ ] **Step 6: Run build**

Run: `npm run build`

Expected: PASS.

---

### Task 6: Final Verification

**Files:**
- No new source files.

- [ ] **Step 1: Run full test suite**

Run: `npm test`

Expected: PASS for all domain tests.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS and `dist` is created.

- [ ] **Step 3: Start development server**

Run: `npm run dev`

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 4: Browser verification**

Open the local URL and verify:

- Three-panel layout renders on desktop without overlap.
- Preset selection and editing work.
- Adding a todo works.
- Selecting a todo updates the detail panel.
- Start time and due time can be edited.
- Timer can start, pause, reset, and skip.
- A temporary Pomodoro can run when no todo is selected.
- Data persists after reload.

---

## Self-Review

- Spec coverage: The plan covers Vite + React, local storage, presets, task-bound and temporary Pomodoros, todo start/due times, records, error recovery, and manual visual verification.
- Placeholder scan: No `TBD`, `TODO`, `implement later`, or unspecified test steps remain.
- Type consistency: `TimerPreset`, `Todo`, `PomodoroRecord`, `AppData`, reducer action names, and component props use consistent names across tasks.
