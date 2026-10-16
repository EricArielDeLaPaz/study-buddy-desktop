// src/renderer/src/components/layout/Header.tsx
import React from 'react';

export interface HeaderProps {
  isScratchpadOpen: boolean;
  onToggleScratchpad: () => void;
  onMinimizeToCompanion: () => void;
  activeTabLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isScratchpadOpen,
  onToggleScratchpad,
  onMinimizeToCompanion,
  activeTabLabel,
}) => {
  return (
    <header
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className="flex h-12 shrink-0 items-center justify-between border-b border-[#241E36] bg-[#0F0C18] px-5 select-none"
    >
      {/* Left: Window Controls & App Title */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#F87171]/80" />
          <span className="h-3 w-3 rounded-full bg-[#FBBF24]/80" />
          <span className="h-3 w-3 rounded-full bg-[#4ADE80]/80" />
        </div>
        <span className="ml-2 text-[12.5px] font-semibold tracking-tight text-[#E2DFF0]">
          Study Buddy Desktop
        </span>
        {activeTabLabel && (
          <>
            <span className="text-[#463E62]">/</span>
            <span className="text-[12px] font-medium text-[#9E97B8]">
              {activeTabLabel}
            </span>
          </>
        )}
      </div>

      {/* Right: Global Utility Actions (no-drag) */}
      <div
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-2.5"
      >
        <button
          type="button"
          onClick={onToggleScratchpad}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
            isScratchpadOpen
              ? 'border-[#A594F9] bg-[#261E42] text-white'
              : 'border-[#2F2747] bg-[#1B162A] text-[#C4B5FD] hover:bg-[#26203A] hover:text-white'
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
          <span>{isScratchpadOpen ? 'Scratchpad Open' : 'Open Scratchpad'}</span>
        </button>

        <button
          type="button"
          onClick={onMinimizeToCompanion}
          title="Shrink app into floating Mambo companion dock"
          className="flex items-center gap-1.5 rounded-xl border border-[#4E4187] bg-[#261E42] px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-[#342959] transition cursor-pointer shadow-sm"
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
            <polyline points="4 14 10 14 10 20" />
            <polyline points="20 10 14 10 14 4" />
            <line x1="14" y1="10" x2="21" y2="3" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
          <span>Minimize to Companion Mode</span>
        </button>
      </div>
    </header>
  );
};

export default Header;