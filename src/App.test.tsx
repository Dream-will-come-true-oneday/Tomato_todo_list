import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { createDefaultAppData, createDefaultTodo } from './domain/defaultData';
import { STORAGE_KEY } from './domain/storage';
import { toDateKey } from './domain/todoFilters';

function ensureLocalStorage() {
  if (window.localStorage) return;

  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => store.delete(key),
    setItem: (key, value) => store.set(key, value)
  };

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storage
  });
}

describe('App workflows', () => {
  beforeEach(() => {
    ensureLocalStorage();
    window.localStorage.clear();
  });

  it('adds a todo from the incomplete page and archives it when completed', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: /未完成待办/ }));

    fireEvent.change(screen.getByLabelText('新增待办标题'), {
      target: { value: '复盘产品体验' }
    });
    fireEvent.click(screen.getByRole('button', { name: /^新增$/ }));

    expect(screen.getByDisplayValue('复盘产品体验')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('复盘产品体验 类型标签 读书'));

    fireEvent.change(screen.getByLabelText('复盘产品体验 状态'), {
      target: { value: 'completed' }
    });

    expect(screen.queryByDisplayValue('复盘产品体验')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: /已完成待办/ }));

    expect(screen.getByText('复盘产品体验')).toBeTruthy();
  });

  it('manages today plan todos and keeps the Pomodoro page in sync', () => {
    const today = toDateKey();
    const data = createDefaultAppData();
    data.todos = [
      createDefaultTodo('默认今日任务', { startAt: today, dueAt: today, status: 'active' }),
      createDefaultTodo('手动加入任务', { startAt: null, dueAt: null, status: 'active' }),
      createDefaultTodo('已完成任务', { startAt: today, dueAt: today, status: 'completed' }),
      createDefaultTodo('归档任务', { startAt: today, dueAt: today, status: 'archived' })
    ];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: '今日安排' }));

    expect(screen.getByText('默认今日任务')).toBeTruthy();
    expect(screen.queryByText('已完成任务')).toBeNull();
    expect(screen.queryByText('归档任务')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: /未完成待办/ }));
    fireEvent.click(screen.getByLabelText('手动加入任务 加入今日安排'));
    fireEvent.click(screen.getByRole('button', { name: /加入今日安排/ }));

    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: '今日安排' }));
    expect(screen.getByText('手动加入任务')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '番茄钟' }));
    expect(screen.getAllByText('默认今日任务').length).toBeGreaterThan(0);
    expect(screen.getByText('手动加入任务')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /管理今日安排/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /移除/ })[0]);

    const updatedPlanList = screen.getByText('事项').closest('.today-plan-list');
    expect(updatedPlanList).not.toBeNull();
    expect(within(updatedPlanList as HTMLElement).queryByText('默认今日任务')).toBeNull();
    expect(within(updatedPlanList as HTMLElement).getByText('手动加入任务')).toBeTruthy();

    unmount();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: '今日安排' }));

    const reloadedPlanList = screen.getByText('事项').closest('.today-plan-list');
    expect(reloadedPlanList).not.toBeNull();
    expect(within(reloadedPlanList as HTMLElement).queryByText('默认今日任务')).toBeNull();
    expect(within(reloadedPlanList as HTMLElement).getByText('手动加入任务')).toBeTruthy();
  });

  it('batch adds filtered incomplete todos to today plan', () => {
    const data = createDefaultAppData();
    data.todos = [
      createDefaultTodo('批量任务 A', { startAt: null, dueAt: null, status: 'active' }),
      createDefaultTodo('批量任务 B', { startAt: null, dueAt: null, status: 'active' })
    ];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: /未完成待办/ }));

    fireEvent.click(screen.getByLabelText('选择当前筛选可加入待办'));
    fireEvent.click(screen.getByRole('button', { name: /加入今日安排/ }));

    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: '今日安排' }));

    expect(screen.getByText('批量任务 A')).toBeTruthy();
    expect(screen.getByText('批量任务 B')).toBeTruthy();
  });

  it('asks for confirmation before deleting a type tag', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: /未完成待办/ }));

    fireEvent.click(screen.getByRole('button', { name: '准备删除标签 读书' }));

    expect(screen.getAllByText('读书').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '确认删除' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('button', { name: '确认删除' })).toBeNull();
    expect(screen.getAllByText('读书').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '准备删除标签 读书' }));
    fireEvent.click(screen.getByRole('button', { name: '确认删除' }));

    expect(screen.queryByText('读书')).toBeNull();
  });

  it('shows cumulative Pomodoro counts in completed todos', () => {
    const today = toDateKey();
    const data = createDefaultAppData();
    data.todos = [
      {
        ...createDefaultTodo('完成带番茄', { status: 'completed' }),
        completedAt: `${today}T09:00:00.000Z`,
        pomodoroCount: 3
      }
    ];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: /已完成待办/ }));

    expect(screen.getByText('完成带番茄')).toBeTruthy();
    expect(screen.getByText('3 个番茄')).toBeTruthy();
  });

  it('shows completed child todos under their unfinished parent with an active parent marker', () => {
    const today = toDateKey();
    const data = createDefaultAppData();
    const parent = createDefaultTodo('Parent task', { status: 'active' });
    const child = {
      ...createDefaultTodo('Child task', { parentId: parent.id, status: 'completed' }),
      completedAt: `${today}T09:00:00.000Z`
    };
    data.todos = [parent, child];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: /已完成待办/ }));

    const doneTable = screen.getByText('Parent task').closest('.done-table');
    expect(doneTable).not.toBeNull();
    expect(within(doneTable as HTMLElement).getByText('Parent task')).toBeTruthy();
    expect(within(doneTable as HTMLElement).getByText('Child task')).toBeTruthy();
    expect((within(doneTable as HTMLElement).getByLabelText('Parent task 已完成页状态') as HTMLSelectElement).value).toBe(
      'active'
    );

    fireEvent.click(screen.getByRole('button', { name: '收起 Parent task 的子任务' }));
    expect(within(doneTable as HTMLElement).queryByText('Child task')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '展开 Parent task 的子任务' }));
    expect(within(doneTable as HTMLElement).getByText('Child task')).toBeTruthy();
  });

  it('collapses and expands child todos in the incomplete list', () => {
    const data = createDefaultAppData();
    const parent = createDefaultTodo('父待办', { status: 'active' });
    const child = createDefaultTodo('子待办', { parentId: parent.id, status: 'active' });
    data.todos = [parent, child];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: '未完成待办' }));

    expect(screen.getByDisplayValue('子待办')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '收起 父待办 的子任务' }));
    expect(screen.queryByDisplayValue('子待办')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '展开 父待办 的子任务' }));
    expect(screen.getByDisplayValue('子待办')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '全部收起' }));
    expect(screen.queryByDisplayValue('子待办')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '全部展开' }));
    expect(screen.getByDisplayValue('子待办')).toBeTruthy();
  });

  it('can add, rename, select and delete Pomodoro timer types without duplicating the current name', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '番茄钟' }));
    fireEvent.change(screen.getByLabelText('类型名称'), {
      target: { value: '算法' }
    });
    fireEvent.click(screen.getByRole('button', { name: /新增类型/ }));

    expect(screen.getByRole('option', { name: '算法' })).toBeTruthy();
    expect(screen.getByRole('option', { name: '新类型' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: '算法 副本' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /删除类型/ }));

    expect(screen.queryByRole('option', { name: '新类型' })).toBeNull();
  });

  it('shows completion type shares and persists a weekly reflection', () => {
    const today = toDateKey();
    const data = createDefaultAppData();
    const tagged = {
      ...createDefaultTodo('带类型的完成任务', { status: 'completed', typeTagIds: [data.typeTags[0].id] }),
      completedAt: `${today}T09:00:00.000Z`
    };
    const untagged = {
      ...createDefaultTodo('未分类完成任务', { status: 'completed' }),
      completedAt: `${today}T10:00:00.000Z`
    };
    data.todos = [tagged, untagged];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    expect(screen.getByText('本周完成')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '已完成待办' }));
    expect(screen.getByRole('heading', { name: '完成类型占比' })).toBeTruthy();
    expect(screen.getAllByText('IT').length).toBeGreaterThan(0);
    expect(screen.getAllByText(data.typeTags[0].name).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: '周总结' }));
    expect(screen.getByRole('heading', { name: '周总结' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('本周复盘'), { target: { value: '完成本周复盘' } });

    unmount();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: '周总结' }));
    expect((screen.getByLabelText('本周复盘') as HTMLTextAreaElement).value).toBe('完成本周复盘');
  });

  it('requires a type tag before a todo can be completed', () => {
    const data = createDefaultAppData();
    data.todos = [createDefaultTodo('需要标签', { status: 'active' })];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '待办事项' }));
    fireEvent.click(screen.getByRole('button', { name: '未完成待办' }));
    fireEvent.change(screen.getByLabelText('需要标签 状态'), { target: { value: 'completed' } });

    expect(screen.getByRole('alertdialog')).toBeTruthy();
    expect(screen.getByText('完成前请选择类型标签')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '前往添加标签' }));
    expect(document.activeElement?.getAttribute('aria-label')).toBe(`需要标签 类型标签 ${data.typeTags[0].name}`);
  });
});
