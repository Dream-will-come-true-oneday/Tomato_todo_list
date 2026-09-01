import { fireEvent, render, screen, act } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimerPanel, { type TimerPanelHandle, type TimerSnapshot } from './TimerPanel';
import type { TimerPreset } from '../domain/types';

const preset: TimerPreset = {
  id: 'preset-fast-test',
  name: 'Fast test',
  focusMinutes: 1,
  shortBreakMinutes: 1,
  longBreakMinutes: 1,
  longBreakInterval: 4,
  autoStartNextPhase: false,
  soundEnabled: false
};

describe('TimerPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives remaining time from the real deadline instead of interval tick count', () => {
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    act(() => {
      vi.setSystemTime(new Date('2026-07-21T00:00:45.000Z'));
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByText('00:15')).toBeTruthy();
  });

  it('records a completed focus session with the planned elapsed seconds', () => {
    const onSessionComplete = vi.fn();
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={onSessionComplete} />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    expect(onSessionComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        actualElapsedSeconds: 60,
        completionType: 'completed'
      })
    );
    expect(screen.getByText('00:00')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('专注完成，可以休息一下了');
    expect(screen.getByRole('button', { name: /开始休息/ })).toBeTruthy();
  });

  it('can automatically start the next phase after reminding', () => {
    render(<TimerPanel preset={{ ...preset, autoStartNextPhase: true }} selectedTodo={null} onSessionComplete={vi.fn()} />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('短休')).toBeTruthy();
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();
  });

  it('captures a paused session and restores it after the panel remounts', () => {
    const ref = createRef<TimerPanelHandle>();
    const first = render(<TimerPanel ref={ref} preset={preset} selectedTodo={null} onSessionComplete={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button')[0]);

    act(() => {
      vi.setSystemTime(new Date('2026-07-21T00:00:12.000Z'));
      vi.advanceTimersByTime(250);
    });

    let snapshot: TimerSnapshot | undefined;
    act(() => {
      snapshot = ref.current?.pauseAndCapture();
    });
    expect(snapshot?.remainingSeconds).toBe(48);
    first.unmount();

    render(<TimerPanel preset={preset} selectedTodo={null} snapshot={snapshot} onSessionComplete={vi.fn()} />);
    expect(screen.getByText('00:48')).toBeTruthy();
  });

  it('keeps a running session active when the panel remounts after navigation', () => {
    const ref = createRef<TimerPanelHandle>();
    const first = render(<TimerPanel ref={ref} preset={preset} selectedTodo={null} onSessionComplete={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button')[0]);

    act(() => {
      vi.setSystemTime(new Date('2026-07-21T00:00:12.000Z'));
      vi.advanceTimersByTime(250);
    });

    let snapshot: TimerSnapshot | undefined;
    act(() => {
      snapshot = ref.current?.capture();
    });
    expect(snapshot).toMatchObject({ isRunning: true, remainingSeconds: 48 });
    first.unmount();

    act(() => {
      vi.setSystemTime(new Date('2026-07-21T00:00:20.000Z'));
    });
    render(<TimerPanel preset={preset} selectedTodo={null} snapshot={snapshot} onSessionComplete={vi.fn()} />);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(screen.getByText('00:40')).toBeTruthy();
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();
  });

  it('toggles start and pause with the Space key', () => {
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={vi.fn()} />);

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(screen.getByRole('button', { name: /开始/ })).toBeTruthy();
  });

  it('confirms the completion notice with Space instead of restarting', () => {
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={vi.fn()} />);

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole('status').textContent).toContain('专注完成，可以休息一下了');

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByText('短休')).toBeTruthy();
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();
  });

  it('resets the current phase with the R key', () => {
    const onSessionComplete = vi.fn();
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={onSessionComplete} />);

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    fireEvent.keyDown(window, { key: 'r', code: 'KeyR' });

    expect(onSessionComplete).toHaveBeenCalledWith(
      expect.objectContaining({ completionType: 'reset', actualElapsedSeconds: 20 })
    );
    expect(screen.getByText('01:00')).toBeTruthy();
    expect(screen.getByRole('button', { name: /开始/ })).toBeTruthy();
  });

  it('skips the current phase with the S key', () => {
    const onSessionComplete = vi.fn();
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={onSessionComplete} />);

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    fireEvent.keyDown(window, { key: 's', code: 'KeyS' });

    expect(onSessionComplete).toHaveBeenCalledWith(
      expect.objectContaining({ completionType: 'skipped', actualElapsedSeconds: 10 })
    );
    expect(screen.getByText('短休')).toBeTruthy();
    expect(screen.getByRole('button', { name: /开始/ })).toBeTruthy();
  });

  it('does not trigger skip with S while a completion notice waits', () => {
    const onSessionComplete = vi.fn();
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={onSessionComplete} />);

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    const callsAfterCompletion = onSessionComplete.mock.calls.length;

    fireEvent.keyDown(window, { key: 's', code: 'KeyS' });

    expect(onSessionComplete).toHaveBeenCalledTimes(callsAfterCompletion);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('ignores shortcuts while the focus is inside an editable element', () => {
    const onSessionComplete = vi.fn();
    render(
      <div>
        <input aria-label="备注" />
        <TimerPanel preset={preset} selectedTodo={null} onSessionComplete={onSessionComplete} />
      </div>
    );

    const input = screen.getByLabelText('备注');
    input.focus();

    fireEvent.keyDown(input, { key: ' ', code: 'Space' });
    fireEvent.keyDown(input, { key: 'r', code: 'KeyR' });
    fireEvent.keyDown(input, { key: 's', code: 'KeyS' });

    expect(onSessionComplete).not.toHaveBeenCalled();
    expect(screen.getByText('01:00')).toBeTruthy();
    expect(screen.getByRole('button', { name: /开始/ })).toBeTruthy();
  });

  it('ignores Space, R and S shortcuts while a modal dialog is open', () => {
    const onSessionComplete = vi.fn();
    render(
      <div>
        <div role="dialog" aria-modal="true" aria-label="确认对话框">
          <button type="button">确认</button>
        </div>
        <TimerPanel preset={preset} selectedTodo={null} onSessionComplete={onSessionComplete} />
      </div>
    );

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    fireEvent.keyDown(window, { key: 'r', code: 'KeyR' });
    fireEvent.keyDown(window, { key: 's', code: 'KeyS' });

    expect(onSessionComplete).not.toHaveBeenCalled();
    expect(screen.getByText('01:00')).toBeTruthy();
    expect(screen.getByRole('button', { name: /开始/ })).toBeTruthy();
  });

  it('ignores R and S shortcuts when modifier keys are pressed', () => {
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={vi.fn()} />);

    fireEvent.keyDown(window, { key: 'r', code: 'KeyR', ctrlKey: true });
    fireEvent.keyDown(window, { key: 's', code: 'KeyS', ctrlKey: true });

    expect(screen.getByText('01:00')).toBeTruthy();
    expect(screen.getByRole('button', { name: /开始/ })).toBeTruthy();
  });

  it('ignores shortcuts while focus is on a native button', () => {
    const onSessionComplete = vi.fn();
    render(
      <div>
        <button type="button">外部按钮</button>
        <TimerPanel preset={preset} selectedTodo={null} onSessionComplete={onSessionComplete} />
      </div>
    );

    // 焦点在 body 时先正常开始并进入专注中
    fireEvent.keyDown(document.body, { key: ' ', code: 'Space' });
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();

    act(() => {
      vi.setSystemTime(new Date('2026-07-21T00:00:20.000Z'));
      vi.advanceTimersByTime(250);
    });

    // 焦点移到外部按钮：Space 不应劫持按钮激活，也不触发计时器 toggle
    const outerButton = screen.getByRole('button', { name: '外部按钮' });
    outerButton.focus();
    expect(document.activeElement).toBe(outerButton);

    fireEvent.keyDown(outerButton, { key: ' ', code: 'Space' });
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();

    // R 不产生 reset 记录，剩余时间不变
    fireEvent.keyDown(outerButton, { key: 'r', code: 'KeyR' });
    expect(onSessionComplete).not.toHaveBeenCalled();
    expect(screen.getByText('00:40')).toBeTruthy();

    // S 不产生 skip 记录，仍在专注阶段
    fireEvent.keyDown(outerButton, { key: 's', code: 'KeyS' });
    expect(onSessionComplete).not.toHaveBeenCalled();
    expect(screen.getByText('专注')).toBeTruthy();

    // 计时器自身的按钮被聚焦后同样放行：Space 不触发 toggle，R 不重置
    const resetButton = screen.getByRole('button', { name: /重置/ });
    resetButton.focus();
    fireEvent.keyDown(resetButton, { key: ' ', code: 'Space' });
    fireEvent.keyDown(resetButton, { key: 'r', code: 'KeyR' });
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();
    expect(onSessionComplete).not.toHaveBeenCalled();
  });

  it('ignores Shift-modified shortcuts such as Shift+Space', () => {
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={vi.fn()} />);

    // Shift+Space 是中文输入法全/半角切换，不应触发计时器
    fireEvent.keyDown(window, { key: ' ', code: 'Space', shiftKey: true });
    expect(screen.getByRole('button', { name: /开始/ })).toBeTruthy();

    fireEvent.keyDown(window, { key: 'R', code: 'KeyR', shiftKey: true });
    fireEvent.keyDown(window, { key: 'S', code: 'KeyS', shiftKey: true });
    expect(screen.getByText('01:00')).toBeTruthy();
    expect(screen.getByRole('button', { name: /开始/ })).toBeTruthy();
  });

  it('toggles only once while Space is held down and keydown auto-repeats', () => {
    render(<TimerPanel preset={preset} selectedTodo={null} onSessionComplete={vi.fn()} />);

    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();

    // 模拟系统重复率触发的自动重复 keydown，不应交替 start/pause
    fireEvent.keyDown(window, { key: ' ', code: 'Space', repeat: true });
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();

    fireEvent.keyDown(window, { key: ' ', code: 'Space', repeat: true });
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();
  });

  it('keeps shortcuts working when focus is on the body or a plain container', () => {
    const onSessionComplete = vi.fn();
    render(
      <div data-testid="shortcut-container" tabIndex={0}>
        <TimerPanel preset={preset} selectedTodo={null} onSessionComplete={onSessionComplete} />
      </div>
    );

    // 焦点在 body 上：Space 正常开始
    fireEvent.keyDown(document.body, { key: ' ', code: 'Space' });
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();

    act(() => {
      vi.setSystemTime(new Date('2026-07-21T00:00:20.000Z'));
      vi.advanceTimersByTime(250);
    });

    // 焦点在普通容器（非按钮/输入元素）上：快捷键仍正常工作
    const container = screen.getByTestId('shortcut-container');
    container.focus();
    expect(document.activeElement).toBe(container);

    fireEvent.keyDown(container, { key: 'r', code: 'KeyR' });
    expect(onSessionComplete).toHaveBeenCalledTimes(1);
    expect(onSessionComplete).toHaveBeenCalledWith(
      expect.objectContaining({ completionType: 'reset', actualElapsedSeconds: 20 })
    );
    expect(screen.getByText('01:00')).toBeTruthy();
    expect(screen.getByRole('button', { name: /开始/ })).toBeTruthy();

    fireEvent.keyDown(container, { key: ' ', code: 'Space' });
    expect(screen.getByRole('button', { name: /暂停/ })).toBeTruthy();

    fireEvent.keyDown(container, { key: 's', code: 'KeyS' });
    expect(onSessionComplete).toHaveBeenLastCalledWith(
      expect.objectContaining({ completionType: 'skipped' })
    );
    expect(screen.getByText('短休')).toBeTruthy();
  });
});
