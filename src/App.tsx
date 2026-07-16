import { useEffect, useMemo, useReducer, useState } from 'react';
import Sidebar from './components/Sidebar';
import TaskDetail from './components/TaskDetail';
import TimerPanel from './components/TimerPanel';
import { appReducer } from './domain/appReducer';
import { loadAppData, saveAppData } from './domain/storage';
import type { Todo } from './domain/types';

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

      <TaskDetail todo={selectedTodo} records={data.pomodoroRecords} onSave={handleTodoSaved} />
    </main>
  );
}
