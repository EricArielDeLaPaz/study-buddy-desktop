// src/renderer/src/types/buddy.ts

/**
 * Core animation slot identifiers for Mambo's character states.
 */
export type AnimationSlotId =
  | 'idle_studying'
  | 'idle_reading'
  | 'reminder_drinking_water'
  | 'reminder_bathroom'
  | 'status_nudge'
  | 'status_sleeping';

/**
 * Distinct center screen-dimming overlay modes.
 */
export type OverlayKind =
  | 'overlay_hydration'
  | 'overlay_bathroom'
  | 'overlay_intervention';

/**
 * State model representing an active or queued center screen overlay.
 */
export interface OverlayState {
  id: string;
  kind: OverlayKind;
  isActive: boolean;
  animationSlot: AnimationSlotId;
  buddyName: string;
  message: string;
  /**
   * Used for `overlay_hydration` (default 300s / 05:00) and
   * `overlay_bathroom` (default 600s / 10:00).
   */
  remainingSeconds?: number;
  /**
   * Used for `overlay_intervention` (e.g., "YouTube", "Reddit", "Steam").
   */
  targetAppOrSite?: string;
  /**
   * Distinguishes website rules ("Minimize <site>") from desktop app rules ("Close <app>").
   */
  targetKind?: 'website' | 'app';
  strictMode?: boolean;
  createdAt: number;
}

/**
 * Configuration and live state for focus and reminder timers.
 */
export interface TimerConfig {
  focusDurationSeconds: number;
  hydrationIntervalSeconds: number;
  hydrationBreakDurationSeconds: number;
  bathroomIntervalSeconds: number;
  bathroomBreakDurationSeconds: number;
  isRunning: boolean;
  elapsedFocusSeconds: number;
  secondsUntilHydration: number;
  secondsUntilBathroom: number;
}

/**
 * Scratchpad document state model (persisted locally on this device).
 * TODO(sync): desktop and mobile notes will sync once the mobile app and backend exist.
 */
export interface ScratchpadNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

/**
 * Window global declaration for the Electron preload bridge.
 */
declare global {
  interface Window {
    buddyAPI?: {
      setIgnoreMouseEvents: (
        ignore: boolean,
        options?: { forward: boolean }
      ) => void;
      exportMarkdown: (
        filename: string,
        content: string
      ) => Promise<{ canceled: boolean; filePath?: string }>;
      openNote: () => Promise<{
        canceled: boolean;
        filePath?: string;
        content?: string;
      }>;
    };
  }
}
