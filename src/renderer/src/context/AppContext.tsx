// src/renderer/src/context/AppContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  AnimationSlotId,
  OverlayKind,
  OverlayState,
  ScratchpadNote,
  ScratchpadSyncStatus,
  TimerConfig,
} from '../types/buddy';

export const SCRATCHPAD_STORAGE_KEY = 'study_buddy_scratchpad';

const DEFAULT_SCRATCHPAD_TEXT = `Chapter 4 – Cell respiration

• Glycolysis: cytoplasm, 2 ATP net
• Krebs cycle: matrix, makes NADH + FADH2
• Electron transport chain: inner membrane, ~28 ATP

TODO: review flashcards before the quiz at 4pm.
Ask Mambo for a break after 25 min.`;

export interface TriggerOverlayOptions {
  targetAppOrSite?: string;
  durationSeconds?: number;
  strictMode?: boolean;
  message?: string;
}

export type OverlayDismissReason =
  | 'completed_hydration'
  | 'completed_bathroom'
  | 'keep_open'
  | 'close_target'
  | 'expired'
  | 'manual_dismiss';

export interface AppContextValue {
  // Buddy Idle/Active Animation Slot
  currentAnimationSlot: AnimationSlotId;
  setCurrentAnimationSlot: (slot: AnimationSlotId) => void;

  // Focus & Break Timer Configuration
  timerConfig: TimerConfig;
  toggleFocusTimer: () => void;
  resetFocusTimer: () => void;

  // Active Overlay & Countdown Timer Engine
  activeOverlay: OverlayState | null;
  overlayQueue: OverlayState[];
  timerSeconds: number;
  isTimerCompleted: boolean;
  triggerOverlay: (kind: OverlayKind, options?: TriggerOverlayOptions) => void;
  addOverlayTime: (additionalSeconds: number) => void;
  extendActiveOverlayTimer: (additionalSeconds: number) => void;
  dismissActiveOverlay: (reason?: OverlayDismissReason) => void;
  resolveOverlay: (reason?: OverlayDismissReason) => void;

  // Scratchpad State & Actions
  scratchpad: ScratchpadNote;
  isScratchpadOpen: boolean;
  isScratchpadMinimized: boolean;
  setScratchpadOpen: (open: boolean) => void;
  setScratchpadMinimized: (minimized: boolean) => void;
  updateScratchpadTitle: (title: string) => void;
  updateScratchpadContent: (content: string) => void;
  clearScratchpadContent: () => void;
  toggleSyncStatus: () => void;
  togglePhoneConnection: () => void;
  exportScratchpadToMarkdown: () => Promise<void>;
  openNoteIntoScratchpad: () => Promise<boolean>;

  // Dynamic Mouse Click-Through Region Tracking
  setInteractiveRegionHovered: (regionId: string, hovered: boolean) => void;
  syncWindowClickThrough: () => void;
}

export const AppContext = createContext<AppContextValue | undefined>(undefined);

/**
 * Plays a gentle synthesized completion chime via Web Audio API when a break
 * countdown reaches 00:00, falling back gracefully if audio is restricted.
 */
function playTimerCompletionCue(kind: OverlayKind): void {
  console.info(
    `[StudyBuddy] Timer reached 00:00 for ${kind}. Waiting for user confirmation.`
  );

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.18); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Ignore audio context autoplay restrictions in headless/browser environments
  }
}

function createOverlayPayload(
  kind: OverlayKind,
  options?: TriggerOverlayOptions
): OverlayState {
  const id = `overlay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  switch (kind) {
    case 'overlay_hydration':
      return {
        id,
        kind: 'overlay_hydration',
        isActive: true,
        animationSlot: 'reminder_drinking_water',
        buddyName: 'Mambo',
        message:
          options?.message ??
          "Wohoo good job so far, don't forget to rehydrate!",
        remainingSeconds: options?.durationSeconds ?? 300, // 05:00
        createdAt: Date.now(),
      };

    case 'overlay_bathroom':
      return {
        id,
        kind: 'overlay_bathroom',
        isActive: true,
        animationSlot: 'reminder_bathroom',
        buddyName: 'Mambo',
        message: options?.message ?? 'Bathroom Break time!',
        remainingSeconds: options?.durationSeconds ?? 600, // 10:00
        createdAt: Date.now(),
      };

    case 'overlay_intervention': {
      const target = options?.targetAppOrSite || 'Discord';
      return {
        id,
        kind: 'overlay_intervention',
        isActive: true,
        animationSlot: 'status_nudge',
        buddyName: 'Mambo',
        message: options?.message ?? `No! Don't go on ${target}`,
        targetAppOrSite: target,
        strictMode: options?.strictMode ?? false,
        createdAt: Date.now(),
      };
    }
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // 1. Buddy Animation Slot State
  const [currentAnimationSlot, setCurrentAnimationSlot] =
    useState<AnimationSlotId>('idle_studying');

  // 2. Focus & Reminder Timers State
  const [timerConfig, setTimerConfig] = useState<TimerConfig>({
    focusDurationSeconds: 25 * 60,
    hydrationIntervalSeconds: 25 * 60,
    hydrationBreakDurationSeconds: 5 * 60,
    bathroomIntervalSeconds: 50 * 60,
    bathroomBreakDurationSeconds: 10 * 60,
    isRunning: true,
    elapsedFocusSeconds: 0,
    secondsUntilHydration: 25 * 60,
    secondsUntilBathroom: 50 * 60,
  });

  // 3. Active Overlay & Countdown Timer State
  const [activeOverlay, setActiveOverlay] = useState<OverlayState | null>(() =>
    createOverlayPayload('overlay_hydration', { durationSeconds: 300 })
  );
  const [overlayQueue, setOverlayQueue] = useState<OverlayState[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number>(300);
  const [isTimerCompleted, setIsTimerCompleted] = useState<boolean>(false);

  // 4. Scratchpad Note Buffer State (Hydrated from 'study_buddy_scratchpad')
  const [scratchpad, setScratchpad] = useState<ScratchpadNote>(() => {
    try {
      const saved = localStorage.getItem(SCRATCHPAD_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ScratchpadNote>;
        if (parsed && typeof parsed.content === 'string') {
          return {
            id: parsed.id || 'default-scratchpad',
            title: parsed.title || 'Chapter 4 – Cell respiration',
            content: parsed.content,
            updatedAt: parsed.updatedAt || Date.now(),
            syncStatus: parsed.syncStatus || 'synced',
            phoneConnected: parsed.phoneConnected ?? true,
            deviceName: parsed.deviceName || 'iPhone',
          };
        }
      }
    } catch {
      // Fall back to default note if storage read fails
    }
    return {
      id: 'default-scratchpad',
      title: 'Chapter 4 – Cell respiration',
      content: DEFAULT_SCRATCHPAD_TEXT,
      updatedAt: Date.now(),
      syncStatus: 'synced',
      phoneConnected: true,
      deviceName: 'iPhone',
    };
  });

  const [isScratchpadOpen, setScratchpadOpen] = useState<boolean>(true);
  const [isScratchpadMinimized, setScratchpadMinimized] =
    useState<boolean>(false);

  // 5. Hovered Interactive Regions Set & Dynamic Click-Through Synchronization
  const hoveredRegionsRef = useRef<Set<string>>(new Set());

  const syncWindowClickThrough = useCallback(() => {
    const shouldCaptureMouse = hoveredRegionsRef.current.size > 0;

    if (window.electronAPI?.setIgnoreMouseEvents) {
      window.electronAPI.setIgnoreMouseEvents(!shouldCaptureMouse, true);
    } else if (window.buddyAPI?.setIgnoreMouseEvents) {
      window.buddyAPI.setIgnoreMouseEvents(!shouldCaptureMouse, {
        forward: true,
      });
    }
  }, []);

  const setInteractiveRegionHovered = useCallback(
    (regionId: string, hovered: boolean) => {
      if (hovered) {
        hoveredRegionsRef.current.add(regionId);
      } else {
        hoveredRegionsRef.current.delete(regionId);
      }
      syncWindowClickThrough();
    },
    [syncWindowClickThrough]
  );

  // Trigger an overlay and initialize its countdown timer
  const triggerOverlay = useCallback(
    (kind: OverlayKind, options?: TriggerOverlayOptions) => {
      const nextOverlay = createOverlayPayload(kind, options);
      const initialDuration =
        typeof nextOverlay.remainingSeconds === 'number'
          ? nextOverlay.remainingSeconds
          : 0;

      setActiveOverlay(nextOverlay);
      setTimerSeconds(initialDuration);
      setIsTimerCompleted(false);
    },
    []
  );

  // Add additional time (+30s, +1m, +5m) to the active overlay countdown
  const addOverlayTime = useCallback((additionalSeconds: number) => {
    setTimerSeconds((prev) => {
      const updated = Math.max(0, prev + additionalSeconds);
      setActiveOverlay((current) =>
        current
          ? {
              ...current,
              remainingSeconds: updated,
            }
          : null
      );
      return updated;
    });
    setIsTimerCompleted(false);
  }, []);

  // Dismiss/resolve active overlay, reset timerSeconds, and set activeOverlay = null
  const dismissActiveOverlay = useCallback(
    (_reason?: OverlayDismissReason) => {
      hoveredRegionsRef.current.delete('center-overlay');
      hoveredRegionsRef.current.delete('center-overlay-card');
      syncWindowClickThrough();

      setTimerSeconds(0);
      setIsTimerCompleted(false);
      setOverlayQueue([]);
      setActiveOverlay(null);
    },
    [syncWindowClickThrough]
  );

  // Internal 1-second setInterval Ticker for Active Overlay & Focus Session
  useEffect(() => {
    const interval = window.setInterval(() => {
      // 1. Decrement active overlay timer if active and timerSeconds > 0
      if (
        activeOverlay &&
        activeOverlay.isActive &&
        (activeOverlay.kind === 'overlay_hydration' ||
          activeOverlay.kind === 'overlay_bathroom')
      ) {
        setTimerSeconds((prevSeconds) => {
          if (prevSeconds <= 0) {
            return 0;
          }

          const nextSeconds = prevSeconds - 1;

          // Keep activeOverlay.remainingSeconds synchronized
          setActiveOverlay((current) =>
            current
              ? {
                  ...current,
                  remainingSeconds: nextSeconds,
                }
              : null
          );

          // When timerSeconds reaches 0, log/play completion and hold waiting state
          if (nextSeconds === 0) {
            setIsTimerCompleted(true);
            playTimerCompletionCue(activeOverlay.kind);
          }

          return nextSeconds;
        });
      }

      // 2. Tick background focus session timers when no overlay is blocking
      setTimerConfig((prev) => {
        if (!prev.isRunning || activeOverlay !== null) {
          return prev;
        }

        const nextHydration = prev.secondsUntilHydration - 1;
        const nextBathroom = prev.secondsUntilBathroom - 1;

        if (nextHydration <= 0) {
          triggerOverlay('overlay_hydration', {
            durationSeconds: prev.hydrationBreakDurationSeconds,
          });
        } else if (nextBathroom <= 0) {
          triggerOverlay('overlay_bathroom', {
            durationSeconds: prev.bathroomBreakDurationSeconds,
          });
        }

        return {
          ...prev,
          elapsedFocusSeconds: prev.elapsedFocusSeconds + 1,
          secondsUntilHydration:
            nextHydration <= 0 ? prev.hydrationIntervalSeconds : nextHydration,
          secondsUntilBathroom:
            nextBathroom <= 0 ? prev.bathroomIntervalSeconds : nextBathroom,
        };
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [activeOverlay, triggerOverlay]);

  const toggleFocusTimer = useCallback(() => {
    setTimerConfig((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  const resetFocusTimer = useCallback(() => {
    setTimerConfig((prev) => ({
      ...prev,
      elapsedFocusSeconds: 0,
      secondsUntilHydration: prev.hydrationIntervalSeconds,
      secondsUntilBathroom: prev.bathroomIntervalSeconds,
    }));
  }, []);

  const updateScratchpadTitle = useCallback((title: string) => {
    setScratchpad((prev) => ({
      ...prev,
      title,
      updatedAt: Date.now(),
    }));
  }, []);

  const updateScratchpadContent = useCallback((content: string) => {
    const inferredTitle =
      content
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0) || 'Untitled Study Note';

    setScratchpad((prev) => ({
      ...prev,
      title: prev.title?.trim() ? prev.title : inferredTitle.slice(0, 60),
      content,
      updatedAt: Date.now(),
    }));
  }, []);

  const clearScratchpadContent = useCallback(() => {
    setScratchpad((prev) => ({
      ...prev,
      title: 'Untitled Study Note',
      content: '',
      updatedAt: Date.now(),
    }));
  }, []);

  const toggleSyncStatus = useCallback(() => {
    setScratchpad((prev) => {
      const nextStatus: ScratchpadSyncStatus =
        prev.syncStatus === 'synced' ? 'offline' : 'synced';
      return {
        ...prev,
        syncStatus: nextStatus,
      };
    });
  }, []);

  const togglePhoneConnection = useCallback(() => {
    setScratchpad((prev) => ({
      ...prev,
      phoneConnected: !prev.phoneConnected,
    }));
  }, []);

  // Export Scratchpad Note as Markdown via Electron IPC or Browser Blob fallback
  const exportScratchpadToMarkdown = useCallback(async () => {
    const safeSlug =
      scratchpad.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'scratchpad-note';
    const filename = `${safeSlug}.md`;

    if (window.electronAPI?.exportMarkdown) {
      try {
        const result = await window.electronAPI.exportMarkdown(
          scratchpad.content,
          filename
        );
        if (!result.canceled || result.filePath) {
          return;
        }
        if (result.canceled && !result.error) {
          return;
        }
      } catch (err) {
        console.warn(
          'Electron exportMarkdown failed, falling back to browser download:',
          err
        );
      }
    }

    const blob = new Blob([scratchpad.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [scratchpad.content, scratchpad.title]);

  const openNoteIntoScratchpad = useCallback(async (): Promise<boolean> => {
    if (window.buddyAPI?.openNote) {
      try {
        const result = await window.buddyAPI.openNote();
        if (!result.canceled && typeof result.content === 'string') {
          updateScratchpadContent(result.content);
          return true;
        }
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }, [updateScratchpadContent]);

  return (
    <AppContext.Provider
      value={{
        currentAnimationSlot,
        setCurrentAnimationSlot,
        timerConfig,
        toggleFocusTimer,
        resetFocusTimer,
        activeOverlay,
        overlayQueue,
        timerSeconds,
        isTimerCompleted,
        triggerOverlay,
        addOverlayTime,
        extendActiveOverlayTimer: addOverlayTime,
        dismissActiveOverlay,
        resolveOverlay: dismissActiveOverlay,
        scratchpad,
        isScratchpadOpen,
        isScratchpadMinimized,
        setScratchpadOpen,
        setScratchpadMinimized,
        updateScratchpadTitle,
        updateScratchpadContent,
        clearScratchpadContent,
        toggleSyncStatus,
        togglePhoneConnection,
        exportScratchpadToMarkdown,
        openNoteIntoScratchpad,
        setInteractiveRegionHovered,
        syncWindowClickThrough,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const AppContextProvider = AppProvider;

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an <AppProvider>');
  }
  return context;
}

export const useAppContext = useApp;

export default AppContext;