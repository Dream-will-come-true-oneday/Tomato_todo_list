let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextConstructor =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  audioContext = audioContext ?? new AudioContextConstructor();
  return audioContext;
}

export function prepareReminderSound(enabled = true) {
  if (!enabled) return;
  void getAudioContext()?.resume();
}

export function playReminderSound(enabled = true) {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;

  const now = context.currentTime;
  [0, 0.18].forEach((offset, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(index === 0 ? 220 : 176, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.42);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + offset);
    oscillator.stop(now + offset + 0.46);
  });
}
