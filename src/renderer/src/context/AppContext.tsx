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
import { playChime } from '../utils/audio';

export const SCRATCHPAD_STORAGE_KEY = 'study_buddy_scratchpad';
export const SESSION_STATS_STORAGE_KEY = 'study_buddy_session_stats';

export type SessionStatus = 'idle' | 'focusing' | 'on_break' | 'paused';

export interface SessionStats {
  totalFocusMinutes: number;
  hydrationCount: number;
  breaksCompleted: number;
  lastUpdatedDate: string;
}

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
  silent?: boolean;
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

  // Stage 5 Autonomous Focus Session State & Controls
  sessionStatus: SessionStatus;
  focusTimeRemaining: number;
  focusTargetMinutes: number;
  hydrationIntervalMinutes: number;
  sessionStats: SessionStats;
  setFocusTargetMinutes: (minutes: number) => void;
  setHydrationIntervalMinutes: (minutes: number) => void;
  startFocusSession: () => void;
  pauseFocusSession: () => void;
  toggleFocusSession: () => void;
  skipFocusBlock: () => void;
  resetDailyStats: () => void;

  // Legacy TimerConfig Compatibility
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

function getTodayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadInitialSessionStats(): SessionStats {
  const today = getTodayDateKey();
  try {
    const raw = localStorage.getItem(SESSION_STATS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SessionStats>;
      if (parsed && typeof parsed.totalFocusMinutes === 'number') {
        return {
          totalFocusMinutes: parsed.totalFocusMinutes ?? 0,
          hydrationCount: parsed.hydrationCount ?? 0,
          breaksCompleted: parsed.breaksCompleted ?? 0,
          lastUpdatedDate: parsed.lastUpdatedDate || today,
        };
      }
    }
  } catch {
    // Ignore malformed JSON in localStorage
  }

  return {
    totalFocusMinutes: 0,
    hydrationCount: 0,
    breaksCompleted: 0,
    lastUpdatedDate: today,
  };
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
  // 1. Buddy Animation Slot
  const [currentAnimationSlot, setCurrentAnimationSlot] =
    useState<AnimationSlotId>('idle_studying');

  // 2. Stage 5 Focus Session & Cadence State
  const [focusTargetMinutes, setFocusTargetMinutesState] = useState<number>(25);
  const [hydrationIntervalMinutes, setHydrationIntervalMinutesState] =
    useState<number>(30);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('focusing');
  const [focusTimeRemaining, setFocusTimeRemaining] = useState<number>(25 * 60);

  // Track accumulated seconds toward each focused minute and hydration/bathroom alternation
  const focusedSecondsBufferRef = useRef<number>(0);
  const minutesSinceLastBathroomRef = useRef<number>(0);

  // 3. Persistent Session Analytics ('study_buddy_session_stats')
  const [sessionStats, setSessionStats] = useState<SessionStats>(
    loadInitialSessionStats
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        SESSION_STATS_STORAGE_KEY,
        JSON.stringify(sessionStats)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [sessionStats]);

  // 4. Active Overlay & Break Countdown Engine
  const [activeOverlay, setActiveOverlay] = useState<OverlayState | null>(null);
  const [overlayQueue, setOverlayQueue] = useState<OverlayState[]>([]);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerCompleted, setIsTimerCompleted] = useState<boolean>(false);

  // 5. Legacy TimerConfig State (kept synchronized for compatibility)
  const [timerConfig, setTimerConfig] = useState<TimerConfig>({
    focusDurationSeconds: 25 * 60,
    hydrationIntervalSeconds: 30 * 60,
    hydrationBreakDurationSeconds: 5 * 60,
    bathroomIntervalSeconds: 60 * 60,
    bathroomBreakDurationSeconds: 10 * 60,
    isRunning: true,
    elapsedFocusSeconds: 0,
    secondsUntilHydration: 30 * 60,
    secondsUntilBathroom: 60 * 60,
  });

  // 6. Scratchpad State ('study_buddy_scratchpad')
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
      // Fall back to default note
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

  // 7. Dynamic Click-Through Region Tracking
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

  // Trigger an overlay and play corresponding Web Audio chime
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
      setCurrentAnimationSlot(nextOverlay.animationSlot);

      if (kind === 'overlay_hydration' || kind === 'overlay_bathroom') {
        setSessionStatus('on_break');
      }

      if (!options?.silent) {
        if (kind === 'overlay_intervention') {
          playChime('alert');
        } else {
          playChime('gentle_bell');
        }
      }
    },
    []
  );

  // Add +30s, +1m, or +5m to the active break countdown
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

  // Dismiss overlay, record break/hydration completion stats, and auto-restart next focus block
  const dismissActiveOverlay = useCallback(
    (reason?: OverlayDismissReason) => {
      hoveredRegionsRef.current.delete('center-overlay');
      hoveredRegionsRef.current.delete('center-overlay-card');
      syncWindowClickThrough();

      const dismissedKind = activeOverlay?.kind;

      // Check if user confirmed hydration or bathroom break completion
      const confirmedHydration =
        reason === 'completed_hydration' ||
        (dismissedKind === 'overlay_hydration' && reason !== 'manual_dismiss');

      const confirmedBathroom =
        reason === 'completed_bathroom' ||
        (dismissedKind === 'overlay_bathroom' && reason !== 'manual_dismiss');

      if (confirmedHydration || confirmedBathroom) {
        setSessionStats((prev) => ({
          ...prev,
          hydrationCount: confirmedHydration
            ? prev.hydrationCount + 1
            : prev.hydrationCount,
          breaksCompleted: prev.breaksCompleted + 1,
          lastUpdatedDate: getTodayDateKey(),
        }));

        // Automatically restart the next focus block
        setFocusTimeRemaining(focusTargetMinutes * 60);
        setSessionStatus('focusing');
        setCurrentAnimationSlot('idle_studying');
        playChime('break_start');
      } else if (sessionStatus === 'on_break') {
        // If manually dismissed from Dev Bar during a break, return to focusing
        setFocusTimeRemaining(focusTargetMinutes * 60);
        setSessionStatus('focusing');
        setCurrentAnimationSlot('idle_studying');
      }

      setTimerSeconds(0);
      setIsTimerCompleted(false);
      setOverlayQueue([]);
      setActiveOverlay(null);
    },
    [
      activeOverlay,
      focusTargetMinutes,
      sessionStatus,
      syncWindowClickThrough,
    ]
  );

  // Master 1-Second Scheduler & Overlay Countdown Engine
  useEffect(() => {
    const interval = window.setInterval(() => {
      // 1. If a timed break overlay is active, decrement its countdown
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

          setActiveOverlay((current) =>
            current
              ? {
                  ...current,
                  remainingSeconds: nextSeconds,
                }
              : null
          );

          if (nextSeconds === 0) {
            setIsTimerCompleted(true);
            playChime('break_start');
          }

          return nextSeconds;
        });
        return;
      }

      // 2. If session is actively focusing and no overlay is blocking, decrement focusTimeRemaining
      if (sessionStatus === 'focusing' && activeOverlay === null) {
        // Track every 60 seconds of active focus to increment totalFocusMinutes
        focusedSecondsBufferRef.current += 1;
        if (focusedSecondsBufferRef.current >= 60) {
          focusedSecondsBufferRef.current -= 60;
          minutesSinceLastBathroomRef.current += 1;

          setSessionStats((prev) => ({
            ...prev,
            totalFocusMinutes: prev.totalFocusMinutes + 1,
            lastUpdatedDate: getTodayDateKey(),
          }));
        }

        setFocusTimeRemaining((prevRemaining) => {
          if (prevRemaining <= 1) {
            // Focus interval hit 0: decide between bathroom break vs hydration reminder
            const shouldTriggerBathroom =
              minutesSinceLastBathroomRef.current >=
              hydrationIntervalMinutes * 2;

            if (shouldTriggerBathroom) {
              minutesSinceLastBathroomRef.current = 0;
              triggerOverlay('overlay_bathroom', { durationSeconds: 600 });
            } else {
              triggerOverlay('overlay_hydration', { durationSeconds: 300 });
            }

            return 0;
          }

          return prevRemaining - 1;
        });

        setTimerConfig((prev) => ({
          ...prev,
          isRunning: true,
          elapsedFocusSeconds: prev.elapsedFocusSeconds + 1,
        }));
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [
    activeOverlay,
    hydrationIntervalMinutes,
    sessionStatus,
    triggerOverlay,
  ]);

  // Stage 5 Focus Controller Actions
  const setFocusTargetMinutes = useCallback(
    (minutes: number) => {
      const clamped = Math.max(1, Math.min(180, minutes));
      setFocusTargetMinutesState(clamped);
      if (sessionStatus !== 'on_break') {
        setFocusTimeRemaining(clamped * 60);
      }
    },
    [sessionStatus]
  );

  const setHydrationIntervalMinutes = useCallback((minutes: number) => {
    const clamped = Math.max(5, Math.min(180, minutes));
    setHydrationIntervalMinutesState(clamped);
  }, []);

  const startFocusSession = useCallback(() => {
    if (focusTimeRemaining <= 0) {
      setFocusTimeRemaining(focusTargetMinutes * 60);
    }
    setSessionStatus('focusing');
    setCurrentAnimationSlot('idle_studying');
  }, [focusTargetMinutes, focusTimeRemaining]);

  const pauseFocusSession = useCallback(() => {
    setSessionStatus('paused');
    setCurrentAnimationSlot('status_sleeping');
  }, []);

  const toggleFocusSession = useCallback(() => {
    setSessionStatus((prev) => {
      if (prev === 'focusing') {
        setCurrentAnimationSlot('status_sleeping');
        return 'paused';
      }
      if (focusTimeRemaining <= 0) {
        setFocusTimeRemaining(focusTargetMinutes * 60);
      }
      setCurrentAnimationSlot('idle_studying');
      return 'focusing';
    });
  }, [focusTargetMinutes, focusTimeRemaining]);

  // Allows skipping the remainder of the current focus block to immediately trigger the scheduled break
  const skipFocusBlock = useCallback(() => {
    const earnedMinutes = Math.max(
      1,
      Math.round((focusTargetMinutes * 60 - focusTimeRemaining) / 60)
    );

    setSessionStats((prev) => ({
      ...prev,
      totalFocusMinutes: prev.totalFocusMinutes + earnedMinutes,
      lastUpdatedDate: getTodayDateKey(),
    }));

    minutesSinceLastBathroomRef.current += focusTargetMinutes;
    const shouldTriggerBathroom =
      minutesSinceLastBathroomRef.current >= hydrationIntervalMinutes * 2;

    if (shouldTriggerBathroom) {
      minutesSinceLastBathroomRef.current = 0;
      triggerOverlay('overlay_bathroom', { durationSeconds: 600 });
    } else {
      triggerOverlay('overlay_hydration', { durationSeconds: 300 });
    }
  }, [
    focusTargetMinutes,
    focusTimeRemaining,
    hydrationIntervalMinutes,
    triggerOverlay,
  ]);

  const resetDailyStats = useCallback(() => {
    const fresh: SessionStats = {
      totalFocusMinutes: 0,
      hydrationCount: 0,
      breaksCompleted: 0,
      lastUpdatedDate: getTodayDateKey(),
    };
    focusedSecondsBufferRef.current = 0;
    minutesSinceLastBathroomRef.current = 0;
    setSessionStats(fresh);
    try {
      localStorage.setItem(SESSION_STATS_STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // Ignore storage write error
    }
  }, []);

  // Legacy TimerConfig methods mapped to new Focus Session controls
  const toggleFocusTimer = toggleFocusSession;
  const resetFocusTimer = useCallback(() => {
    setFocusTimeRemaining(focusTargetMinutes * 60);
    setSessionStatus('idle');
  }, [focusTargetMinutes]);

  // Scratchpad State Handlers
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
        sessionStatus,
        focusTimeRemaining,
        focusTargetMinutes,
        hydrationIntervalMinutes,
        sessionStats,
        setFocusTargetMinutes,
        setHydrationIntervalMinutes,
        startFocusSession,
        pauseFocusSession,
        toggleFocusSession,
        skipFocusBlock,
        resetDailyStats,
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