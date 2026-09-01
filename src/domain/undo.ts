import { appReducer } from './appReducer';
import type { AppAction } from './appReducer';
import type { AppData, DailyScheduleItem } from './types';

/** 单条撤销/重做记录：保存某次破坏性操作生效前后的完整数据快照。 */
export type UndoEntry = {
  /** 操作生效前的 AppData 快照。appReducer 均返回新对象，旧引用不可变，可安全持有。 */
  before: AppData;
  /** 操作生效后的 AppData 快照，重做时整体恢复。 */
  after: AppData;
  /** toast 文案，例如“已删除待办「读书笔记」”。 */
  label: string;
  /** 模块级单调递增序号：App 层据此判定“栈顶是否换成了新记录”，栈满后深度不变也能触发 toast。 */
  seq: number;
};

/** App 组件持有的可撤销状态：当前数据 + 撤销栈 + 重做栈（均仅存在于会话内存中，不持久化）。 */
export type UndoableState = {
  data: AppData;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
};

export type UndoableAction =
  | { type: 'data'; action: AppAction; undoLabel?: string }
  | { type: 'undo' }
  | { type: 'redo' };

/** 撤销栈上限，超出后丢弃最旧的记录。 */
export const UNDO_STACK_LIMIT = 20;

/** 模块级单调递增的撤销记录序号（仅会话内用于识别栈顶换新，不持久化）。 */
let undoSeqCounter = 0;
function nextUndoSeq() {
  undoSeqCounter += 1;
  return undoSeqCounter;
}

export function initUndoableState(data: AppData): UndoableState {
  return { data, undoStack: [], redoStack: [] };
}

export function shortenUndoTitle(title: string) {
  return title.length > 12 ? `${title.slice(0, 12)}…` : title;
}

function countRemovedScheduleItems(before: DailyScheduleItem[], after: DailyScheduleItem[]) {
  const afterIds = new Set(after.map((item) => item.id));
  return before.filter((item) => !afterIds.has(item.id)).length;
}

/**
 * 判断一次已生效的 action 是否为破坏性操作：是则返回 toast 文案，否则返回 null。
 * 仅在 appReducer 返回了新数据（操作真正生效，未被约束拒绝）之后调用；
 * 被拒绝的操作 nextData === before，会在更早处短路，不会进入本函数。
 */
function getUndoLabel(action: AppAction, before: AppData, after: AppData): string | null {
  switch (action.type) {
    case 'deleteTodo': {
      const removedCount = before.todos.length - after.todos.length;
      if (removedCount <= 0) return null;
      const target = before.todos.find((todo) => todo.id === action.todoId);
      if (removedCount > 1) return `已删除 ${removedCount} 条待办（含子任务）`;
      return `已删除待办「${shortenUndoTitle(target?.title ?? '')}」`;
    }
    case 'deleteTypeTag': {
      const tag = before.typeTags.find((item) => item.id === action.tagId);
      if (!tag || after.typeTags.some((item) => item.id === tag.id)) return null;
      return `已删除类型标签「${shortenUndoTitle(tag.name)}」`;
    }
    case 'deleteBacklogItem': {
      const item = before.backlogItems.find((entry) => entry.id === action.itemId);
      if (!item || after.backlogItems.some((entry) => entry.id === item.id)) return null;
      return `已删除灵感「${shortenUndoTitle(item.title)}」`;
    }
    case 'deleteInspirationTag': {
      const tag = before.inspirationTags.find((item) => item.id === action.tagId);
      if (!tag || after.inspirationTags.some((item) => item.id === tag.id)) return null;
      return `已删除灵感标签「${shortenUndoTitle(tag.name)}」`;
    }
    case 'deletePreset': {
      const preset = before.presets.find((item) => item.id === action.presetId);
      if (!preset || after.presets.some((item) => item.id === preset.id)) return null;
      return `已删除番茄类型「${shortenUndoTitle(preset.name)}」`;
    }
    case 'updateTodo': {
      const previous = before.todos.find((todo) => todo.id === action.todo.id);
      if (!previous || previous.status === action.todo.status) return null;
      if (action.todo.status === 'completed') return `已完成待办「${shortenUndoTitle(action.todo.title)}」`;
      if (action.todo.status === 'archived') return `已归档待办「${shortenUndoTitle(action.todo.title)}」`;
      return null;
    }
    case 'updateDailySchedule': {
      const removedCount = countRemovedScheduleItems(before.dailySchedule.items, after.dailySchedule.items);
      if (removedCount === 0) return null;
      if (after.dailySchedule.items.length === 0) return '已清空全部每日安排';
      const beforeIds = new Set(before.dailySchedule.items.map((item) => item.id));
      if (after.dailySchedule.items.every((item) => !beforeIds.has(item.id))) return '已恢复默认每日安排';
      return removedCount === 1 ? '已删除 1 项每日安排' : `已删除 ${removedCount} 项每日安排`;
    }
    default:
      return null;
  }
}

/**
 * 包装 appReducer 的可撤销/可重做 reducer。
 *
 * 入栈规则：破坏性操作（删除待办/类型标签/灵感/灵感标签/番茄预设、完成或归档待办、
 * 清空或删除每日安排）真正生效时，把操作前后的完整 AppData 快照压入撤销栈；
 * 被约束拒绝的操作（nextData === state.data）与非破坏性操作不入栈。
 * 显式传入 undoLabel 时优先使用（供“恢复默认/清空安排”等调用点精确描述）。
 * 任何真正生效的新操作都会清空重做栈：历史在当前状态上分叉，旧的重做分支作废（标准语义）。
 *
 * 出栈规则：`undo` 弹出撤销栈顶，数据恢复为 entry.before，该条目转入重做栈；
 * `redo` 弹出重做栈顶，数据恢复为 entry.after，该条目压回撤销栈；
 * `replaceData`（导入备份整体替换）同时清空两个栈，避免跨数据版本的误恢复。
 * 撤销栈上限 UNDO_STACK_LIMIT，超出丢弃最旧记录。
 */
export function undoableAppReducer(state: UndoableState, wrapper: UndoableAction): UndoableState {
  switch (wrapper.type) {
    case 'data': {
      const nextData = appReducer(state.data, wrapper.action);
      if (nextData === state.data) return state;
      if (wrapper.action.type === 'replaceData') return { data: nextData, undoStack: [], redoStack: [] };
      const label = wrapper.undoLabel ?? getUndoLabel(wrapper.action, state.data, nextData);
      if (label === null) return { ...state, data: nextData, redoStack: [] };
      const entry: UndoEntry = { before: state.data, after: nextData, label, seq: nextUndoSeq() };
      return {
        data: nextData,
        undoStack: [entry, ...state.undoStack].slice(0, UNDO_STACK_LIMIT),
        redoStack: []
      };
    }
    case 'undo': {
      const [top, ...rest] = state.undoStack;
      if (!top) return state;
      return { data: top.before, undoStack: rest, redoStack: [top, ...state.redoStack] };
    }
    case 'redo': {
      const [top, ...rest] = state.redoStack;
      if (!top) return state;
      return {
        data: top.after,
        undoStack: [top, ...state.undoStack].slice(0, UNDO_STACK_LIMIT),
        redoStack: rest
      };
    }
    default:
      return state;
  }
}
