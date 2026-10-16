// src/renderer/src/components/overlays/CenterOverlay.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { AnimationPlaceholder } from '../common/AnimationPlaceholder';

/**
 * Formats total seconds as MM:SS (e.g. 300 -> "05:00", 600 -> "10:00")
 */
function formatCountdown(totalSeconds: number = 0): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const CenterOverlay: React.FC = () => {
  const {
    activeOverlay,
    dismissActiveOverlay,
    extendActiveOverlayTimer,
    setInteractiveRegionHovered,
  } = useAppContext();

  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Reset popover whenever the overlay changes
  useEffect(() => {
    setIsAddMenuOpen(false);
  }, [activeOverlay?.id, activeOverlay?.kind]);

  // Close the + time popover if user clicks outside of it inside the card
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsAddMenuOpen(false);
      }
    }
    if (isAddMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAddMenuOpen]);

  if (!activeOverlay || !activeOverlay.isActive) {
    return null;
  }

  const {
    kind,
    animationSlot,
    buddyName,
    message,
    remainingSeconds = 0,
    targetAppOrSite = 'Discord',
  } = activeOverlay;

  const isTimedReminder =
    kind === 'overlay_hydration' || kind === 'overlay_bathroom';

  const handleCardMouseEnter = () => {
    setInteractiveRegionHovered('center-overlay', true);
  };

  const handleCardMouseLeave = () => {
    setInteractiveRegionHovered('center-overlay', false);
  };

  const handleAddTime = (secondsToAdd: number) => {
    extendActiveOverlayTimer(secondsToAdd);
    setIsAddMenuOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center transition-opacity duration-300"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      aria-modal="true"
      role="dialog"
    >
      {/* Centered 420px Interactive Modal Card */}
      <div
        onMouseEnter={handleCardMouseEnter}
        onMouseLeave={handleCardMouseLeave}
        className="relative w-[420px] rounded-[24px] bg-[#221D33] border border-[#342D4B] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.65)] text-white select-none"
      >
        {/* 512x512 Aspect Slot Avatar Placeholder */}
        <AnimationPlaceholder slot={animationSlot} size={220} />

        {/* Buddy Title */}
        <h2 className="mt-4 text-center text-[20px] font-bold tracking-tight text-white">
          {buddyName}
        </h2>

        {/* Speech Bubble with Top Center Caret */}
        <div className="relative mt-3.5">
          {/* Upward Caret */}
          <div
            className="mx-auto h-0 w-0"
            style={{
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderBottom: '8px solid #3C3173',
            }}
          />

          {/* Bubble Container */}
          <div className="flex items-center gap-3 rounded-xl bg-[#3C3173] px-4 py-3.5 shadow-inner">
            {isTimedReminder && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#491D2E]">
                {/* Droplet / Reminder SVG Icon */}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#F472B6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                </svg>
              </div>
            )}

            <p className="text-[13.5px] font-semibold leading-snug text-white">
              {kind === 'overlay_intervention'
                ? `No! Don't go on ${targetAppOrSite}`
                : message}
            </p>
          </div>
        </div>

        {/* Hydration & Bathroom Timer Pill + '+' Popover */}
        {isTimedReminder && (
          <div className="mt-6 flex items-center justify-center gap-2.5">
            {/* Timer Pill */}
            <div className="flex items-center gap-2 rounded-full bg-[#110E1B] border border-[#2B253E] px-4 py-1.5 text-[12.5px] font-medium text-[#E2DFF0]">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#9E97B8]"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="tabular-nums">
                Timer: {formatCountdown(remainingSeconds)}
              </span>
            </div>

            {/* '+' Button and Popover */}
            <div className="relative" ref={popoverRef}>
              <button
                type="button"
                onClick={() => setIsAddMenuOpen((prev) => !prev)}
                aria-label="Extend break timer"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#A594F9] text-[#171329] font-bold transition hover:bg-[#B5A7FA] active:scale-95 cursor-pointer"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              {isAddMenuOpen && (
                <div className="absolute left-1/2 bottom-full z-50 mb-2 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-[#161224] border border-[#393154] p-1.5 shadow-xl">
                  {[
                    { label: '+30s', seconds: 30 },
                    { label: '+1m', seconds: 60 },
                    { label: '+5m', seconds: 300 },
                  ].map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleAddTime(option.seconds)}
                      className="rounded-lg px-2.5 py-1 text-[11.5px] font-semibold text-[#DDD8F3] hover:bg-[#3C3173] hover:text-white transition cursor-pointer"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="mt-6">
          {kind === 'overlay_hydration' && (
            <button
              type="button"
              onClick={() => dismissActiveOverlay('completed_hydration')}
              className="w-full rounded-xl bg-[#A594F9] py-3 text-[13px] font-semibold text-[#18132A] shadow-md transition hover:bg-[#B4A5FA] active:scale-[0.99] cursor-pointer"
            >
              I&apos;m hydrated now!
            </button>
          )}

          {kind === 'overlay_bathroom' && (
            <button
              type="button"
              onClick={() => dismissActiveOverlay('completed_bathroom')}
              className="w-full rounded-xl bg-[#A594F9] py-3 text-[13px] font-semibold text-[#18132A] shadow-md transition hover:bg-[#B4A5FA] active:scale-[0.99] cursor-pointer"
            >
              I&apos;m ready for what&apos;s next!
            </button>
          )}

          {kind === 'overlay_intervention' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => dismissActiveOverlay('keep_open')}
                className="rounded-xl border border-[#4E4668] bg-[#1C182B] py-2.5 px-3 text-[12.5px] font-medium text-[#E2DFF0] transition hover:bg-[#28223C] active:scale-[0.99] cursor-pointer"
              >
                Keep open {targetAppOrSite}
              </button>
              <button
                type="button"
                onClick={() => dismissActiveOverlay('close_target')}
                className="rounded-xl bg-[#A594F9] py-2.5 px-3 text-[12.5px] font-semibold text-[#18132A] shadow-md transition hover:bg-[#B4A5FA] active:scale-[0.99] cursor-pointer"
              >
                Close {targetAppOrSite}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CenterOverlay;