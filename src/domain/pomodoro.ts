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
