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

const SCRATCHPAD_STORAGE_KEY = 'study_buddy_scratchpad_note_v1';

const DEFAULT_SCRATCHPAD_TEXT = `Chapter 4 – Cell respiration

• Glycolysis: cytoplasm, 2 ATP net
• Krebs cycle: matrix, makes NADH + FADH2
• Electron transport chain: inner membrane, ~28 ATP

TODO: review flashcards before the quiz at 4pm.
Ask Mambo for a break after 25 min.`;

interface TriggerOverlayOptions {
  targetAppOrSite?: string;
  durationSeconds?: number;
  strictMode?: boolean;
}

interface AppContextValue {
  // Buddy Idle/Active Animation Slot
  currentAnimationSlot: AnimationSlotId;
  setCurrentAnimationSlot: (slot: AnimationSlotId) => void;

  // Focus & Break Timer Configuration
  timerConfig: TimerConfig;
  toggleFocusTimer: () => void;
  resetFocusTimer: () => void;

  // Overlays (Active + FIFO Queue)
  activeOverlay: OverlayState | null;
  overlayQueue: OverlayState[];
  triggerOverlay: (kind: OverlayKind, options?: TriggerOverlayOptions) => void;
  dismissActiveOverlay: (
    reason?:
      | 'completed_hydration'
      | 'completed_bathroom'
      | 'keep_open'
      | 'close_target'
      | 'expired'
  ) => void;
  extendActiveOverlayTimer: (additionalSeconds: number) => void;

  // Scratchpad State & Actions
  scratchpad: ScratchpadNote;
  isScratchpadOpen: boolean;
  isScratchpadMinimized: boolean;
  setScratchpadOpen: (open: boolean) => void;
  setScratchpadMinimized: (minimized: boolean) => void;
  updateScratchpadContent: (content: string) => void;
  clearScratchpadContent: () => void;
  toggleSyncStatus: () => void;
  togglePhoneConnection: () => void;
  exportScratchpadToMarkdown: () => Promise<void>;
  openNoteIntoScratchpad: () => Promise<boolean>;

  // Dynamic Mouse Click-Through Region Tracking
  setInteractiveRegionHovered: (regionId: string, hovered: boolean) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

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
        message: "Wohoo good job so far, don't forget to rehydrate!",
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
        message: 'Bathroom Break time!',
        remainingSeconds: options?.durationSeconds ?? 600, // 10:00
        createdAt: Date.now(),
      };

    case 'overlay_intervention':
      const target = options?.targetAppOrSite || 'Discord';
      return {
        id,
        kind: 'overlay_intervention',
        isActive: true,
        animationSlot: 'status_nudge',
        buddyName: 'Mambo',
        message: `No! Don't go on ${target}`,
        targetAppOrSite: target,
        strictMode: options?.strictMode ?? false,
        createdAt: Date.now(),
      };
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentAnimationSlot, setCurrentAnimationSlot] =
    useState<AnimationSlotId>('idle_studying');

  // Focus & Reminder Timers
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

  // Active Overlay & Queue
  const [activeOverlay, setActiveOverlay] = useState<OverlayState | null>(() =>
    createOverlayPayload('overlay_hydration')
  );
  const [overlayQueue, setOverlayQueue] = useState<OverlayState[]>([]);

  // Scratchpad State with LocalStorage Persistence
  const [scratchpad, setScratchpad] = useState<ScratchpadNote>(() => {
    try {
      const saved = localStorage.getItem(SCRATCHPAD_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as ScratchpadNote;
      }
    } catch {
      // Ignore storage read errors
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

  // Track which interactive regions (center overlay card, scratchpad, HUD) currently
  // have the cursor inside them. When the set is empty, click-through is enabled.
  const hoveredRegionsRef = useRef<Set<string>>(new Set());

  const syncWindowClickThrough = useCallback(() => {
    const shouldCaptureMouse = hoveredRegionsRef.current.size > 0;
    if (window.buddyAPI?.setIgnoreMouseEvents) {
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

  // Auto-save scratchpad note to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SCRATCHPAD_STORAGE_KEY, JSON.stringify(scratchpad));
    } catch {
      // Ignore storage quota errors
    }
  }, [scratchpad]);

  // Queue or immediately display an overlay
  const triggerOverlay = useCallback(
    (kind: OverlayKind, options?: TriggerOverlayOptions) => {
      const nextOverlay = createOverlayPayload(kind, options);
      setActiveOverlay((current) => {
        if (!current) {
          return nextOverlay;
        }
        setOverlayQueue((q) => [...q, nextOverlay]);
        return current;
      });
    },
    []
  );

  // Dismiss current overlay and advance queue if non-empty
  const dismissActiveOverlay = useCallback(() => {
    hoveredRegionsRef.current.delete('center-overlay');
    syncWindowClickThrough();

    setOverlayQueue((currentQueue) => {
      if (currentQueue.length > 0) {
        const [next, ...rest] = currentQueue;
        setActiveOverlay(next);
        return rest;
      } else {
        setActiveOverlay(null);
        return [];
      }
    });
  }, [syncWindowClickThrough]);

  // Add +30s / +1m / +5m to the active overlay countdown
  const extendActiveOverlayTimer = useCallback((additionalSeconds: number) => {
    setActiveOverlay((current) => {
      if (!current || typeof current.remainingSeconds !== 'number') {
        return current;
      }
      return {
        ...current,
        remainingSeconds: Math.max(0, current.remainingSeconds + additionalSeconds),
      };
    });
  }, []);

  // 1-second Master Ticker for Focus Session & Active Overlay Countdown
  useEffect(() => {
    const interval = window.setInterval(() => {
      // 1. Tick active overlay countdown if one is open with a timer
      setActiveOverlay((current) => {
        if (
          !current ||
          typeof current.remainingSeconds !== 'number' ||
          current.remainingSeconds <= 0
        ) {
          return current;
        }
        return {
          ...current,
          remainingSeconds: current.remainingSeconds - 1,
        };
      });

      // 2. Tick focus & reminder intervals when no blocking break overlay is active
      setTimerConfig((prev) => {
        if (!prev.isRunning) return prev;

        const nextHydration = prev.secondsUntilHydration - 1;
        const nextBathroom = prev.secondsUntilBathroom - 1;

        if (nextHydration <= 0) {
          triggerOverlay('overlay_hydration', {
            durationSeconds: prev.hydrationBreakDurationSeconds,
          });
        }

        if (nextBathroom <= 0) {
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
  }, [triggerOverlay]);

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

  const updateScratchpadContent = useCallback((content: string) => {
    const firstLine =
      content
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.length > 0) || 'Untitled Study Note';

    setScratchpad((prev) => ({
      ...prev,
      title: firstLine.slice(0, 60),
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

  const exportScratchpadToMarkdown = useCallback(async () => {
    const safeSlug =
      scratchpad.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'scratchpad-note';
    const filename = `${safeSlug}.md`;

    // Try native Electron Save dialog first if running in Electron shell
    if (window.buddyAPI?.exportMarkdown) {
      try {
        await window.buddyAPI.exportMarkdown(filename, scratchpad.content);
        return;
      } catch {
        // Fallback to browser anchor download below
      }
    }

    // Standard Blob download so it works immediately in Codespaces browser preview too
    const blob = new Blob([scratchpad.content], {
      type: 'text/markdown;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        triggerOverlay,
        dismissActiveOverlay,
        extendActiveOverlayTimer,
        scratchpad,
        isScratchpadOpen,
        isScratchpadMinimized,
        setScratchpadOpen,
        setScratchpadMinimized,
        updateScratchpadContent,
        clearScratchpadContent,
        toggleSyncStatus,
        togglePhoneConnection,
        exportScratchpadToMarkdown,
        openNoteIntoScratchpad,
        setInteractiveRegionHovered,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used inside an <AppProvider>');
  }
  return ctx;
}