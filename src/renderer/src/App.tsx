// src/renderer/src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppProvider,
  useApp,
  TriggerOverlayOptions,
} from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavTabId } from './components/layout/Sidebar';
import { SessionView } from './components/views/SessionView';
import { RemindersView } from './components/views/RemindersView';
import { ScheduleView } from './components/views/ScheduleView';
import {
  AppRulesView,
  AppRuleItem,
} from './components/views/AppRulesView';
import { ProgressView } from './components/views/ProgressView';
import { BuddyStudioView } from './components/views/BuddyStudioView';
import { MarketplaceView } from './components/views/MarketplaceView';
import { SettingsView } from './components/views/SettingsView';
import { CenterOverlay } from './components/overlays/CenterOverlay';
import { Scratchpad, WindowRect } from './components/scratchpad/Scratchpad';
import { FloatingMascotDock } from './components/companion/FloatingMascotDock';
import { OverlayKind } from './types/buddy';
import type {
  OverlayTriggerType,
  OverlayTriggerPayload,
} from '../../preload/index.d';

const TAB_LABELS: Record<NavTabId, string> = {
  session: 'Session',
  reminders: 'Reminders',
  schedule: 'Schedule',
  app_rules: 'App rules',
  progress: 'Progress',
  buddy: 'Buddy',
  marketplace: 'Marketplace',
  settings: 'Settings',
};

const INITIAL_APP_RULES: AppRuleItem[] = [
  {
    id: 'rule-discord',
    kind: 'app',
    targetName: 'Discord',
    domainOrProcess: 'Discord.exe',
    category: 'Chat',
    strictBlock: false,
    enabled: true,
  },
  {
    id: 'rule-youtube',
    kind: 'website',
    targetName: 'YouTube',
    domainOrProcess: 'youtube.com',
    category: 'Video',
    strictBlock: false,
    enabled: true,
  },
  {
    id: 'rule-reddit',
    kind: 'website',
    targetName: 'Reddit',
    domainOrProcess: 'reddit.com',
    category: 'Social',
    strictBlock: false,
    enabled: true,
  },
  {
    id: 'rule-twitter',
    kind: 'website',
    targetName: 'Twitter',
    domainOrProcess: 'x.com / twitter.com',
    category: 'Social',
    strictBlock: true,
    enabled: true,
  },
  {
    id: 'rule-twitch',
    kind: 'website',
    targetName: 'Twitch',
    domainOrProcess: 'twitch.tv',
    category: 'Video',
    strictBlock: false,
    enabled: true,
  },
];

const VIEWPORT_PADDING = 12;
const COLLISION_GAP = 12;

function clampRectToViewport(rect: WindowRect): WindowRect {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  const width = Math.min(rect.width, vw - VIEWPORT_PADDING * 2);
  const height = Math.min(rect.height, vh - VIEWPORT_PADDING * 2);
  const x = Math.max(
    VIEWPORT_PADDING,
    Math.min(vw - width - VIEWPORT_PADDING, rect.x)
  );
  const y = Math.max(
    VIEWPORT_PADDING,
    Math.min(vh - height - VIEWPORT_PADDING, rect.y)
  );
  return { x, y, width, height };
}

function rectsOverlap(a: WindowRect, b: WindowRect, gap = COLLISION_GAP): boolean {
  return (
    a.x < b.x + b.width + gap &&
    a.x + a.width + gap > b.x &&
    a.y < b.y + b.height + gap &&
    a.y + a.height + gap > b.y
  );
}

/**
 * Resolves a collision when `moving` is dragged or resized against `obstacle`,
 * clamping `moving` along the axis of minimum penetration so it never enters `obstacle`.
 */
function clampMovingRectAgainstObstacle(
  moving: WindowRect,
  obstacle: WindowRect,
  interaction: 'drag' | 'resize'
): WindowRect {
  const clamped = clampRectToViewport(moving);
  if (!rectsOverlap(clamped, obstacle)) {
    return clamped;
  }

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;

  // Calculate penetration depths in all 4 cardinal directions
  const pushLeftX = obstacle.x - COLLISION_GAP - clamped.width;
  const pushRightX = obstacle.x + obstacle.width + COLLISION_GAP;
  const pushUpY = obstacle.y - COLLISION_GAP - clamped.height;
  const pushDownY = obstacle.y + obstacle.height + COLLISION_GAP;

  if (interaction === 'resize') {
    const updated = { ...clamped };
    if (
      clamped.x < obstacle.x &&
      clamped.x + clamped.width + COLLISION_GAP > obstacle.x
    ) {
      updated.width = Math.max(340, obstacle.x - COLLISION_GAP - clamped.x);
    }
    if (
      clamped.y < obstacle.y &&
      clamped.y + clamped.height + COLLISION_GAP > obstacle.y
    ) {
      updated.height = Math.max(360, obstacle.y - COLLISION_GAP - clamped.y);
    }
    return clampRectToViewport(updated);
  }

  const candidates: Array<{ dist: number; rect: WindowRect }> = [];

  if (pushLeftX >= VIEWPORT_PADDING) {
    candidates.push({
      dist: Math.abs(clamped.x - pushLeftX),
      rect: { ...clamped, x: pushLeftX },
    });
  }
  if (pushRightX + clamped.width <= vw - VIEWPORT_PADDING) {
    candidates.push({
      dist: Math.abs(clamped.x - pushRightX),
      rect: { ...clamped, x: pushRightX },
    });
  }
  if (pushUpY >= VIEWPORT_PADDING) {
    candidates.push({
      dist: Math.abs(clamped.y - pushUpY),
      rect: { ...clamped, y: pushUpY },
    });
  }
  if (pushDownY + clamped.height <= vh - VIEWPORT_PADDING) {
    candidates.push({
      dist: Math.abs(clamped.y - pushDownY),
      rect: { ...clamped, y: pushDownY },
    });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => a.dist - b.dist);
    return clampRectToViewport(candidates[0].rect);
  }

  // Fallback hard horizontal clamp: desktopRect.x + desktopRect.width <= notepadRect.x
  if (clamped.x <= obstacle.x) {
    return clampRectToViewport({
      ...clamped,
      x: Math.max(VIEWPORT_PADDING, obstacle.x - COLLISION_GAP - clamped.width),
    });
  }
  return clampRectToViewport({
    ...clamped,
    x: Math.min(
      vw - clamped.width - VIEWPORT_PADDING,
      obstacle.x + obstacle.width + COLLISION_GAP
    ),
  });
}

const StudyBuddyViewport: React.FC = () => {
  const {
    activeOverlay,
    triggerOverlay,
    dismissActiveOverlay,
    isScratchpadOpen,
    setScratchpadOpen,
    isScratchpadMinimized,
    setInteractiveRegionHovered,
    syncWindowClickThrough,
  } = useApp();

  const [activeTab, setActiveTab] = useState<NavTabId>('session');
  const [isDashboardVisible, setIsDashboardVisible] = useState<boolean>(true);
  const [isDevBarCollapsed, setIsDevBarCollapsed] = useState<boolean>(false);
  const [appRules, setAppRules] = useState<AppRuleItem[]>(INITIAL_APP_RULES);

  // Track Desktop App Window Rect & Notepad Window Rect for Mutual Collision Bounding
  const [desktopRect, setDesktopRect] = useState<WindowRect>(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
    const width = Math.min(960, Math.max(760, vw - 440));
    const height = Math.min(680, Math.max(600, vh - 80));
    return {
      x: VIEWPORT_PADDING,
      y: Math.max(VIEWPORT_PADDING, Math.round((vh - height) / 2)),
      width,
      height,
    };
  });

  const [notepadRect, setNotepadRect] = useState<WindowRect>(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
    const width = 390;
    const height = 560;
    return {
      x: Math.max(VIEWPORT_PADDING, vw - width - VIEWPORT_PADDING),
      y: Math.max(VIEWPORT_PADDING, Math.round((vh - height) / 2)),
      width,
      height,
    };
  });

  const desktopRectRef = useRef<WindowRect>(desktopRect);
  desktopRectRef.current = desktopRect;

  const notepadRectRef = useRef<WindowRect>(notepadRect);
  notepadRectRef.current = notepadRect;

  const desktopDragOffsetRef = useRef<{
    startX: number;
    startY: number;
  } | null>(null);

  const handleInteractiveRegionHover = useCallback(
    (regionId: string, isHovered: boolean) => {
      setInteractiveRegionHovered(regionId, isHovered);
      syncWindowClickThrough();
    },
    [setInteractiveRegionHovered, syncWindowClickThrough]
  );

  // Ensure non-overlapping layout whenever Notepad is opened alongside Desktop Window
  useEffect(() => {
    if (!isDashboardVisible || !isScratchpadOpen) return;
    const currentDesktop = desktopRectRef.current;
    const currentNotepad = {
      ...notepadRectRef.current,
      height: isScratchpadMinimized ? 60 : notepadRectRef.current.height,
    };

    if (rectsOverlap(currentDesktop, currentNotepad)) {
      const vw = typeof window !== 'undefined' ? window.innerWidth : 1440;
      const availableDesktopWidth = Math.max(
        680,
        vw - currentNotepad.width - VIEWPORT_PADDING * 2 - COLLISION_GAP
      );
      const nextDesktop: WindowRect = clampRectToViewport({
        ...currentDesktop,
        x: VIEWPORT_PADDING,
        width: Math.min(currentDesktop.width, availableDesktopWidth),
      });
      const nextNotepad: WindowRect = clampRectToViewport({
        ...notepadRectRef.current,
        x: nextDesktop.x + nextDesktop.width + COLLISION_GAP,
      });
      setDesktopRect(nextDesktop);
      setNotepadRect(nextNotepad);
    }
  }, [isDashboardVisible, isScratchpadOpen, isScratchpadMinimized]);

  // Listen for custom navigation events (e.g., from MarketplaceView)
  useEffect(() => {
    const handleNavigateEvent = (e: Event) => {
      const customEvent = e as CustomEvent<NavTabId>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('study-buddy:navigate-tab', handleNavigateEvent);
    return () =>
      window.removeEventListener(
        'study-buddy:navigate-tab',
        handleNavigateEvent
      );
  }, []);

  /**
   * Updates `desktopRect` during drag or resize while preventing collision with `notepadRect`.
   */
  const updateDesktopRectWithCollision = useCallback(
    (candidate: WindowRect, interaction: 'drag' | 'resize') => {
      const clampedCandidate = clampRectToViewport(candidate);
      if (!isScratchpadOpen) {
        setDesktopRect(clampedCandidate);
        return;
      }

      const effectiveNotepad: WindowRect = {
        ...notepadRectRef.current,
        height: isScratchpadMinimized ? 60 : notepadRectRef.current.height,
      };

      if (!rectsOverlap(clampedCandidate, effectiveNotepad)) {
        setDesktopRect(clampedCandidate);
        return;
      }

      // Clamp Desktop Window so it never overlaps the Notepad
      const resolvedDesktop = clampMovingRectAgainstObstacle(
        clampedCandidate,
        effectiveNotepad,
        interaction
      );
      setDesktopRect(resolvedDesktop);
    },
    [isScratchpadOpen, isScratchpadMinimized]
  );

  /**
   * Updates `notepadRect` during drag or resize while preventing penetration into `desktopRect`.
   */
  const updateNotepadRectWithCollision = useCallback(
    (candidate: WindowRect, interaction: 'drag' | 'resize') => {
      const clampedCandidate = clampRectToViewport(candidate);
      if (!isDashboardVisible) {
        setNotepadRect(clampedCandidate);
        return;
      }

      const effectiveCandidate: WindowRect = {
        ...clampedCandidate,
        height: isScratchpadMinimized ? 60 : clampedCandidate.height,
      };

      if (!rectsOverlap(effectiveCandidate, desktopRectRef.current)) {
        setNotepadRect(clampedCandidate);
        return;
      }

      const resolvedEffective = clampMovingRectAgainstObstacle(
        effectiveCandidate,
        desktopRectRef.current,
        interaction
      );

      setNotepadRect({
        ...clampedCandidate,
        x: resolvedEffective.x,
        y: resolvedEffective.y,
        width: resolvedEffective.width,
        height: isScratchpadMinimized
          ? clampedCandidate.height
          : resolvedEffective.height,
      });
    },
    [isDashboardVisible, isScratchpadMinimized]
  );

  // Desktop App Header Dragging within the Workspace
  const handleDesktopHeaderMouseDown = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if ((e.target as HTMLElement).closest('button, input, select, a, [data-no-drag="true"]')) {
      return;
    }

    const startRect = desktopRectRef.current;
    desktopDragOffsetRef.current = {
      startX: e.clientX - startRect.x,
      startY: e.clientY - startRect.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!desktopDragOffsetRef.current) return;
      const current = desktopRectRef.current;
      updateDesktopRectWithCollision(
        {
          ...current,
          x: moveEvent.clientX - desktopDragOffsetRef.current.startX,
          y: moveEvent.clientY - desktopDragOffsetRef.current.startY,
        },
        'drag'
      );
    };

    const handleMouseUp = () => {
      desktopDragOffsetRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Desktop App Edge / Corner Resizing with Collision Bounding
  const handleStartDesktopResize = (
    e: React.MouseEvent,
    direction: 'right' | 'bottom' | 'corner'
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startRect = desktopRectRef.current;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      updateDesktopRectWithCollision(
        {
          ...startRect,
          width:
            direction === 'right' || direction === 'corner'
              ? Math.max(680, Math.min(1260, startRect.width + deltaX))
              : startRect.width,
          height:
            direction === 'bottom' || direction === 'corner'
              ? Math.max(540, Math.min(860, startRect.height + deltaY))
              : startRect.height,
        },
        'resize'
      );
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const activateOverlayImmediately = useCallback(
    (kind: OverlayKind, options?: TriggerOverlayOptions) => {
      if (activeOverlay !== null) {
        dismissActiveOverlay('manual_dismiss');
        window.setTimeout(() => {
          triggerOverlay(kind, options);
        }, 0);
      } else {
        triggerOverlay(kind, options);
      }
    },
    [activeOverlay, dismissActiveOverlay, triggerOverlay]
  );

  useEffect(() => {
    if (isDashboardVisible) {
      setInteractiveRegionHovered('floating-mascot-dock-shell', false);
      setInteractiveRegionHovered('floating-mascot-dock', false);
    } else {
      setInteractiveRegionHovered('main-dashboard-shell', false);
    }
    syncWindowClickThrough();
  }, [isDashboardVisible, setInteractiveRegionHovered, syncWindowClickThrough]);

  useEffect(() => {
    syncWindowClickThrough();

    if (!window.electronAPI?.onTriggerOverlay) {
      return;
    }

    const unsubscribe = window.electronAPI.onTriggerOverlay(
      (type: OverlayTriggerType, payload?: OverlayTriggerPayload) => {
        if (type === 'hydration') {
          activateOverlayImmediately('overlay_hydration', {
            durationSeconds: payload?.durationSeconds ?? 300,
            message: payload?.message,
          });
        } else if (type === 'bathroom') {
          activateOverlayImmediately('overlay_bathroom', {
            durationSeconds: payload?.durationSeconds ?? 600,
            message: payload?.message,
          });
        } else if (type === 'intervention') {
          activateOverlayImmediately('overlay_intervention', {
            targetAppOrSite: payload?.targetAppOrSite ?? 'YouTube',
            strictMode: payload?.strictMode ?? false,
            message: payload?.message,
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [syncWindowClickThrough, activateOverlayImmediately]);

  const handleToggleRuleEnabled = (id: string) => {
    setAppRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleToggleRuleStrict = (id: string) => {
    setAppRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, strictBlock: !r.strictBlock } : r
      )
    );
  };

  const handleAddRule = (
    targetName: string,
    domainOrProcess: string,
    kind: 'website' | 'app' = 'website'
  ) => {
    setAppRules((prev) => [
      {
        id: `rule-${Date.now()}`,
        kind,
        targetName,
        domainOrProcess,
        category: kind === 'app' ? 'Gaming' : 'Social',
        strictBlock: false,
        enabled: true,
      },
      ...prev,
    ]);
  };

  return (
    <div className="w-screen h-screen fixed inset-0 overflow-hidden pointer-events-none select-none font-sans">
      {/* 1. EXCLUSIVE MODE A: Draggable & Resizable Study Buddy Desktop Window */}
      {isDashboardVisible && (
        <div
          onMouseEnter={() =>
            handleInteractiveRegionHover('main-dashboard-shell', true)
          }
          onMouseLeave={() =>
            handleInteractiveRegionHover('main-dashboard-shell', false)
          }
          style={{
            left: `${desktopRect.x}px`,
            top: `${desktopRect.y}px`,
            width: `${desktopRect.width}px`,
            height: `${desktopRect.height}px`,
          }}
          className="fixed z-30 pointer-events-auto flex flex-col overflow-hidden rounded-[24px] border border-[#322A4B] bg-[#141020] shadow-[0_32px_90px_rgba(0,0,0,0.85)]"
        >
          {/* Draggable Global Window Header */}
          <div onMouseDown={handleDesktopHeaderMouseDown} className="cursor-move">
            <Header
              isScratchpadOpen={isScratchpadOpen}
              onToggleScratchpad={() => setScratchpadOpen(!isScratchpadOpen)}
              onMinimizeToCompanion={() => setIsDashboardVisible(false)}
              activeTabLabel={TAB_LABELS[activeTab]}
            />
          </div>

          {/* Sidebar + Active View Body */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

            <main className="flex-1 overflow-y-auto bg-[#141020]">
              {activeTab === 'session' && <SessionView />}
              {activeTab === 'reminders' && <RemindersView />}
              {activeTab === 'schedule' && <ScheduleView />}
              {activeTab === 'app_rules' && (
                <AppRulesView
                  rules={appRules}
                  onToggleRuleEnabled={handleToggleRuleEnabled}
                  onToggleRuleStrict={handleToggleRuleStrict}
                  onAddRule={handleAddRule}
                />
              )}
              {activeTab === 'progress' && <ProgressView />}
              {activeTab === 'buddy' && <BuddyStudioView />}
              {activeTab === 'marketplace' && (
                <MarketplaceView
                  onNavigateToBuddy={() => setActiveTab('buddy')}
                />
              )}
              {activeTab === 'settings' && <SettingsView />}
            </main>
          </div>

          {/* Desktop Window Resize Handles (Right, Bottom, Bottom-Right Corner) */}
          <div
            onMouseDown={(e) => handleStartDesktopResize(e, 'right')}
            className="absolute top-12 right-0 bottom-4 w-1.5 cursor-ew-resize"
          />
          <div
            onMouseDown={(e) => handleStartDesktopResize(e, 'bottom')}
            className="absolute bottom-0 left-4 right-4 h-1.5 cursor-ns-resize"
          />
          <div
            onMouseDown={(e) => handleStartDesktopResize(e, 'corner')}
            title="Drag to resize Study Buddy window"
            className="absolute bottom-1 right-1 z-30 flex h-4 w-4 cursor-nwse-resize items-end justify-end p-0.5 text-[#9490A8] hover:text-[#A594F9]"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M9 1L1 9M9 5L5 9M9 8.5L8.5 9"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      )}

      {/* 2. EXCLUSIVE MODE B: Compact Floating Mambo Companion Dock */}
      {!isDashboardVisible && activeOverlay === null && (
        <div
          className="pointer-events-auto"
          onMouseEnter={() =>
            handleInteractiveRegionHover('floating-mascot-dock-shell', true)
          }
          onMouseLeave={() =>
            handleInteractiveRegionHover('floating-mascot-dock-shell', false)
          }
        >
          <FloatingMascotDock
            isDashboardVisible={isDashboardVisible}
            onExpandToFullWindow={() => setIsDashboardVisible(true)}
          />
        </div>
      )}

      {/* 3. Floating Resizable & Collision-Bounded Notepad */}
      <div
        className="pointer-events-auto"
        onMouseEnter={() =>
          handleInteractiveRegionHover('scratchpad-shell', true)
        }
        onMouseLeave={() =>
          handleInteractiveRegionHover('scratchpad-shell', false)
        }
      >
        <Scratchpad
          rect={notepadRect}
          onRectChange={updateNotepadRectWithCollision}
        />
      </div>

      {/* 4. Conditional Fullscreen Dimmed Backdrop & Center Overlay Modal */}
      {activeOverlay !== null && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none transition-opacity duration-300"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="pointer-events-auto [&>div]:!bg-transparent [&>div]:pointer-events-none [&>div>div]:pointer-events-auto"
            onMouseEnter={() =>
              handleInteractiveRegionHover('center-overlay-card', true)
            }
            onMouseLeave={() =>
              handleInteractiveRegionHover('center-overlay-card', false)
            }
          >
            <CenterOverlay />
          </div>
        </div>
      )}

      {/* 5. Floating Collapsible Dev Trigger Bar */}
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 pointer-events-none">
        <div
          onMouseEnter={() =>
            handleInteractiveRegionHover('dev-trigger-bar', true)
          }
          onMouseLeave={() =>
            handleInteractiveRegionHover('dev-trigger-bar', false)
          }
          className="bg-zinc-900/90 border border-zinc-700 text-white rounded-full px-4 py-2 text-xs flex items-center gap-2 shadow-2xl pointer-events-auto backdrop-blur-md transition-all duration-200"
        >
          <button
            type="button"
            onClick={() => setIsDevBarCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 font-semibold text-violet-300 hover:text-violet-200 transition cursor-pointer pr-1"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dev Controls</span>
            <span className="text-[10px] text-zinc-400">
              {isDevBarCollapsed ? '▸' : '◂'}
            </span>
          </button>

          {!isDevBarCollapsed && (
            <>
              <span className="h-3.5 w-[1px] bg-zinc-700" />

              <button
                type="button"
                onClick={() => setIsDashboardVisible((prev) => !prev)}
                className="rounded-full bg-indigo-600/80 hover:bg-indigo-500 px-3 py-1 font-semibold text-white transition cursor-pointer"
              >
                {isDashboardVisible
                  ? 'Minimize to Companion Mode'
                  : 'Expand Full Window (⤢)'}
              </button>

              <button
                type="button"
                onClick={() => setScratchpadOpen(!isScratchpadOpen)}
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-violet-200 transition cursor-pointer"
              >
                {isScratchpadOpen ? 'Close Notepad' : 'Open Notepad'}
              </button>

              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_hydration', {
                    durationSeconds: 300,
                  })
                }
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-zinc-100 transition cursor-pointer"
              >
                Hydration (5:00)
              </button>

              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_bathroom', {
                    durationSeconds: 600,
                  })
                }
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-zinc-100 transition cursor-pointer"
              >
                Bathroom (10:00)
              </button>

              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_intervention', {
                    targetAppOrSite: 'YouTube',
                  })
                }
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-amber-200 transition cursor-pointer"
              >
                Nudge: YouTube
              </button>

              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_intervention', {
                    targetAppOrSite: 'Reddit',
                  })
                }
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-amber-200 transition cursor-pointer"
              >
                Nudge: Reddit
              </button>

              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_intervention', {
                    targetAppOrSite: 'Discord',
                  })
                }
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-amber-200 transition cursor-pointer"
              >
                Nudge: Discord
              </button>

              <button
                type="button"
                onClick={() => {
                  handleInteractiveRegionHover('center-overlay-card', false);
                  dismissActiveOverlay('manual_dismiss');
                }}
                disabled={activeOverlay === null}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  activeOverlay !== null
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 cursor-pointer'
                    : 'bg-zinc-800/40 text-zinc-500 cursor-not-allowed'
                }`}
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <StudyBuddyViewport />
    </AppProvider>
  );
};

export default App;