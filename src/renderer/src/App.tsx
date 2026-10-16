// src/renderer/src/App.tsx
import React, { useEffect, useCallback, useRef } from 'react';
import {
  AppProvider as AppContextProvider,
  useAppContext,
} from './context/AppContext';
import { CenterOverlay } from './components/overlays/CenterOverlay';
import { Scratchpad } from './components/scratchpad/Scratchpad';
import type {
  OverlayTriggerType,
  OverlayTriggerPayload,
} from '../../preload/index.d';

const isDevelopment = process.env.NODE_ENV === 'development';

const StudyBuddyShell: React.FC = () => {
  const {
    activeOverlay,
    triggerOverlay,
    dismissActiveOverlay,
    isScratchpadOpen,
    setScratchpadOpen,
  } = useAppContext();

  // Track whether the window is currently ignoring mouse events so we avoid
  // flooding the IPC channel on every single pixel of mouse movement.
  const isIgnoringMouseRef = useRef<boolean>(true);

  const setClickThrough = useCallback((ignore: boolean) => {
    if (isIgnoringMouseRef.current === ignore) return;
    isIgnoringMouseRef.current = ignore;

    if (ignore) {
      window.electronAPI?.setIgnoreMouseEvents(true, true);
    } else {
      window.electronAPI?.setIgnoreMouseEvents(false);
    }
  }, []);

  /**
   * 1. Initialize window in click-through mode with forwarding enabled
   *    and subscribe to Main Process `onTriggerOverlay` events.
   */
  useEffect(() => {
    window.electronAPI?.setIgnoreMouseEvents(true, true);
    isIgnoringMouseRef.current = true;

    if (!window.electronAPI?.onTriggerOverlay) return;

    const unsubscribe = window.electronAPI.onTriggerOverlay(
      (type: OverlayTriggerType, payload?: OverlayTriggerPayload) => {
        if (type === 'hydration') {
          triggerOverlay('overlay_hydration', {
            durationSeconds: payload?.durationSeconds ?? 300, // 05:00
          });
        } else if (type === 'bathroom') {
          triggerOverlay('overlay_bathroom', {
            durationSeconds: payload?.durationSeconds ?? 600, // 10:00
          });
        } else if (type === 'intervention') {
          triggerOverlay('overlay_intervention', {
            targetAppOrSite: payload?.targetAppOrSite ?? 'Discord',
            strictMode: payload?.strictMode ?? false,
          });
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [triggerOverlay]);

  /**
   * 2. Global Mouse Move Delegation
   * Ensures that whenever the cursor moves out to the transparent canvas or
   * the dimmed overlay backdrop (`rgba(0, 0, 0, 0.45)`), click-through is enabled
   * with `{ forward: true }`. Whenever the cursor enters any `[data-interactive="true"]`
   * surface (Scratchpad, CenterOverlay modal card, Dev Trigger Bar), click-through
   * is disabled (`setIgnoreMouseEvents(false)`).
   */
  const handleWorkspaceMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement | null;
      const isInsideInteractiveRegion = Boolean(
        target?.closest('[data-interactive="true"]')
      );

      if (isInsideInteractiveRegion) {
        setClickThrough(false);
      } else {
        setClickThrough(true);
      }
    },
    [setClickThrough]
  );

  const handleInteractiveMouseEnter = useCallback(() => {
    setClickThrough(false);
  }, [setClickThrough]);

  const handleInteractiveMouseLeave = useCallback(() => {
    setClickThrough(true);
  }, [setClickThrough]);

  /**
   * Dev Trigger Bar Handlers
   */
  const handleTriggerHydration = () => {
    dismissActiveOverlay();
    triggerOverlay('overlay_hydration', { durationSeconds: 300 }); // 5:00
  };

  const handleTriggerBathroom = () => {
    dismissActiveOverlay();
    triggerOverlay('overlay_bathroom', { durationSeconds: 600 }); // 10:00
  };

  const handleTriggerIntervention = () => {
    dismissActiveOverlay();
    triggerOverlay('overlay_intervention', {
      targetAppOrSite: 'Discord',
    });
  };

  return (
    <div
      onMouseMove={handleWorkspaceMouseMove}
      className="relative h-screen w-screen overflow-hidden bg-transparent select-none font-sans"
    >
      {/* Floating Scratchpad Container (anchored bottom-right by default) */}
      <div
        data-interactive="true"
        onMouseEnter={handleInteractiveMouseEnter}
        onMouseLeave={handleInteractiveMouseLeave}
        className="fixed bottom-16 right-6 z-50"
      >
        <Scratchpad />
      </div>

      {/* Conditionally Render Center Screen-Dimming Overlay when Active */}
      {activeOverlay && activeOverlay.isActive && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
        >
          {/* Interactive wrapper around the 420px Center Modal Card */}
          <div
            data-interactive="true"
            onMouseEnter={handleInteractiveMouseEnter}
            onMouseLeave={handleInteractiveMouseLeave}
          >
            <CenterOverlay />
          </div>
        </div>
      )}

      {/* Minimal Floating Dev Trigger Bar (Development Mode Only) */}
      {isDevelopment && (
        <div
          data-interactive="true"
          onMouseEnter={handleInteractiveMouseEnter}
          onMouseLeave={handleInteractiveMouseLeave}
          className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#342D4B] bg-[#161224]/95 px-4 py-2 text-[12px] text-white shadow-[0_12px_32px_rgba(0,0,0,0.65)] backdrop-blur-md"
        >
          <span className="mr-1 flex items-center gap-1.5 font-semibold text-[#A594F9]">
            <span className="h-2 w-2 rounded-full bg-[#4ADE80] animate-pulse" />
            Dev Trigger Bar
          </span>

          <button
            type="button"
            onClick={handleTriggerHydration}
            className={`rounded-full px-3 py-1 font-medium transition cursor-pointer ${
              activeOverlay?.kind === 'overlay_hydration'
                ? 'bg-[#A594F9] text-[#171329]'
                : 'bg-[#241E36] text-[#E2DFF0] hover:bg-[#322A4B]'
            }`}
          >
            1. Trigger Hydration (5:00)
          </button>

          <button
            type="button"
            onClick={handleTriggerBathroom}
            className={`rounded-full px-3 py-1 font-medium transition cursor-pointer ${
              activeOverlay?.kind === 'overlay_bathroom'
                ? 'bg-[#A594F9] text-[#171329]'
                : 'bg-[#241E36] text-[#E2DFF0] hover:bg-[#322A4B]'
            }`}
          >
            2. Trigger Bathroom (10:00)
          </button>

          <button
            type="button"
            onClick={handleTriggerIntervention}
            title="Distraction detected"
            className={`rounded-full px-3 py-1 font-medium transition cursor-pointer ${
              activeOverlay?.kind === 'overlay_intervention'
                ? 'bg-[#A594F9] text-[#171329]'
                : 'bg-[#241E36] text-[#E2DFF0] hover:bg-[#322A4B]'
            }`}
          >
            3. Trigger Intervention (&ldquo;Distraction detected&rdquo;)
          </button>

          <span className="mx-1 h-3.5 w-[1px] bg-[#342D4B]" />

          <button
            type="button"
            onClick={() => setScratchpadOpen(!isScratchpadOpen)}
            className="rounded-full bg-[#241E36] px-3 py-1 font-medium text-[#A594F9] hover:bg-[#322A4B] transition cursor-pointer"
          >
            {isScratchpadOpen ? 'Hide Scratchpad' : 'Show Scratchpad'}
          </button>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppContextProvider>
      <StudyBuddyShell />
    </AppContextProvider>
  );
};

export default App;