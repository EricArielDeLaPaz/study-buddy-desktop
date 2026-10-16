// src/renderer/src/components/common/AnimationPlaceholder.tsx
import React from 'react';
import { AnimationSlotId } from '../../types/buddy';

interface AnimationPlaceholderProps {
  slot: AnimationSlotId;
  /**
   * Optional display size override while preserving the 1:1 (512x512) design spec.
   */
  size?: number;
  className?: string;
}

interface SlotMetadata {
  label: string;
  sublabel: string;
  accentColor: string;
  badgeGlow: string;
}

const SLOT_METADATA: Record<AnimationSlotId, SlotMetadata> = {
  idle_studying: {
    label: 'Idle · Studying',
    sublabel: 'WebM α (VP9) · GIF fallback · infinite loop',
    accentColor: '#A594F9',
    badgeGlow: 'rgba(165, 148, 249, 0.15)',
  },
  idle_reading: {
    label: 'Idle · Reading',
    sublabel: 'WebM α (VP9) · GIF fallback · infinite loop',
    accentColor: '#60A5FA',
    badgeGlow: 'rgba(96, 165, 250, 0.15)',
  },
  reminder_drinking_water: {
    label: 'Reminder · Drinking water',
    sublabel: 'WebM α (VP9) · GIF fallback · loop until action',
    accentColor: '#93C5FD',
    badgeGlow: 'rgba(147, 197, 253, 0.14)',
  },
  reminder_bathroom: {
    label: 'Reminder · Waving',
    sublabel: 'WebM α (VP9) · GIF fallback · loop until action',
    accentColor: '#C4B5FD',
    badgeGlow: 'rgba(196, 181, 253, 0.14)',
  },
  status_nudge: {
    label: 'Status · Nudge',
    sublabel: 'WebM α (VP9) · GIF fallback · loop until action',
    accentColor: '#F87171',
    badgeGlow: 'rgba(248, 113, 113, 0.14)',
  },
  status_sleeping: {
    label: 'Status · Sleeping',
    sublabel: 'WebM α (VP9) · GIF fallback · infinite loop',
    accentColor: '#818CF8',
    badgeGlow: 'rgba(129, 140, 248, 0.14)',
  },
};

export const AnimationPlaceholder: React.FC<AnimationPlaceholderProps> = ({
  slot,
  size = 220,
  className = '',
}) => {
  const meta = SLOT_METADATA[slot];

  return (
    <div
      style={{ width: size, height: size }}
      data-animation-slot={slot}
      data-native-resolution="512x512"
      className={`relative mx-auto flex flex-col items-center justify-center rounded-2xl bg-[#0D0B14] border-2 border-dashed border-[#464059] px-4 py-5 select-none overflow-hidden transition-all duration-300 ${className}`}
    >
      {/* Subtle radial ambient glow matching the active state */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 42%, ${meta.badgeGlow} 0%, transparent 70%)`,
        }}
      />

      {/* Animated SVG Avatar Character Icon */}
      <div className="relative z-10 mb-3 flex items-center justify-center">
        <div className="animate-bounce" style={{ animationDuration: '2.6s' }}>
          <svg
            width="38"
            height="38"
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[#9E97B8]"
          >
            {/* Outer Face Circle */}
            <circle
              cx="18"
              cy="18"
              r="14"
              stroke="currentColor"
              strokeWidth="2.2"
              className="opacity-90"
            />
            {/* Eyes */}
            {slot === 'status_sleeping' ? (
              <>
                <path
                  d="M11.5 15.5C12.3 16.5 13.7 16.5 14.5 15.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M21.5 15.5C22.3 16.5 23.7 16.5 24.5 15.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <circle cx="13.5" cy="15" r="1.5" fill="currentColor" />
                <circle cx="22.5" cy="15" r="1.5" fill="currentColor" />
              </>
            )}

            {/* Mouth Expression */}
            {slot === 'status_nudge' ? (
              <path
                d="M13.5 22.5C15 20.8 21 20.8 22.5 22.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M13 20.5C14.5 23 21.5 23 23 20.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Primary State Label */}
      <div className="relative z-10 text-center">
        <p className="text-[13px] font-semibold tracking-tight text-white">
          {meta.label}
        </p>
        <p className="mt-1.5 max-w-[175px] text-center text-[11px] leading-[1.35] text-[#7D7696]">
          {meta.sublabel}
        </p>
      </div>
    </div>
  );
};

export default AnimationPlaceholder;