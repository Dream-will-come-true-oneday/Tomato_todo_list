import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getNextPhase, getPhaseDurationSeconds } from '../domain/pomodoro';
import type { PomodoroCompletionType, TimerPhase, TimerPreset, Todo } from '../domain/types';

type PhaseCompletion = {
  finishedPhase: TimerPhase;
  nextPhase: TimerPhase;
  message: string;
  actionLabel: string;
};

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

export default function TimerPanel({ preset, selectedTodo, onSessionComplete }: Props) {
  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [remainingSeconds, setRemainingSeconds] = useState(() => getPhaseDurationSeconds('focus', preset));
  const [isRunning, setIsRunning] = useState(false);
  const [completedFocusCount, setCompletedFocusCount] = useState(0);
  const [phaseCompletion, setPhaseCompletion] = useState<PhaseCompletion | null>(null);
  const sessionStartedAt = useRef<Date | null>(null);
  const sessionPlannedSeconds = useRef(remainingSeconds);
  const deadlineAtMs = useRef<number | null>(null);
  const isFinishingPhase = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const totalSeconds = useMemo(() => getPhaseDurationSeconds(phase, preset), [phase, preset]);
  const progress = totalSeconds === 0 ? 0 : 1 - remainingSeconds / totalSeconds;

  function getCurrentRemainingSeconds() {
    if (!deadlineAtMs.current) return remainingSeconds;
    return Math.max(0, Math.ceil((deadlineAtMs.current - Date.now()) / 1000));
  }

  function getAudioContext() {
    if (!preset.soundEnabled) return;

    const AudioContextConstructor =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return;

    audioContextRef.current = audioContextRef.current ?? new AudioContextConstructor();
    return audioContextRef.current;
  }

  function prepareReminderSound() {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    void audioContext.resume();
  }

  function playReminderSound() {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    const now = audioContext.currentTime;

    [0, 0.18].forEach((offset, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(index === 0 ? 220 : 176, now + offset);
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.42);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.46);
    });
  }

  function showDesktopReminder(message: string) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification('番茄钟提醒', { body: message });
  }

  function sendReminder(message: string) {
    playReminderSound();
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
      deadlineAtMs.current = shouldStart ? Date.now() + nextSeconds * 1000 : null;
      if (shouldStart) prepareReminderSound();
      isFinishingPhase.current = false;
      setIsRunning(shouldStart);
    },
    [preset]
  );

  useEffect(() => {
    setIsRunning(false);
    setPhase('focus');
    setRemainingSeconds(getPhaseDurationSeconds('focus', preset));
    setPhaseCompletion(null);
    sessionStartedAt.current = null;
    deadlineAtMs.current = null;
    isFinishingPhase.current = false;
  }, [preset.id]);

  useEffect(() => {
    return () => {
      void audioContextRef.current?.close();
    };
  }, []);

  function start() {
    if (phaseCompletion) {
      moveToPhase(phaseCompletion.nextPhase, true);
      return;
    }

    if (!sessionStartedAt.current) {
      sessionStartedAt.current = new Date();
      sessionPlannedSeconds.current = remainingSeconds;
    }
    deadlineAtMs.current = Date.now() + remainingSeconds * 1000;
    prepareReminderSound();
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
        todoId: selectedTodo?.id ?? null,
        startedAt: sessionStartedAt.current,
        endedAt: new Date(),
        actualElapsedSeconds: sessionPlannedSeconds.current - secondsLeft,
        completionType: 'reset'
      });
    }
    setIsRunning(false);
    setPhaseCompletion(null);
    sessionStartedAt.current = null;
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
          todoId: selectedTodo?.id ?? null,
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
    [completedFocusCount, moveToPhase, onSessionComplete, phase, preset, selectedTodo?.id]
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
}
