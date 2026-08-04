import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { getNextPhase, getPhaseDurationSeconds } from '../domain/pomodoro';
import { playReminderSound, prepareReminderSound } from '../domain/reminderSound';
import type { PomodoroCompletionType, TimerPhase, TimerPreset, Todo } from '../domain/types';

export type PhaseCompletion = {
  finishedPhase: TimerPhase;
  nextPhase: TimerPhase;
  message: string;
  actionLabel: string;
};

export type TimerSnapshot = {
  phase: TimerPhase;
  remainingSeconds: number;
  completedFocusCount: number;
  phaseCompletion: PhaseCompletion | null;
  sessionStartedAt: string | null;
  sessionPlannedSeconds: number;
  sessionTodoId: string | null;
};

export type TimerPanelHandle = {
  pauseAndCapture: () => TimerSnapshot;
};

type Props = {
  preset: TimerPreset;
  selectedTodo: Todo | null;
  snapshot?: TimerSnapshot | null;
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

const reminderMessages: Record<TimerPhase, string> = {
  focus: '专注完成，可以休息一下了',
  shortBreak: '休息结束，回到下一轮专注',
  longBreak: '休息结束，回到下一轮专注'
};

const nextPhaseActionLabels: Record<TimerPhase, string> = {
  focus: '开始专注',
  shortBreak: '开始休息',
  longBreak: '开始休息'
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = Math.max(0, seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

const TimerPanel = forwardRef<TimerPanelHandle, Props>(function TimerPanel({ preset, selectedTodo, snapshot = null, onSessionComplete }, ref) {
  const [phase, setPhase] = useState<TimerPhase>(() => snapshot?.phase ?? 'focus');
  const [remainingSeconds, setRemainingSeconds] = useState(
    () => snapshot?.remainingSeconds ?? getPhaseDurationSeconds('focus', preset)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [completedFocusCount, setCompletedFocusCount] = useState(() => snapshot?.completedFocusCount ?? 0);
  const [phaseCompletion, setPhaseCompletion] = useState<PhaseCompletion | null>(() => snapshot?.phaseCompletion ?? null);
  const sessionStartedAt = useRef<Date | null>(snapshot?.sessionStartedAt ? new Date(snapshot.sessionStartedAt) : null);
  const sessionPlannedSeconds = useRef(snapshot?.sessionPlannedSeconds ?? remainingSeconds);
  const sessionTodoId = useRef<string | null>(snapshot?.sessionTodoId ?? null);
  const deadlineAtMs = useRef<number | null>(null);
  const isFinishingPhase = useRef(false);
  const presetIdRef = useRef(preset.id);

  const totalSeconds = useMemo(() => getPhaseDurationSeconds(phase, preset), [phase, preset]);
  const progress = totalSeconds === 0 ? 0 : 1 - remainingSeconds / totalSeconds;

  function getCurrentRemainingSeconds() {
    if (!deadlineAtMs.current) return remainingSeconds;
    return Math.max(0, Math.ceil((deadlineAtMs.current - Date.now()) / 1000));
  }


  function showDesktopReminder(message: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification('番茄钟提醒', { body: message });
  }

  function sendReminder(message: string) {
    playReminderSound(preset.soundEnabled);
    showDesktopReminder(message);
  }

  const moveToPhase = useCallback(
    (nextPhase: TimerPhase, shouldStart: boolean) => {
      const nextSeconds = getPhaseDurationSeconds(nextPhase, preset);
      setPhaseCompletion(null);
      setPhase(nextPhase);
      setRemainingSeconds(nextSeconds);
      sessionStartedAt.current = shouldStart ? new Date() : null;
      sessionPlannedSeconds.current = nextSeconds;
      sessionTodoId.current = shouldStart && nextPhase === 'focus' ? selectedTodo?.id ?? null : null;
      deadlineAtMs.current = shouldStart ? Date.now() + nextSeconds * 1000 : null;
      if (shouldStart) prepareReminderSound(preset.soundEnabled);
      isFinishingPhase.current = false;
      setIsRunning(shouldStart);
    },
    [preset, selectedTodo?.id]
  );

  useEffect(() => {
    if (presetIdRef.current === preset.id) return;
    presetIdRef.current = preset.id;
    setIsRunning(false);
    setPhase('focus');
    setRemainingSeconds(getPhaseDurationSeconds('focus', preset));
    setPhaseCompletion(null);
    sessionStartedAt.current = null;
    sessionTodoId.current = null;
    deadlineAtMs.current = null;
    isFinishingPhase.current = false;
  }, [preset.id]);


  function start() {
    if (phaseCompletion) {
      moveToPhase(phaseCompletion.nextPhase, true);
      return;
    }

    if (!sessionStartedAt.current) {
      sessionStartedAt.current = new Date();
      sessionPlannedSeconds.current = remainingSeconds;
      sessionTodoId.current = phase === 'focus' ? selectedTodo?.id ?? null : null;
    }
    deadlineAtMs.current = Date.now() + remainingSeconds * 1000;
    prepareReminderSound(preset.soundEnabled);
    isFinishingPhase.current = false;
    setIsRunning(true);
  }

  function pause() {
    setRemainingSeconds(getCurrentRemainingSeconds());
    deadlineAtMs.current = null;
    setIsRunning(false);
  }

  function reset() {
    const secondsLeft = getCurrentRemainingSeconds();
    if (phase === 'focus' && sessionStartedAt.current) {
      onSessionComplete({
        todoId: sessionTodoId.current,
        startedAt: sessionStartedAt.current,
        endedAt: new Date(),
        actualElapsedSeconds: sessionPlannedSeconds.current - secondsLeft,
        completionType: 'reset'
      });
    }
    setIsRunning(false);
    setPhaseCompletion(null);
    sessionStartedAt.current = null;
    sessionTodoId.current = null;
    deadlineAtMs.current = null;
    isFinishingPhase.current = false;
    setRemainingSeconds(getPhaseDurationSeconds(phase, preset));
  }

  function skip() {
    finishPhase('skipped', getCurrentRemainingSeconds());
  }

  const finishPhase = useCallback(
    (completionType: PomodoroCompletionType, secondsLeft: number) => {
      if (isFinishingPhase.current) return;
      isFinishingPhase.current = true;
      setIsRunning(false);
      deadlineAtMs.current = null;
      const endedAt = new Date();
      if (phase === 'focus' && sessionStartedAt.current) {
        onSessionComplete({
          todoId: sessionTodoId.current,
          startedAt: sessionStartedAt.current,
          endedAt,
          actualElapsedSeconds: sessionPlannedSeconds.current - secondsLeft,
          completionType
        });
      }

      const nextCompletedFocusCount =
        phase === 'focus' && completionType === 'completed' ? completedFocusCount + 1 : completedFocusCount;
      const nextPhase = phase === 'focus' ? getNextPhase(nextCompletedFocusCount, preset) : 'focus';
      setCompletedFocusCount(nextCompletedFocusCount);
      sessionStartedAt.current = null;
      sessionTodoId.current = null;

      if (completionType === 'completed') {
        const message = reminderMessages[phase];
        sendReminder(message);
        if (preset.autoStartNextPhase) {
          window.setTimeout(() => moveToPhase(nextPhase, true), 0);
        } else {
          setPhaseCompletion({
            finishedPhase: phase,
            nextPhase,
            message,
            actionLabel: nextPhaseActionLabels[nextPhase]
          });
          setRemainingSeconds(0);
          isFinishingPhase.current = false;
        }
        return;
      }

      setPhaseCompletion(null);
      moveToPhase(nextPhase, preset.autoStartNextPhase);
    },
    [completedFocusCount, moveToPhase, onSessionComplete, phase, preset]
  );

  useImperativeHandle(
    ref,
    () => ({
      pauseAndCapture() {
        const nextRemainingSeconds = getCurrentRemainingSeconds();
        deadlineAtMs.current = null;
        setRemainingSeconds(nextRemainingSeconds);
        setIsRunning(false);
        return {
          phase,
          remainingSeconds: nextRemainingSeconds,
          completedFocusCount,
          phaseCompletion,
          sessionStartedAt: sessionStartedAt.current?.toISOString() ?? null,
          sessionPlannedSeconds: sessionPlannedSeconds.current,
          sessionTodoId: sessionTodoId.current
        };
      }
    }),
    [completedFocusCount, phase, phaseCompletion, remainingSeconds]
  );

  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      if (!deadlineAtMs.current) return;
      const millisecondsLeft = deadlineAtMs.current - Date.now();
      const secondsLeft = Math.max(0, Math.ceil(millisecondsLeft / 1000));
      setRemainingSeconds(secondsLeft);
      if (millisecondsLeft <= 0) {
        finishPhase('completed', 0);
      }
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [finishPhase, isRunning]);

  return (
    <section className={`timer-panel phase-${phase}${phaseCompletion ? ' phase-complete' : ''}`}>
      <p className="eyebrow">{phaseLabels[phase]}</p>
      <h1>{formatTime(remainingSeconds)}</h1>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      {phaseCompletion && (
        <div className="completion-notice" role="status">
          <strong>{phaseCompletion.message}</strong>
        </div>
      )}
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
            {phaseCompletion ? phaseCompletion.actionLabel : '开始'}
          </button>
        )}
        <button type="button" onClick={reset}>
          <RotateCcw size={18} />
          重置
        </button>
        <button type="button" onClick={skip} disabled={Boolean(phaseCompletion)}>
          <SkipForward size={18} />
          跳过
        </button>
      </div>
    </section>
  );
});

export default TimerPanel;
