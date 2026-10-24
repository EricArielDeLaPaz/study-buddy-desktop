// src/renderer/src/components/layout/WindowControls.tsx
import React from 'react';

export interface WindowControlsProps {
  variant: 'mac' | 'win';
  isFullScreen: boolean;
  onMinimize: () => void;
  onToggleFullScreen: () => void;
  onRequestClose: () => void;
}

export const WindowControls: React.FC<WindowControlsProps> = ({
  variant,
  isFullScreen,
  onMinimize,
  onToggleFullScreen,
  onRequestClose,
}) => {
  if (variant === 'mac') {
    return (
      <div
        data-no-drag="true"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="group flex items-center gap-2"
      >
        {/* Red Close Button */}
        <button
          type="button"
          onClick={onRequestClose}
          aria-label="Close Study Buddy"
          title="Quit Study Buddy"
          className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FF5F56] border border-[#E0443E] text-[#4D0000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 transition cursor-pointer"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            <line x1="2" y1="2" x2="8" y2="8" />
            <line x1="8" y1="2" x2="2" y2="8" />
          </svg>
        </button>

        {/* Yellow Minimize to Companion Mode Button */}
        <button
          type="button"
          onClick={onMinimize}
          aria-label="Minimize to Companion Mode"
          title="Minimize to Companion Mode"
          className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#FFBD2E] border border-[#DEA123] text-[#5A3900] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 transition cursor-pointer"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            <line x1="2" y1="5" x2="8" y2="5" />
          </svg>
        </button>

        {/* Green Full-Screen Panel Toggle Button */}
        <button
          type="button"
          onClick={onToggleFullScreen}
          aria-label={
            isFullScreen ? 'Restore window size' : 'Fill screen area'
          }
          title={isFullScreen ? 'Restore window size' : 'Fill screen area'}
          className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#27C93F] border border-[#1AAB29] text-[#003D07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 transition cursor-pointer"
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 10 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          >
            {isFullScreen ? (
              <>
                <polyline points="4 2 4 4 2 4" />
                <polyline points="6 8 6 6 8 6" />
              </>
            ) : (
              <>
                <polyline points="2 4 2 2 4 2" />
                <polyline points="8 6 8 8 6 8" />
              </>
            )}
          </svg>
        </button>
      </div>
    );
  }

  // Windows & Linux Style Controls (Right side of header)
  return (
    <div
      data-no-drag="true"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      className="flex items-center gap-1"
    >
      {/* Minimize (Dash) */}
      <button
        type="button"
        onClick={onMinimize}
        aria-label="Minimize to Companion Mode"
        title="Minimize to Companion Mode"
        className="flex h-8 w-9 items-center justify-center rounded-lg text-[#C4B5FD] hover:bg-violet-100 hover:text-violet-900 dark:hover:bg-[#232136] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 transition cursor-pointer"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <line x1="2" y1="6" x2="10" y2="6" />
        </svg>
      </button>

      {/* Full-Screen Toggle (Square / Two Overlapping Squares when Full) */}
      <button
        type="button"
        onClick={onToggleFullScreen}
        aria-label={isFullScreen ? 'Restore window size' : 'Maximize window'}
        title={isFullScreen ? 'Restore window size' : 'Maximize window'}
        className="flex h-8 w-9 items-center justify-center rounded-lg text-[#C4B5FD] hover:bg-violet-100 hover:text-violet-900 dark:hover:bg-[#232136] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 transition cursor-pointer"
      >
        {isFullScreen ? (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          >
            <rect x="1.5" y="3.5" width="7" height="7" rx="1" />
            <path d="M3.5 3.5V2a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5H8.5" />
          </svg>
        ) : (
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="8" height="8" rx="1" />
          </svg>
        )}
      </button>

      {/* Close (X with Red Hover) */}
      <button
        type="button"
        onClick={onRequestClose}
        aria-label="Close Study Buddy"
        title="Quit Study Buddy"
        className="flex h-8 w-9 items-center justify-center rounded-lg text-[#C4B5FD] hover:bg-rose-600 hover:!text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 transition cursor-pointer"
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <line x1="2.5" y1="2.5" x2="9.5" y2="9.5" />
          <line x1="9.5" y1="2.5" x2="2.5" y2="9.5" />
        </svg>
      </button>
    </div>
  );
};

export default WindowControls;
