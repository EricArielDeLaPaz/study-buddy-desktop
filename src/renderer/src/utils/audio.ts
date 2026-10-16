// src/renderer/src/utils/audio.ts

export type ChimeType = 'gentle_bell' | 'break_start' | 'alert';

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtx) return null;

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioCtx();
  }

  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {
      // Ignore autoplay gesture restrictions until user interacts with window
    });
  }

  return sharedAudioContext;
}

/**
 * Helper to schedule an oscillator tone with smooth attack and exponential release.
 */
function scheduleTone(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  type: OscillatorType = 'sine',
  peakGain: number = 0.1
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, startTime);

  // Smooth envelope to prevent speaker clicks
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/**
 * Synthesizes an audio cue using the browser's native Web Audio API.
 * - `gentle_bell`: Warm harmonic two-note chime when hydration/bathroom overlays appear.
 * - `break_start`: Upbeat three-note ascending arpeggio when a focus block finishes.
 * - `alert`: Two-pulse attention nudge when a distraction intervention triggers.
 */
export function playChime(type: ChimeType): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    switch (type) {
      case 'gentle_bell': {
        // Warm C5 -> G5 bell with soft triangle overtone
        scheduleTone(ctx, 523.25, now, 0.55, 'sine', 0.09); // C5
        scheduleTone(ctx, 1046.5, now, 0.35, 'triangle', 0.03); // C6 harmonic
        scheduleTone(ctx, 783.99, now + 0.16, 0.75, 'sine', 0.1); // G5
        scheduleTone(ctx, 1567.98, now + 0.16, 0.45, 'triangle', 0.035); // G6 harmonic
        break;
      }

      case 'break_start': {
        // Ascending D5 -> F#5 -> A5 major triad chime
        scheduleTone(ctx, 587.33, now, 0.35, 'triangle', 0.08); // D5
        scheduleTone(ctx, 739.99, now + 0.12, 0.4, 'triangle', 0.08); // F#5
        scheduleTone(ctx, 880.0, now + 0.24, 0.65, 'sine', 0.11); // A5
        break;
      }

      case 'alert': {
        // Distinct double-nudge tone (E5 -> C5) for distraction intervention
        scheduleTone(ctx, 659.25, now, 0.22, 'triangle', 0.11); // E5
        scheduleTone(ctx, 523.25, now + 0.2, 0.38, 'triangle', 0.11); // C5
        break;
      }
    }
  } catch (err) {
    console.warn('[StudyBuddy] Web Audio API chime playback skipped:', err);
  }
}