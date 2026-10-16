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
   * Used for `overlay_intervention` (e.g., "Discord", "YouTube", "Twitter").
   */
  targetAppOrSite?: string;
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
 * Sync status displayed in the Scratchpad header pill.
 */
export type ScratchpadSyncStatus = 'synced' | 'offline' | 'syncing';

/**
 * Scratchpad document state model.
 */
export interface ScratchpadNote {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  syncStatus: ScratchpadSyncStatus;
  phoneConnected: boolean;
  deviceName?: string;
}

/**
 * Window global declaration for the Electron preload bridge.
 */
declare global {
  interface Window {
    buddyAPI?: {
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
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