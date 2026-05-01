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
  const activePreset = props.data.presets.find((preset) => preset.id === props.data.activePresetId) ?? props.data.presets[0];

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
    <aside className="side-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">钟法</p>
          <h2>番茄预设</h2>
        </div>
        <button className="icon-button" type="button" onClick={createPreset} title="新增预设" aria-label="新增预设">
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

      <div className="preset-fields">
        <label>
          名称
          <input value={activePreset.name} onChange={(event) => updatePreset('name', event.target.value)} />
        </label>
        <label>
          专注
          <input
            type="number"
            min="1"
            value={activePreset.focusMinutes}
            onChange={(event) => updatePreset('focusMinutes', Number(event.target.value))}
          />
        </label>
      </div>

      <button className="ghost-button" type="button" onClick={() => props.onDeletePreset(activePreset.id)}>
        <Trash2 size={16} />
        删除当前预设
      </button>

      <div className="section-header">
        <div>
          <p className="eyebrow">案牍</p>
          <h2>待办记录</h2>
        </div>
      </div>

      <div className="toolbar">
        <input
          placeholder="新增待办"
          value={newTodoTitle}
          onChange={(event) => setNewTodoTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addTodo();
          }}
        />
        <button className="icon-button" type="button" onClick={addTodo} title="新增待办" aria-label="新增待办">
          <Plus size={18} />
        </button>
      </div>

      <div className="today-list">
        {activeTodos.map((todo) => {
          const badge = getTodoTimeBadge(todo);
          return (
            <button
              key={todo.id}
              className={todo.id === props.selectedTodoId ? 'todo-card active' : 'todo-card'}
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
