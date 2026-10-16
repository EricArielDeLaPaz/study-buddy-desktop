// src/renderer/src/components/focus/FocusController.tsx
import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';

function formatFocusClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const FocusController: React.FC = () => {
  const {
    sessionStatus,
    focusTimeRemaining,
    focusTargetMinutes,
    hydrationIntervalMinutes,
    sessionStats,
    setFocusTargetMinutes,
    setHydrationIntervalMinutes,
    toggleFocusSession,
    skipFocusBlock,
    resetDailyStats,
    setInteractiveRegionHovered,
  } = useApp();

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(true);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 468,
    y: 64,
  });

  const dragOffsetRef = useRef<{ startX: number; startY: number } | null>(null);

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-drag="true"]')) {
      return;
    }

    dragOffsetRef.current = {
      startX: e.clientX - position.x,
      startY: e.clientY - position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragOffsetRef.current) return;
      const nextX = Math.max(
        12,
        Math.min(
          window.innerWidth - 310,
          moveEvent.clientX - dragOffsetRef.current.startX
        )
      );
      const nextY = Math.max(
        12,
        Math.min(
          window.innerHeight - 80,
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

  const getStatusLabel = (): string => {
    switch (sessionStatus) {
      case 'on_break':
        return 'Break Active';
      case 'paused':
        return `Paused: ${formatFocusClock(focusTimeRemaining)}`;
      case 'idle':
        return `Ready: ${formatFocusClock(focusTimeRemaining)}`;
      case 'focusing':
      default:
        return `Focusing: ${formatFocusClock(focusTimeRemaining)}`;
    }
  };

  const isFocusing = sessionStatus === 'focusing';
  const isOnBreak = sessionStatus === 'on_break';

  return (
    <div
      onMouseEnter={() =>
        setInteractiveRegionHovered('focus-controller', true)
      }
      onMouseLeave={() =>
        setInteractiveRegionHovered('focus-controller', false)
      }
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '296px',
      }}
      className="fixed z-50 flex flex-col rounded-[20px] bg-[#1A1626] border border-[#2C253E] shadow-[0_20px_50px_rgba(0,0,0,0.75)] text-white overflow-hidden select-none"
    >
      {/* Top Pill / Controller Bar (Draggable) */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className="flex items-center justify-between gap-2 bg-[#161221] px-4 py-3 cursor-move border-b border-[#262038]"
      >
        {/* Status Indicator & Live Countdown */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              isOnBreak
                ? 'bg-[#60A5FA] animate-pulse'
                : isFocusing
                ? 'bg-[#4ADE80] animate-pulse'
                : 'bg-[#FBBF24]'
            }`}
          />
          <span className="truncate text-[13.5px] font-bold tracking-tight tabular-nums text-white">
            {getStatusLabel()}
          </span>
        </div>

        {/* Action Buttons: Play/Pause, Skip, Drawer Toggle */}
        <div
          data-no-drag="true"
          className="flex items-center gap-1.5 shrink-0"
        >
          {/* Play / Pause Button */}
          <button
            type="button"
            onClick={toggleFocusSession}
            disabled={isOnBreak}
            title={isFocusing ? 'Pause Focus Timer' : 'Start Focus Timer'}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
              isOnBreak
                ? 'bg-[#221D30] text-[#5E5778] cursor-not-allowed'
                : 'bg-[#A594F9] text-[#171329] hover:bg-[#B6A8FA] cursor-pointer active:scale-95'
            }`}
          >
            {isFocusing ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            )}
          </button>

          {/* Skip to Break Button */}
          <button
            type="button"
            onClick={skipFocusBlock}
            disabled={isOnBreak}
            title="Skip current focus block to trigger scheduled break"
            className={`flex h-7 w-7 items-center justify-center rounded-full border border-[#352E4D] bg-[#1E192D] text-[#D5CFF0] transition ${
              isOnBreak
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-[#2A233F] hover:text-white cursor-pointer active:scale-95'
            }`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>

          {/* Expand / Collapse Stats Drawer */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            title={isDrawerOpen ? 'Hide Stats Drawer' : 'Show Stats Drawer'}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0E0B16] text-[#9E97B8] hover:bg-[#29233B] hover:text-white transition cursor-pointer"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${
                isDrawerOpen ? 'rotate-180' : ''
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible Quick Summary Drawer */}
      {isDrawerOpen && (
        <div className="flex flex-col gap-3 p-4">
          {/* Session Analytics Metrics */}
          <div className="flex flex-col gap-2 rounded-xl bg-[#0D0B14] border border-[#241E34] p-3 text-[12.5px]">
            <div className="flex items-center justify-between">
              <span className="text-[#B8B2CC]">💧 Hydration checks:</span>
              <span className="font-semibold text-white tabular-nums">
                {sessionStats.hydrationCount}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#B8B2CC]">⏱ Total Focus:</span>
              <span className="font-semibold text-white tabular-nums">
                {sessionStats.totalFocusMinutes}{' '}
                {sessionStats.totalFocusMinutes === 1 ? 'min' : 'mins'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#B8B2CC]">☕ Breaks taken:</span>
              <span className="font-semibold text-white tabular-nums">
                {sessionStats.breaksCompleted}
              </span>
            </div>
          </div>

          {/* Configurable Focus Block & Hydration Cadence Pills */}
          <div className="flex items-center justify-between text-[11.5px] text-[#8E87A8]">
            <span>Focus Block:</span>
            <div className="flex items-center gap-1">
              {[15, 25, 45].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setFocusTargetMinutes(mins)}
                  className={`rounded-md px-2 py-0.5 font-medium transition cursor-pointer ${
                    focusTargetMinutes === mins
                      ? 'bg-[#3C3173] text-white'
                      : 'bg-[#151120] text-[#8E87A8] hover:text-white'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11.5px] text-[#8E87A8]">
            <span>Hydration Cadence:</span>
            <div className="flex items-center gap-1">
              {[30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setHydrationIntervalMinutes(mins)}
                  className={`rounded-md px-2 py-0.5 font-medium transition cursor-pointer ${
                    hydrationIntervalMinutes === mins
                      ? 'bg-[#3C3173] text-white'
                      : 'bg-[#151120] text-[#8E87A8] hover:text-white'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Footer: Reset Daily Stats Button */}
          <div className="flex items-center justify-between border-t border-[#241E34] pt-2.5">
            <span className="text-[11px] text-[#6E678A]">
              Auto-saved locally
            </span>
            <button
              type="button"
              onClick={resetDailyStats}
              className="rounded-lg border border-[#3B3354] bg-[#1E192D] px-2.5 py-1 text-[11.5px] font-medium text-[#C4B5FD] hover:bg-[#29223D] hover:text-white transition cursor-pointer"
            >
              Reset daily stats
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FocusController;