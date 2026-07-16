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

    const nextCompletedFocusCount =
      phase === 'focus' && completionType === 'completed' ? completedFocusCount + 1 : completedFocusCount;
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
