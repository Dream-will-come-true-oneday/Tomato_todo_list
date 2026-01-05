# Custom Pomodoro And Todo App Design

## Goal

Build a desktop-style local web app for personal focus work. The app combines a customizable Pomodoro timer with todo records. It should work well as a browser app first, while keeping the structure friendly to a future Electron or Tauri wrapper.

## Product Shape

The first version will be a Vite + React app with local persistence through `localStorage`. It will feel like a compact desktop productivity tool rather than a marketing page.

The app supports both task-bound Pomodoros and temporary Pomodoros:

- A user can select a todo, start a Pomodoro, and have completed focus sessions recorded on that todo.
- A user can start a temporary Pomodoro without creating a todo first.
- A user can review recent Pomodoro records in the app.

## Core Features

### Pomodoro Timer

- Start, pause, resume, reset, and skip timer phases.
- Timer phases: focus, short break, and long break.
- Configurable long-break interval.
- Optional auto-start for the next phase.
- Current phase and progress are clearly visible.
- Timer can be linked to a selected todo or run as a temporary session.

### Presets

- Multiple timer presets, such as Study, Coding, Writing, and Light.
- Each preset stores focus length, short-break length, long-break length, long-break interval, and auto-start preference.
- Users can create, edit, select, and delete custom presets.
- The active preset is used for newly started timer cycles.

### Todo Records

Each todo includes:

- Title
- Notes
- Status: active, completed, or archived
- Priority: low, medium, or high
- Start time, optional
- Due time, optional
- Created time and updated time
- Completed time, optional
- Count of completed Pomodoros

The todo list highlights time-sensitive states:

- Starts today
- Due soon
- Overdue
- Completed

### Task Detail

Selecting a todo opens a detail panel where the user can edit:

- Title
- Notes
- Priority
- Start time
- Due time
- Status

The detail panel also shows Pomodoro records associated with that todo.

### Pomodoro Records

Each completed focus session creates a record with:

- Record id
- Todo id, optional
- Preset id
- Started at
- Ended at
- Planned focus minutes
- Actual elapsed seconds
- Completion type: completed, skipped, or reset

Only completed focus sessions increment a todo's Pomodoro count.

## Interface Design

The main screen uses a three-panel desktop layout:

- Left panel: preset selector, preset editor entry point, and today's active todos.
- Center panel: large timer, current phase, current task, and primary controls.
- Right panel: selected todo details, scheduling fields, and recent Pomodoro records.

The app should prioritize fast repeated use:

- Primary timer controls are always visible.
- Task selection should require one click.
- Adding a todo should be possible from the main screen.
- Editing dates should happen inside the detail panel without navigating away.

## Data Model

The app stores a single JSON object in `localStorage`, versioned for future migration:

```ts
type AppData = {
  version: 1;
  presets: TimerPreset[];
  todos: Todo[];
  pomodoroRecords: PomodoroRecord[];
  activePresetId: string;
};
```

Default data is created when no stored data exists. Invalid stored data falls back to defaults while preserving the app's ability to start.

## Error Handling

- If stored data cannot be parsed, the app loads defaults and shows a non-blocking recovery message.
- Date fields can be empty. Invalid date input is rejected in the form before saving.
- Deleting a preset is blocked when it is the only remaining preset.
- Deleting a preset used by old records keeps historical record data readable by storing the preset id and planned minutes in each record.

## Testing

Use focused tests for timer and persistence behavior:

- Preset defaults are created correctly.
- Todos support optional start and due times.
- Completed focus sessions linked to a todo increment its Pomodoro count.
- Temporary Pomodoros create records without a todo id.
- Invalid stored data falls back to defaults.

Use manual browser verification for the first visual pass:

- Desktop layout renders without overlap.
- Timer controls work.
- Todo creation, editing, completion, and scheduling work.
- Data persists after reload.

## Out Of Scope For Version 1

- Account system
- Cloud sync
- Heavy analytics dashboards
- Native desktop packaging
- Background system tray behavior
- Push notifications
- Multi-device collaboration

## Future Extensions

- Electron or Tauri desktop package
- Desktop notifications
- Calendar view
- Daily and weekly focus charts
- Import and export of app data
- Keyboard shortcuts
