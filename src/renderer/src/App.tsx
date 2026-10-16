// src/renderer/src/App.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  AppProvider,
  useApp,
  TriggerOverlayOptions,
} from './context/AppContext';
import { CenterOverlay } from './components/overlays/CenterOverlay';
import { Scratchpad } from './components/scratchpad/Scratchpad';
import { OverlayKind } from './types/buddy';
import type {
  OverlayTriggerType,
  OverlayTriggerPayload,
} from '../../preload/index.d';

const StudyBuddyViewport: React.FC = () => {
  const {
    activeOverlay,
    triggerOverlay,
    dismissActiveOverlay,
    isScratchpadOpen,
    setScratchpadOpen,
    scratchpad,
    toggleSyncStatus,
    setInteractiveRegionHovered,
    syncWindowClickThrough,
  } = useApp();

  const [isDevBarCollapsed, setIsDevBarCollapsed] = useState<boolean>(false);

  /**
   * Registers hover state for an interactive UI surface and synchronizes
   * the Electron window's OS-level click-through state.
   */
  const handleInteractiveRegionHover = useCallback(
    (regionId: string, isHovered: boolean) => {
      setInteractiveRegionHovered(regionId, isHovered);
      syncWindowClickThrough();
    },
    [setInteractiveRegionHovered, syncWindowClickThrough]
  );

  /**
   * Helper to immediately display a specific overlay state when testing from the Dev Bar
   * or responding to a Main Process IPC trigger, even if another overlay is currently open.
   */
  const activateOverlayImmediately = useCallback(
    (kind: OverlayKind, options?: TriggerOverlayOptions) => {
      if (activeOverlay !== null) {
        dismissActiveOverlay();
        window.setTimeout(() => {
          triggerOverlay(kind, options);
        }, 0);
      } else {
        triggerOverlay(kind, options);
      }
    },
    [activeOverlay, dismissActiveOverlay, triggerOverlay]
  );

  /**
   * Initialize the Electron window in click-through mode (`forward: true`)
   * and subscribe to scheduled overlay triggers from the main process.
   */
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
            targetAppOrSite: payload?.targetAppOrSite ?? 'YouTube / Reddit',
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

  return (
    <div className="w-screen h-screen fixed inset-0 overflow-hidden pointer-events-none select-none font-sans">
      {/* 1. Floating Movable Scratchpad (Interactive Surface) */}
      <div
        className="pointer-events-auto"
        onMouseEnter={() =>
          handleInteractiveRegionHover('scratchpad-shell', true)
        }
        onMouseLeave={() =>
          handleInteractiveRegionHover('scratchpad-shell', false)
        }
      >
        <Scratchpad />
      </div>

      {/* 2. Conditional Fullscreen Dimmed Backdrop & Center Overlay Modal */}
      {activeOverlay !== null && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none transition-opacity duration-300"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          {/*
            The backdrop remains pointer-events-none so clicks pass through to underlying
            OS windows, while the 420px CenterOverlay modal card captures pointer events.
          */}
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

      {/* 3. Floating Collapsible Dev Trigger Bar */}
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
          {/* Collapse / Expand Pill Toggle */}
          <button
            type="button"
            onClick={() => setIsDevBarCollapsed((prev) => !prev)}
            title={
              isDevBarCollapsed
                ? 'Expand Dev Trigger Bar'
                : 'Collapse Dev Trigger Bar'
            }
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

              {/* Action 1: Trigger Hydration (5:00) */}
              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_hydration', {
                    durationSeconds: 300,
                  })
                }
                className={`rounded-full px-3 py-1 font-medium transition cursor-pointer ${
                  activeOverlay?.kind === 'overlay_hydration'
                    ? 'bg-violet-500 text-zinc-950 font-semibold'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                }`}
              >
                Trigger Hydration
              </button>

              {/* Action 2: Trigger Bathroom (10:00) */}
              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_bathroom', {
                    durationSeconds: 600,
                  })
                }
                className={`rounded-full px-3 py-1 font-medium transition cursor-pointer ${
                  activeOverlay?.kind === 'overlay_bathroom'
                    ? 'bg-violet-500 text-zinc-950 font-semibold'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                }`}
              >
                Trigger Bathroom
              </button>

              {/* Action 3: Trigger Alert ("YouTube / Reddit") */}
              <button
                type="button"
                onClick={() =>
                  activateOverlayImmediately('overlay_intervention', {
                    targetAppOrSite: 'YouTube / Reddit',
                  })
                }
                className={`rounded-full px-3 py-1 font-medium transition cursor-pointer ${
                  activeOverlay?.kind === 'overlay_intervention'
                    ? 'bg-violet-500 text-zinc-950 font-semibold'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                }`}
              >
                Trigger Alert
              </button>

              {/* Action 4: Dismiss Overlay */}
              <button
                type="button"
                onClick={() => {
                  handleInteractiveRegionHover('center-overlay-card', false);
                  dismissActiveOverlay();
                }}
                disabled={activeOverlay === null}
                className={`rounded-full px-3 py-1 font-medium transition ${
                  activeOverlay !== null
                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500/30 cursor-pointer'
                    : 'bg-zinc-800/40 text-zinc-500 cursor-not-allowed'
                }`}
              >
                Dismiss Overlay
              </button>

              <span className="h-3.5 w-[1px] bg-zinc-700" />

              {/* Quick Scratchpad & Sync State Toggles */}
              <button
                type="button"
                onClick={() => setScratchpadOpen(!isScratchpadOpen)}
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-3 py-1 font-medium text-zinc-200 transition cursor-pointer"
              >
                {isScratchpadOpen ? 'Hide Notes' : 'Show Notes'}
              </button>

              <button
                type="button"
                onClick={toggleSyncStatus}
                className="rounded-full bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 font-medium text-zinc-300 transition cursor-pointer"
                title="Toggle Cloud Synced / Offline state"
              >
                {scratchpad.syncStatus === 'synced' ? '● Synced' : '● Offline'}
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