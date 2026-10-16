// src/renderer/src/App.tsx
import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { CenterOverlay } from './components/overlays/CenterOverlay';
import { Scratchpad } from './components/scratchpad/Scratchpad';

const StudyBuddyWorkspace: React.FC = () => {
  const {
    activeOverlay,
    triggerOverlay,
    dismissActiveOverlay,
    isScratchpadOpen,
    setScratchpadOpen,
    scratchpad,
    toggleSyncStatus,
    togglePhoneConnection,
    setInteractiveRegionHovered,
  } = useAppContext();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-transparent select-none font-sans">
      {/* Floating Movable Scratchpad */}
      <Scratchpad />

      {/* Center Screen-Dimming Modal Overlay */}
      <CenterOverlay />

      {/* Compact Bottom-Right Developer / Demo Control Pill */}
      <div
        onMouseEnter={() => setInteractiveRegionHovered('dev-hud', true)}
        onMouseLeave={() => setInteractiveRegionHovered('dev-hud', false)}
        className="fixed bottom-4 right-4 z-50 flex flex-wrap items-center gap-2 rounded-2xl border border-[#342D4B] bg-[#181424]/95 px-3.5 py-2.5 text-[12px] text-white shadow-2xl backdrop-blur-md"
      >
        <span className="mr-1 font-semibold text-[#A594F9]">Mambo Controls:</span>

        <button
          type="button"
          onClick={() => {
            dismissActiveOverlay();
            triggerOverlay('overlay_hydration');
          }}
          className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
            activeOverlay?.kind === 'overlay_hydration'
              ? 'bg-[#A594F9] text-[#171329]'
              : 'bg-[#251F38] text-[#DDD8F3] hover:bg-[#332B4D]'
          }`}
        >
          Hydration Overlay
        </button>

        <button
          type="button"
          onClick={() => {
            dismissActiveOverlay();
            triggerOverlay('overlay_bathroom');
          }}
          className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
            activeOverlay?.kind === 'overlay_bathroom'
              ? 'bg-[#A594F9] text-[#171329]'
              : 'bg-[#251F38] text-[#DDD8F3] hover:bg-[#332B4D]'
          }`}
        >
          Bathroom Overlay
        </button>

        <button
          type="button"
          onClick={() => {
            dismissActiveOverlay();
            triggerOverlay('overlay_intervention', {
              targetAppOrSite: 'Discord',
            });
          }}
          className={`rounded-lg px-2.5 py-1 font-medium transition cursor-pointer ${
            activeOverlay?.kind === 'overlay_intervention'
              ? 'bg-[#A594F9] text-[#171329]'
              : 'bg-[#251F38] text-[#DDD8F3] hover:bg-[#332B4D]'
          }`}
        >
          Intervention (Discord)
        </button>

        <span className="mx-1 h-4 w-[1px] bg-[#342D4B]" />

        <button
          type="button"
          onClick={() => setScratchpadOpen(!isScratchpadOpen)}
          className="rounded-lg bg-[#251F38] px-2.5 py-1 font-medium text-[#DDD8F3] hover:bg-[#332B4D] transition cursor-pointer"
        >
          {isScratchpadOpen ? 'Hide Scratchpad' : 'Show Scratchpad'}
        </button>

        <button
          type="button"
          onClick={() => {
            toggleSyncStatus();
            togglePhoneConnection();
          }}
          className="rounded-lg bg-[#251F38] px-2.5 py-1 font-medium text-[#DDD8F3] hover:bg-[#332B4D] transition cursor-pointer"
        >
          Toggle Sync ({scratchpad.syncStatus === 'synced' ? 'Online' : 'Offline'})
        </button>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <StudyBuddyWorkspace />
    </AppProvider>
  );
};

export default App;
