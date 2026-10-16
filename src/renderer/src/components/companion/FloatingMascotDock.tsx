// src/renderer/src/components/companion/FloatingMascotDock.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { ChibiCompanion, ChibiCompanionMode } from './ChibiCompanion';
import { playChime } from '../../utils/audio';

export interface FloatingMascotDockProps {
  isDashboardMinimized?: boolean;
  onRestoreDashboard?: () => void;
}

const FRIENDLY_TIPS: ReadonlyArray<string> = [
  'Keep your shoulders relaxed!',
  'Remember to sip water!',
  "You're doing great!",
  'Blink softly and rest your eyes for a second.',
  'Unclench your jaw and take a deep breath!',
  'Small consistent study blocks beat marathon cramming!',
];

export const FloatingMascotDock: React.FC<FloatingMascotDockProps> = ({
  isDashboardMinimized = false,
  onRestoreDashboard,
}) => {
  const {
    activeOverlay,
    sessionStatus,
    focusTimeRemaining,
    setInteractiveRegionHovered,
  } = useApp();

  const [tipIndex, setTipIndex] = useState<number>(0);
  const [isTipVisible, setIsTipVisible] = useState<boolean>(false);
  const [isCelebratingClick, setIsCelebratingClick] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => ({
    x: 32,
    y:
      typeof window !== 'undefined'
        ? Math.max(120, window.innerHeight - 170)
        : 560,
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

  useEffect(() => {
    if (activeOverlay !== null) {
      setInteractiveRegionHovered('floating-mascot-dock', false);
    }
  }, [activeOverlay, setInteractiveRegionHovered]);

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
          window.innerWidth - 160,
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

  if (activeOverlay !== null) {
    return null;
  }

  const resolvedMode: ChibiCompanionMode = isCelebratingClick
    ? 'celebrating'
    : sessionStatus === 'paused'
    ? 'bathroom'
    : 'idle_studying';

  const minsLeft = Math.ceil(focusTimeRemaining / 60);

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

      {/* Draggable & Clickable Mini Companion Pod */}
      <div
        onMouseDown={handleMouseDown}
        onClick={handleMascotClick}
        title="Click Mambo for a study tip, or drag to reposition"
        className="group relative flex items-center gap-2.5 rounded-2xl border border-[#342D4B] bg-[#181424]/95 p-2 pr-3 shadow-[0_16px_40px_rgba(0,0,0,0.75)] backdrop-blur-md transition-transform duration-200 hover:scale-[1.02] hover:border-[#534682] cursor-pointer"
      >
        <ChibiCompanion
          mode={resolvedMode}
          size="sm"
          showStateBadge={false}
          className="shrink-0"
        />

        <div className="flex flex-col pr-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold tracking-tight text-white">
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

          <span className="text-[11px] font-medium text-[#9E97B8]">
            {sessionStatus === 'focusing'
              ? `Studying · ${minsLeft}m left`
              : 'Paused · Tap for tip'}
          </span>

          <span className="mt-1 text-[10px] font-semibold text-[#A594F9] group-hover:text-[#C4B5FD] transition-colors">
            ✨ Tap for encouragement
          </span>
        </div>

        {/* Expand Arrow Button to Restore Full App View when Minimized */}
        {isDashboardMinimized && onRestoreDashboard && (
          <button
            type="button"
            data-no-drag="true"
            onClick={(e) => {
              e.stopPropagation();
              onRestoreDashboard();
            }}
            title="Expand to full Study Buddy app view"
            aria-label="Restore full application window"
            className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#4E4187] bg-[#261E42] text-[#E2DFF0] hover:bg-[#A594F9] hover:text-[#171329] transition cursor-pointer shadow-md"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default FloatingMascotDock;