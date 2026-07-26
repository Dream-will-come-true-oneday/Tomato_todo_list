import { createPomodoroRecord } from './pomodoro';
import type {
  AppData,
  BacklogItem,
  DailyReflection,
  DailyPomodoroPlan,
  PomodoroCompletionType,
  TimerPreset,
  Todo,
  TodoTypeTag,
  WeeklyReflection
} from './types';

export type AppAction =
  | {
      type: 'completeFocusSession';
      todoId: string | null;
      startedAt: Date;
      endedAt: Date;
      actualElapsedSeconds: number;
      completionType: PomodoroCompletionType;
    }
  | { type: 'addTodo'; todo: Todo }
  | { type: 'updateTodo'; todo: Todo }
  | { type: 'deleteTodo'; todoId: string }
  | { type: 'addTypeTag'; tag: TodoTypeTag }
  | { type: 'deleteTypeTag'; tagId: string }
  | { type: 'upsertReflection'; reflection: DailyReflection }
  | { type: 'upsertWeeklyReflection'; reflection: WeeklyReflection }
  | { type: 'addBacklogItem'; item: BacklogItem }
  | { type: 'updateBacklogItem'; item: BacklogItem }
  | { type: 'deleteBacklogItem'; itemId: string }
  | { type: 'addTodayPlanTodo'; date: string; todoId: string }
  | { type: 'removeTodayPlanTodo'; date: string; todoId: string; isDefaultTodo: boolean }
  | { type: 'setActivePreset'; presetId: string }
  | { type: 'upsertPreset'; preset: TimerPreset }
  | { type: 'deletePreset'; presetId: string };

function withCompletionArchive(nextTodo: Todo, previousTodo?: Todo): Todo {
  const now = new Date().toISOString();
  const becameCompleted = nextTodo.status === 'completed' && previousTodo?.status !== 'completed';
  const leftCompleted = nextTodo.status !== 'completed' && previousTodo?.status === 'completed';

  if (becameCompleted) {
    return { ...nextTodo, completedAt: nextTodo.completedAt ?? now, updatedAt: now };
  }

  if (leftCompleted) {
    return { ...nextTodo, completedAt: null, updatedAt: now };
  }

  return { ...nextTodo, updatedAt: nextTodo.updatedAt || now };
}

function collectDescendantTodoIds(todos: Todo[], rootTodoId: string) {
  const ids = new Set([rootTodoId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const todo of todos) {
      if (todo.parentId && ids.has(todo.parentId) && !ids.has(todo.id)) {
        ids.add(todo.id);
        changed = true;
      }
    }
  }

  return ids;
}

function getTodayPlan(data: AppData, date: string): DailyPomodoroPlan {
  return data.todayPlans[date] ?? { addedTodoIds: [], excludedTodoIds: [] };
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}

function hasValidTypeTag(todo: Todo, typeTags: TodoTypeTag[]) {
  return todo.typeTagIds.some((tagId) => typeTags.some((tag) => tag.id === tagId));
}

function wouldLeaveCompletedTodoUntagged(data: AppData, tagId: string) {
  const remainingTagIds = new Set(data.typeTags.filter((tag) => tag.id !== tagId).map((tag) => tag.id));
  return data.todos.some(
    (todo) =>
      todo.status === 'completed' &&
      todo.typeTagIds.includes(tagId) &&
      !todo.typeTagIds.some((todoTagId) => todoTagId !== tagId && remainingTagIds.has(todoTagId))
  );
}

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
      if (action.todo.status === 'completed' && !hasValidTypeTag(action.todo, data.typeTags)) return data;
      return { ...data, todos: [withCompletionArchive(action.todo), ...data.todos] };
    }
    case 'updateTodo': {
      const previousTodo = data.todos.find((todo) => todo.id === action.todo.id);
      if (action.todo.status === 'completed' && !hasValidTypeTag(action.todo, data.typeTags)) return data;
      const nextTodo = withCompletionArchive(action.todo, previousTodo);
      return {
        ...data,
        todos: data.todos.map((todo) => (todo.id === action.todo.id ? nextTodo : todo))
      };
    }
    case 'deleteTodo': {
      const idsToDelete = collectDescendantTodoIds(data.todos, action.todoId);
      return {
        ...data,
        todos: data.todos.filter((todo) => !idsToDelete.has(todo.id))
      };
    }
    case 'addTypeTag': {
      return { ...data, typeTags: [...data.typeTags, action.tag] };
    }
    case 'deleteTypeTag': {
      if (wouldLeaveCompletedTodoUntagged(data, action.tagId)) return data;
      return {
        ...data,
        typeTags: data.typeTags.filter((tag) => tag.id !== action.tagId),
        todos: data.todos.map((todo) => ({
          ...todo,
          typeTagIds: todo.typeTagIds.filter((tagId) => tagId !== action.tagId)
        }))
      };
    }
    case 'upsertReflection': {
      const exists = data.reflections.some((item) => item.date === action.reflection.date);
      return {
        ...data,
        reflections: exists
          ? data.reflections.map((item) => (item.date === action.reflection.date ? action.reflection : item))
          : [action.reflection, ...data.reflections]
      };
    }
    case 'upsertWeeklyReflection': {
      const exists = data.weeklyReflections.some((item) => item.weekStart === action.reflection.weekStart);
      return {
        ...data,
        weeklyReflections: exists
          ? data.weeklyReflections.map((item) => (item.weekStart === action.reflection.weekStart ? action.reflection : item))
          : [action.reflection, ...data.weeklyReflections]
      };
    }
    case 'addBacklogItem': {
      return { ...data, backlogItems: [action.item, ...data.backlogItems] };
    }
    case 'updateBacklogItem': {
      return {
        ...data,
        backlogItems: data.backlogItems.map((item) => (item.id === action.item.id ? action.item : item))
      };
    }
    case 'deleteBacklogItem': {
      return { ...data, backlogItems: data.backlogItems.filter((item) => item.id !== action.itemId) };
    }
    case 'addTodayPlanTodo': {
      const plan = getTodayPlan(data, action.date);
      return {
        ...data,
        todayPlans: {
          ...data.todayPlans,
          [action.date]: {
            addedTodoIds: uniqueIds([...plan.addedTodoIds, action.todoId]),
            excludedTodoIds: plan.excludedTodoIds.filter((todoId) => todoId !== action.todoId)
          }
        }
      };
    }
    case 'removeTodayPlanTodo': {
      const plan = getTodayPlan(data, action.date);
      return {
        ...data,
        todayPlans: {
          ...data.todayPlans,
          [action.date]: {
            addedTodoIds: plan.addedTodoIds.filter((todoId) => todoId !== action.todoId),
            excludedTodoIds: action.isDefaultTodo
              ? uniqueIds([...plan.excludedTodoIds, action.todoId])
              : plan.excludedTodoIds
          }
        }
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
