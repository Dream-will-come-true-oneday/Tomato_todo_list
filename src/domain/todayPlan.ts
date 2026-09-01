import { compareTodosBySchedule } from './todoView';
import { isIncompleteTodo, isTodayPomodoroTodo } from './todoFilters';
import type { DailyPomodoroPlan, Todo } from './types';

export function getTodayPlan(todayPlans: Record<string, DailyPomodoroPlan>, dateKey: string): DailyPomodoroPlan {
  return todayPlans[dateKey] ?? { addedTodoIds: [], excludedTodoIds: [] };
}

export function buildTodayPlanTodos(todos: Todo[], todayPlans: Record<string, DailyPomodoroPlan>, dateKey: string) {
  const plan = getTodayPlan(todayPlans, dateKey);
  const todoById = new Map(todos.map((todo) => [todo.id, todo]));
  const defaultTodoIds = todos
    .filter((todo) => isTodayPomodoroTodo(todo, dateKey) && !plan.excludedTodoIds.includes(todo.id))
    .map((todo) => todo.id);
  const plannedIds = [...new Set([...defaultTodoIds, ...plan.addedTodoIds])];

  return plannedIds
    .map((todoId) => todoById.get(todoId))
    .filter((todo): todo is Todo => todo !== undefined && isIncompleteTodo(todo))
    .sort(compareTodosBySchedule);
}
