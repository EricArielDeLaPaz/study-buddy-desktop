// src/renderer/src/components/companion/FloatingMascotDock.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { ChibiCompanion, ChibiCompanionMode } from './ChibiCompanion';
import { playChime } from '../../utils/audio';

export interface FloatingMascotDockProps {
  isDashboardVisible: boolean;
  onExpandToFullWindow: () => void;
}

const FRIENDLY_TIPS: ReadonlyArray<string> = [
  'Keep your shoulders relaxed!',
  'Remember to sip water!',
  "You're doing great!",
  'Blink softly and rest your eyes for a second.',
  'Unclench your jaw and take a deep breath!',
  'Small consistent study blocks beat marathon cramming!',
];

function formatCompactClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const FloatingMascotDock: React.FC<FloatingMascotDockProps> = ({
  isDashboardVisible,
  onExpandToFullWindow,
}) => {
  const {
    activeOverlay,
    sessionStatus,
    focusTimeRemaining,
    isScratchpadOpen,
    setScratchpadOpen,
    setInteractiveRegionHovered,
  } = useApp();

  const [tipIndex, setTipIndex] = useState<number>(0);
  const [isTipVisible, setIsTipVisible] = useState<boolean>(false);
  const [isCelebratingClick, setIsCelebratingClick] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => ({
    x: 32,
    y:
      typeof window !== 'undefined'
        ? Math.max(100, window.innerHeight - 180)
        : 540,
  }));

  const dragOffsetRef = useRef<{ startX: number; startY: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);
  const tipTimeoutRef = useRef<number | null>(null);
  const celebrateTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tipTimeoutRef.current) window.clearTimeout(tipTimeoutRef.current);
      if (celebrateTimeoutRef.current) {
        window.clearTimeout(celebrateTimeoutRef.current);
      }
    };
  }, []);

  // Release click-through capture whenever the dock is hidden (either because
  // the full desktop app window is open or an active overlay is showing).
  useEffect(() => {
    if (isDashboardVisible || activeOverlay !== null) {
      setInteractiveRegionHovered('floating-mascot-dock', false);
    }
  }, [isDashboardVisible, activeOverlay, setInteractiveRegionHovered]);

  const handleMascotClick = useCallback(() => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    playChime('gentle_bell');

    setTipIndex((prev) => (prev + 1) % FRIENDLY_TIPS.length);
    setIsTipVisible(true);
    setIsCelebratingClick(true);

    if (tipTimeoutRef.current) window.clearTimeout(tipTimeoutRef.current);
    tipTimeoutRef.current = window.setTimeout(() => {
      setIsTipVisible(false);
    }, 4500);

    if (celebrateTimeoutRef.current) {
      window.clearTimeout(celebrateTimeoutRef.current);
    }
    celebrateTimeoutRef.current = window.setTimeout(() => {
      setIsCelebratingClick(false);
    }, 2200);
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-drag="true"]')) {
      return;
    }

    hasDraggedRef.current = false;
    dragOffsetRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragOffsetRef.current) return;
      hasDraggedRef.current = true;

      const nextX = Math.max(
        16,
        Math.min(
          window.innerWidth - 230,
          moveEvent.clientX - dragOffsetRef.current.startX
        )
      );
      const nextY = Math.max(
        16,
        Math.min(
          window.innerHeight - 130,
          moveEvent.clientY - dragOffsetRef.current.startY
        )
      );
      setPosition({ x: nextX, y: nextY });
    };

    const handleMouseUp = () => {
      dragOffsetRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Strict Mutual Exclusivity:
  // 1. Do not render when Full Desktop Window is visible.
  // 2. Do not render when a CenterOverlay (hydration, bathroom, or intervention) is active.
  if (isDashboardVisible || activeOverlay !== null) {
    return null;
  }

  const resolvedMode: ChibiCompanionMode = isCelebratingClick
    ? 'celebrating'
    : sessionStatus === 'paused'
    ? 'bathroom'
    : 'idle_studying';

  return (
    <div
      onMouseEnter={() =>
        setInteractiveRegionHovered('floating-mascot-dock', true)
      }
      onMouseLeave={() =>
        setInteractiveRegionHovered('floating-mascot-dock', false)
      }
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className="fixed z-50 flex flex-col items-start select-none"
    >
      {/* Friendly Speech Bubble Tip Popover */}
      {isTipVisible && (
        <div className="mb-2.5 max-w-[235px] rounded-2xl border border-[#4E4187] bg-[#241D38]/95 px-3.5 py-2.5 text-[12px] font-medium leading-snug text-white shadow-[0_14px_30px_rgba(0,0,0,0.65)] backdrop-blur-md">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#A594F9]">
              Mambo says:
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsTipVisible(false);
              }}
              className="text-[11px] text-[#8E87A8] hover:text-white cursor-pointer"
              aria-label="Dismiss tip"
            >
              ✕
            </button>
          </div>
          <p className="text-[#EAE6F8]">{FRIENDLY_TIPS[tipIndex]}</p>
        </div>
      )}

      {/* Compact Floating Mambo Companion Dock */}
      <div
        onMouseDown={handleMouseDown}
        onClick={handleMascotClick}
        title="Click Mambo for a study tip, or drag to reposition"
        className="group relative flex items-center gap-3 rounded-2xl border border-[#342D4B] bg-[#181424]/95 p-2.5 pr-12 shadow-[0_16px_40px_rgba(0,0,0,0.75)] backdrop-blur-md transition-all duration-200 hover:border-[#534682] cursor-pointer"
      >
        {/* Top-Right Expand Arrow Button (⤢) — Hides Buddy & Restores Full Desktop Window */}
        <button
          type="button"
          data-no-drag="true"
          onClick={(e) => {
            e.stopPropagation();
            setInteractiveRegionHovered('floating-mascot-dock', false);
            onExpandToFullWindow();
          }}
          title="Expand to full Study Buddy desktop window (⤢)"
          aria-label="Expand to full Study Buddy desktop window"
          className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg border border-[#4E4187] bg-[#261E42] text-[13px] font-bold text-[#E2DFF0] hover:bg-[#A594F9] hover:text-[#171329] transition cursor-pointer shadow-sm"
        >
          ⤢
        </button>

        {/* Bottom-Right Open Scratchpad Icon Button */}
        <button
          type="button"
          data-no-drag="true"
          onClick={(e) => {
            e.stopPropagation();
            setScratchpadOpen(!isScratchpadOpen);
          }}
          title={isScratchpadOpen ? 'Hide Scratchpad Notes' : 'Open Scratchpad Notes'}
          aria-label={isScratchpadOpen ? 'Hide Scratchpad Notes' : 'Open Scratchpad Notes'}
          className={`absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg border transition cursor-pointer shadow-sm ${
            isScratchpadOpen
              ? 'border-[#A594F9] bg-[#A594F9] text-[#171329]'
              : 'border-[#3B3354] bg-[#1F1A30] text-[#C4B5FD] hover:bg-[#32294D] hover:text-white'
          }`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>

        <ChibiCompanion
          mode={resolvedMode}
          size="sm"
          showStateBadge={false}
          className="shrink-0"
        />

        <div className="flex flex-col pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13.5px] font-bold tracking-tight text-white">
              Mambo
            </span>
            <span
              className={`h-2 w-2 rounded-full ${
                sessionStatus === 'focusing'
                  ? 'bg-[#4ADE80] animate-pulse'
                  : 'bg-[#FBBF24]'
              }`}
            />
          </div>

          <span className="mt-0.5 text-[11.5px] font-semibold tabular-nums text-[#C4B5FD]">
            {sessionStatus === 'focusing'
              ? `Focusing · ${formatCompactClock(focusTimeRemaining)}`
              : `Paused · ${formatCompactClock(focusTimeRemaining)}`}
          </span>

          <span className="mt-1 text-[10px] font-medium text-[#8E87A8] group-hover:text-[#DDD8F3] transition-colors">
            ✨ Tap for study tip
          </span>
        </div>
      </div>
    </div>
  );
};

export default FloatingMascotDock;